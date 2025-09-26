// src/pages/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import io from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import TransferChatModal from '../components/TransferChatModal';

const socket = io('http://localhost:3001');

function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // MUDANÇA: A URL agora usa o estado do filtro
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
  }, [user.role, filterStatus]);

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
  }, [activeChat]);

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
      // Chama a API para atribuir o chat ao usuário logado (user.id)
      const response = await api.put(`/chats/${chatId}/assign`, { userId: user.id });
      
      // Atualiza a lista de chats na tela com a nova informação
      setChats(prevChats => 
        prevChats.map(chat => (chat.id === chatId ? response.data : chat))
      );
      
      // Se o chat assumido for o que está ativo, atualiza ele também
      if(activeChat?.id === chatId) {
        setActiveChat(response.data);
      }

    } catch (err) {
      setError('Não foi possível assumir o chat. Tente novamente.');
    }
  };
  
  const handleTransferChat = async (targetUserId) => {
    if (!activeChat) return;
    try {
      const response = await api.put(`/chats/${activeChat.id}/assign`, { userId: targetUserId });
      setChats(prevChats => 
        prevChats.map(chat => (chat.id === activeChat.id ? response.data : chat))
      );
      setActiveChat(response.data);
      setShowTransferModal(false);
    } catch (err) {
      setError('Não foi possível transferir o chat.');
    }
  };

  const handleCloseChat = async (chatId) => {
    if (window.confirm('Tem certeza que deseja finalizar este atendimento?')) {
      try {
        // A API agora retorna o chat atualizado
        const response = await api.put(`/chats/${chatId}/close`);
        
        // MUDANÇA: Em vez de 'filter', usamos 'map' para ATUALIZAR o chat na lista
        setChats(prevChats => 
          prevChats.map(chat => (chat.id === chatId ? response.data : chat))
        );

        // Limpa o chat ativo se for o que foi fechado
        if (activeChat?.id === chatId) {
          setActiveChat(null);
        }
      } catch (err) {
        setError('Não foi possível finalizar o atendimento.');
      }
    }
  };

  const handleSendMessage = (text) => {
    if(!activeChat) return;

    // Envia a mensagem via socket para o backend
    socket.emit('enviar_mensagem', { to: activeChat.whatsapp_number, text });
    
    // Adiciona a mensagem do atendente localmente na tela para uma resposta visual imediata
    const tempMessage = {
        id: Date.now(),
        body: text,
        timestamp: Math.floor(Date.now() / 1000),
        from_me: true,
        media_type: 'chat',
        chat_id: activeChat.id
    }
    setMessages(prev => [...prev, tempMessage]);
  };
  const handleReopenChat = async (chatId) => {
    try {
      const response = await api.put(`/chats/${chatId}/reopen`);
      
      // Atualiza o chat na lista com o novo status 'open'
      setChats(prevChats => 
        prevChats.map(chat => (chat.id === chatId ? response.data : chat))
      );
      
      // Opcional: seleciona automaticamente o chat reaberto
      setActiveChat(response.data);

    } catch (err) {
      setError('Não foi possível reabrir o atendimento.');
    }
  };

  return (
    // vh-100 garante 100% da viewport; se você tiver um header fixe, ajuste para calc(100vh - 56px)
    <Container fluid className="p-0 vh-100">
      <Row className="chat-page-container h-100" noGutters>
        {error && <Alert variant="danger">{error}</Alert>}
        <Col md={4} xl={3} className="h-100">
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
