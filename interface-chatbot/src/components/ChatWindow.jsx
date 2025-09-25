// src/components/ChatWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import MessageBubble from './MessageBubble';
import './ChatWindow.css';

function ChatWindow({ chat, messages, isLoading, currentUser, onSendMessage, onShowTransferModal, isAdmin, onCloseChat }) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const canTransfer = isAdmin;
  const canInteract = chat?.assignee?.id === currentUser?.id;

  return (
    <div className="chat-window d-flex flex-column h-100">
      {/* Cabeçalho */}
      <div className="chat-window-header d-flex justify-content-between align-items-center p-2 border-bottom">
        <div>
          <h5>Conversa com: {chat.whatsapp_number.split('@')[0]}</h5>
          {chat?.assignee && (
            <span className="text-muted">
              Atendido por: <strong>{chat.assignee.id === currentUser?.id ? 'Você' : chat.assignee.name}</strong>
            </span>
          )}
        </div>
        <div>
          {canTransfer && (
            <Button variant="outline-secondary" size="sm" className="me-2" onClick={onShowTransferModal}>
              Transferir
            </Button>
          )}
          {canInteract && (
            <Button variant="outline-danger" size="sm" onClick={() => onCloseChat(chat.id)}>
              Fechar Chat
            </Button>
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="messages-area flex-grow-1 overflow-auto p-3">
        {isLoading ? (
          <div className="text-center p-5"><Spinner animation="border" /></div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isFromMe={msg.from_me} />
          ))
        )}
        {messages.length === 0 && !isLoading && (
          <p className="text-muted text-center p-5">
            Nenhuma mensagem nesta conversa ainda. Envie uma mensagem para começar!
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area border-top p-2">
        <form className="message-input-form d-flex gap-2" onSubmit={handleSend}>
          <input
            type="text"
            className="form-control"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite uma mensagem..."
            disabled={!canInteract}
          />
          <Button type="submit" disabled={!canInteract}>
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ChatWindow;
