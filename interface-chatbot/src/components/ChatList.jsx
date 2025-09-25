// src/components/ChatList.jsx

import React from 'react';
import { Button } from 'react-bootstrap';
import './ChatList.css'; // Vamos criar um CSS para estilos adicionais

function ChatList({ chats, onSelectChat, activeChatId, onAssumeChat, currentUser }) {

  // Formata o número para exibição (ex: 5511999998888@c.us -> 55 11 99999-8888)
  const formatNumber = (number) => {
    const cleanNumber = number.split('@')[0];
    if (cleanNumber.length === 13) {
      return `${cleanNumber.substring(0, 2)} ${cleanNumber.substring(2, 4)} ${cleanNumber.substring(4, 9)}-${cleanNumber.substring(9)}`;
    }
    return cleanNumber;
  };

  return (
    <div className="sidebar-chats">
      <div className="sidebar-header">
        <h5>Conversas Abertas</h5>
      </div>
      <div className="chat-list-items">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => onSelectChat(chat)} 
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
          >
            <div className="chat-item-info">
              <strong>{formatNumber(chat.whatsapp_number)}</strong>
              
              {chat.assignee ? (
                <p className="assigned-text">
                  Atendido por: {chat.assignee.id === currentUser.id ? 'Você' : chat.assignee.name}
                </p>
              ) : (
                <p className="unassigned-text">Aguardando atendimento</p>
              )}
              
              {!chat.assignee && (
                <Button 
                  variant="success" 
                  size="sm" 
                  className="mt-1 w-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssumeChat(chat.id);
                  }}
                >
                  Assumir
                </Button>
              )}
            </div>
          </div>
        ))}
        {chats.length === 0 && <p className="text-center p-3 text-muted">Nenhum chat aberto.</p>}
      </div>
    </div>
  );
}

export default ChatList;