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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const chatsRes = await api.get('/chats/open');
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
  }, [user.role]);

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

  const handleAssumeChat = async (chatId) => { /* ... */ };
  const handleTransferChat = async (targetUserId) => { /* ... */ };
  const handleCloseChat = async (chatId) => { /* ... */ };
  const handleSendMessage = (text) => { /* ... */ };

  return (
    // vh-100 garante 100% da viewport; se você tiver um header fixe, ajuste para calc(100vh - 56px)
    <Container fluid className="p-0 vh-50">
      <Row className="chat-page-container h-50" noGutters>
        {error && <Alert variant="danger">{error}</Alert>}
        <Col md={4} xl={3} className="h-50">
          <ChatList
            chats={chats}
            activeChatId={activeChat?.id}
            onSelectChat={handleSelectChat}
            onAssumeChat={handleAssumeChat}
            currentUser={user}
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
