import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import io from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import TransferChatModal from '../components/TransferChatModal';

// A instância do socket é criada fora do componente para evitar múltiplas conexões
const socket = io('http://localhost:3001');

function ChatPage() {
  // --- Estados do Componente ---
  const { user } = useAuth();
  const [chats, setChats] = useState([]); // Lista de chats da barra lateral
  const [users, setUsers] = useState([]); // Lista de usuários para transferência
  const [activeChat, setActiveChat] = useState(null); // O chat que está aberto no momento
  const [messages, setMessages] = useState([]); // A lista de mensagens do chat ativo
  const [isLoadingMessages, setIsLoadingMessages] = useState(false); // Controla o spinner de carregamento de mensagens
  const [showTransferModal, setShowTransferModal] = useState(false); // Controla a visibilidade do modal de transferência
  const [error, setError] = useState(''); // Mensagens de erro
  const [filterStatus, setFilterStatus] = useState('open'); // Estado do filtro ('open' ou 'all')

  // --- Efeitos (Lifecycle) ---

  // Efeito para buscar dados iniciais e configurar listeners de socket
  useEffect(() => {
    // 1. Busca os dados iniciais (chats e usuários)
    const fetchData = async () => {
      try {
        const chatsRes = await api.get(`/chats?status=${filterStatus}`);
        setChats(chatsRes.data);
        if (user.role === 'admin') {
          const usersRes = await api.get('/users');
          setUsers(usersRes.data);
        }
      } catch (err) {
        setError('Falha ao carregar dados. Tente atualizar a página.');
      }
    };
    fetchData();
    
    // 2. Registra o usuário no socket para receber notificações direcionadas
    socket.emit('user_connected', user.id);

    // 3. Listener para ATUALIZAÇÕES DE CHAT (eventos de outros usuários)
    const handleChatUpdated = (updatedChat) => {
      setChats(prevChats =>
        prevChats.map(c => (c.id === updatedChat.id ? updatedChat : c))
      );
      if (activeChat?.id === updatedChat.id) {
        setActiveChat(updatedChat);
      }
    };

    // 4. Listener para NOTIFICAÇÕES DE TRANSFERÊNCIA
    const handleTransferNotification = (data) => {
      const { chat } = data;
      toast.info(`O chat com ${chat.name || chat.whatsapp_number} foi transferido para você!`, {
        onClick: () => handleSelectChat(chat) // Permite clicar na notificação para abrir o chat
      });
    };

    socket.on('chat_updated', handleChatUpdated);
    socket.on('transfer_notification', handleTransferNotification);

    // 5. Limpeza: remove os listeners ao sair da página
    return () => {
      socket.off('chat_updated', handleChatUpdated);
      socket.off('transfer_notification', handleTransferNotification);
    };
  }, [user.id, user.role, filterStatus]); // Roda novamente se o filtro mudar

  // Efeito para ouvir NOVAS MENSAGENS do chat que está ativo
  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      if (newMessage.chat_id === activeChat?.id) {
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    };
    socket.on('nova_mensagem', handleNewMessage);
    return () => {
      socket.off('nova_mensagem', handleNewMessage);
    };
  }, [activeChat]); // Reativa o listener se o chat ativo mudar

  // --- Funções de Ação (Handlers) ---

  const handleSelectChat = async (chat) => {
    setActiveChat(chat);
    setIsLoadingMessages(true);
    setError('');
    try {
      const res = await api.get(`/chats/${chat.id}/messages`);
      setMessages(res.data);
    } catch (err) {
      setError('Falha ao carregar o histórico de mensagens.');
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleAssumeChat = async (chatId) => {
    try {
      await api.put(`/chats/${chatId}/assign`, { userId: user.id });
      // A atualização da UI acontecerá via evento de socket 'chat_updated'
    } catch (err) {
      setError('Não foi possível assumir o chat. Tente novamente.');
    }
  };
  
  const handleTransferChat = async (targetUserId) => {
    if (!activeChat) return;
    try {
      await api.put(`/chats/${activeChat.id}/assign`, { userId: targetUserId });
      setShowTransferModal(false);
      // A atualização da UI acontecerá via evento de socket
    } catch (err) {
      setError('Não foi possível transferir o chat.');
    }
  };

  const handleCloseChat = async (chatId) => {
    if (window.confirm('Tem certeza que deseja finalizar este atendimento?')) {
      try {
        await api.put(`/chats/${chatId}/close`);
        setActiveChat(null); // Fecha a janela do chat localmente
        // A atualização da lista acontecerá via evento de socket
      } catch (err) {
        setError('Não foi possível finalizar o atendimento.');
      }
    }
  };

  const handleReopenChat = async (chatId) => {
    try {
      const response = await api.put(`/chats/${chatId}/reopen`);
      setActiveChat(response.data); // Reabre e seleciona o chat
      // A atualização da lista acontecerá via evento de socket
    } catch (err) {
      setError('Não foi possível reabrir o atendimento.');
    }
  };

  const handleSendMessage = (text) => {
    if(!activeChat) return;
    socket.emit('enviar_mensagem', { to: activeChat.whatsapp_number, text });
    const tempMessage = {
      id: Date.now(), body: text, timestamp: Math.floor(Date.now() / 1000),
      from_me: true, media_type: 'chat', chat_id: activeChat.id
    };
    setMessages(prev => [...prev, tempMessage]);
  };

  // --- Renderização do Componente ---

  return (
    <Container fluid className="p-0 vh-100">
      <Row className="chat-page-container h-100 g-0">
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Col md={4} xl={3} className="border-end h-100">
          <ChatList
            chats={chats}
            activeChatId={activeChat?.id}
            onSelectChat={handleSelectChat}
            onAssumeChat={handleAssumeChat}
            currentUser={user}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            onReopenChat={handleReopenChat}
          />
        </Col>

        <Col md={8} xl={9} className="h-100">
          {activeChat ? (
            <ChatWindow
              key={activeChat.id}
              chat={activeChat}
              messages={messages}
              isLoading={isLoadingMessages}
              currentUser={user}
              onSendMessage={handleSendMessage}
              onShowTransferModal={() => setShowTransferModal(true)}
              isAdmin={user.role === 'admin'}
              onCloseChat={handleCloseChat}
            />
          ) : (
            <div className="d-flex justify-content-center align-items-center h-100">
              <h4 className="text-muted">Selecione um chat para começar</h4>
            </div>
          )}
        </Col>
      </Row>

      <TransferChatModal
        show={showTransferModal}
        onHide={() => setShowTransferModal(false)}
        users={users}
        onTransfer={handleTransferChat}
      />
    </Container>
  );
}

export default ChatPage;