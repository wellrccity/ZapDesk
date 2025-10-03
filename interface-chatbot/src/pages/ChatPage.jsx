import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import NewChatModal from '../components/NewChatModal'; // Importa o novo modal
import TransferChatModal from '../components/TransferChatModal';

// A instância do socket é criada fora do componente para evitar múltiplas conexões
// Usa a variável de ambiente para a URL da API, com um fallback para desenvolvimento local
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');

function ChatPage() {
  // --- Estados do Componente ---
  const { user } = useAuth();
  const [chats, setChats] = useState([]); // Lista de chats da barra lateral
  const [users, setUsers] = useState([]); // Lista de usuários para transferência
  const [activeChat, setActiveChat] = useState(null); // O chat que está aberto no momento
  const [messages, setMessages] = useState([]); // A lista de mensagens do chat ativo
  const [isLoadingMessages, setIsLoadingMessages] = useState(false); // Controla o spinner de carregamento de mensagens
  const [showTransferModal, setShowTransferModal] = useState(false); // Controla a visibilidade do modal de transferência
  const [showNewChatModal, setShowNewChatModal] = useState(false); // Controla o modal de novo chat
  const [error, setError] = useState(''); // Mensagens de erro
  const [filterStatus, setFilterStatus] = useState('aguardando'); // Estado do filtro

  // --- Funções de Busca de Dados ---
  const fetchChats = useCallback(async () => {
    try {
      const chatsRes = await api.get(`/chats?status=${filterStatus}`);
      setChats(chatsRes.data);
    } catch (err) {
      console.error('Falha ao buscar chats:', err);
    }
  }, [filterStatus]); // A função só será recriada se o filtro mudar.
  // --- Efeitos (Lifecycle) ---

  // Efeito para buscar dados iniciais e configurar listeners de socket
  useEffect(() => {
    // 1. Busca os dados iniciais (chats e usuários)
    const fetchData = async () => {
      try {
        await fetchChats();
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
      // CORREÇÃO: Atualiza o estado localmente em vez de buscar tudo de novo.
      // Isso é mais rápido e evita inconsistências.
      setChats(prevChats => {
        const index = prevChats.findIndex(c => c.id === updatedChat.id);
        // Se o chat já existe na lista, atualiza-o.
        if (index > -1) {
          const newChats = [...prevChats];
          // CORREÇÃO: Se o chat foi fechado e o filtro é 'open', remove da lista.
          if (updatedChat.status === 'closed' && filterStatus === 'open') {
            newChats.splice(index, 1);
            return newChats;
          }
          // CORREÇÃO: Garante que o `inFlow` seja atualizado corretamente.
          // Se o status não for 'autoatendimento', `inFlow` deve ser falso.
          // O backend já envia o `inFlow` correto, então podemos usar o que vem no `updatedChat`.
          const newInFlow = updatedChat.inFlow || updatedChat.status === 'autoatendimento';
          newChats[index] = { ...newChats[index], ...updatedChat, inFlow: newInFlow };
          return newChats;
        }
        // Se for um chat novo (ex: reaberto), busca a lista para garantir consistência.
        fetchChats();
        return prevChats;
      });

      if (activeChat?.id === updatedChat.id) {
        // Atualiza os dados do chat ativo para refletir mudanças (ex: status, atendente)
        setActiveChat(prevActiveChat => ({ ...prevActiveChat, ...updatedChat }));
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
    const handleNewMessage = async (newMessage) => {
      // CORREÇÃO: Busca a lista de chats para que o chat com a nova mensagem
      // vá para o topo e para que chats reabertos apareçam.
      await fetchChats();

      // Se a mensagem pertence ao chat ativo, adiciona à lista de mensagens visível
      if (activeChat && newMessage.chat_id === activeChat.id) {
        setMessages(prevMessages => [...prevMessages, newMessage]);
      } else {
        // Se a mensagem é de um chat que não está ativo (incluindo fechados)
        const chatDaMensagem = chats.find(c => c.id === newMessage.chat_id);
        // Se o chat estava fechado e agora foi reaberto (e está na lista)
        // ou se simplesmente não estava ativo, vamos selecioná-lo.
        if (chatDaMensagem && chatDaMensagem.status === 'open' && activeChat?.id !== chatDaMensagem.id) {
            // Seleciona o chat para o usuário ver a nova mensagem.
            handleSelectChat(chatDaMensagem);
        }
      }
    };
    socket.on('nova_mensagem', handleNewMessage);
    return () => {
      socket.off('nova_mensagem', handleNewMessage);
    };
  }, [activeChat, fetchChats]); // Agora fetchChats é estável

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

  const handleStartNewChat = async (contactInfo) => {
    // Verifica se já existe um chat com este número
    const existingChat = chats.find(c => c.whatsapp_number === contactInfo.whatsapp_number);

    if (existingChat) {
      // Se já existe, apenas seleciona
      handleSelectChat(existingChat);
      // Se não estiver atribuído a ninguém, assume
      if (!existingChat.assigned_to) {
        await handleAssumeChat(existingChat.id);
      }
    } else {
      // Se não existe, cria um chat "fantasma" e já o atribui ao usuário atual
      const newTempChat = {
        id: `temp-${Date.now()}`, // ID temporário
        whatsapp_number: contactInfo.whatsapp_number,
        name: contactInfo.name,
        messages: [],
        status: 'open', // Começa como aberto
        assigned_to: user.id, // Atribui ao usuário atual
        assignee: { // Adiciona os dados do atendente para a UI
          id: user.id,
          name: user.name
        }
      };
      setActiveChat(newTempChat);
      setMessages([]); // Limpa as mensagens
    }
    setShowNewChatModal(false); // Fecha o modal
  };

  const handleAssumeChat = async (chatId) => {
    try {
      // ATUALIZAÇÃO OTIMISTA: Atualiza a UI localmente antes da resposta do servidor.
      setFilterStatus('emAtendimento');
      const chatToSelect = chats.find(c => c.id === chatId);
      if (chatToSelect) {
        // Cria uma versão atualizada do chat com o atendente atual
        const updatedOptimisticChat = {
          ...chatToSelect,
          assigned_to: user.id,
          assignee: { id: user.id, name: user.name },
          status: 'open' // Garante que o status também seja atualizado localmente
        };
        // Seleciona o chat já com os dados atualizados
        handleSelectChat(updatedOptimisticChat);
      }
      // Envia a requisição para o backend em segundo plano
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
      // ATUALIZAÇÃO: Muda o filtro para 'aguardando' ao reabrir um chat.
      setFilterStatus('aguardando');
      setActiveChat(response.data); // Reabre e seleciona o chat
      // A atualização da lista acontecerá via evento de socket
    } catch (err) {
      setError('Não foi possível reabrir o atendimento.');
    }
  };

  const handleSendMessage = (text) => {
    if(!activeChat) return;

    // Se for um chat temporário (ainda não salvo no DB), precisamos criar o chat real primeiro
    // A lógica do backend já faz isso quando a primeira mensagem é recebida, então só precisamos enviar.
    socket.emit('enviar_mensagem', { to: activeChat.whatsapp_number, text });

    // Adiciona a mensagem localmente para feedback instantâneo
    const tempMessage = {
      id: Date.now(), body: text, timestamp: Math.floor(Date.now() / 1000),
      from_me: true, media_type: 'chat', chat_id: activeChat.id
    };
    setMessages(prev => [...prev, tempMessage]);

    // Se era um chat temporário, após enviar a primeira mensagem,
    // o backend criará o chat real e o evento 'chat_updated' ou 'nova_mensagem'
    // irá atualizar a lista e o chat ativo. Podemos buscar os chats novamente para garantir.
    if (String(activeChat.id).startsWith('temp-')) {
        setTimeout(() => fetchChats(), 1000); // Dá um tempo para o backend processar
    }
  };

  // --- Renderização do Componente ---

  return (
    <Container fluid className="p-3 chat-page-wrapper">
      {/* O contêiner relativo agora é a própria linha do chat */}
      <Row className="chat-page-container g-0 shadow-sm" style={{ position: 'relative' }}>
        {error && <Alert variant="danger" className="m-3">{error}</Alert>}

        <Col md={4} xl={3} className="border-end">
          <ChatList
            chats={chats}
            activeChatId={activeChat?.id}
            onSelectChat={handleSelectChat}
            onAssumeChat={handleAssumeChat}
            currentUser={user}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            onNewChat={() => setShowNewChatModal(true)} // Passa a função para abrir o modal
            onReopenChat={handleReopenChat}
          />
        </Col>

        <Col md={8} xl={9}>
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

      <NewChatModal
        show={showNewChatModal}
        onHide={() => setShowNewChatModal(false)}
        onStartChat={handleStartNewChat}
      />

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