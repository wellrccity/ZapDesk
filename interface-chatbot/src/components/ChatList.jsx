// src/components/ChatList.jsx

import React from 'react';
import { Button, Badge, ButtonGroup, ToggleButton } from 'react-bootstrap';
import './ChatList.css';

const defaultAvatar = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

// Receba a prop 'onReopenChat' que estávamos usando antes
function ChatList({ chats, onSelectChat, activeChatId, onAssumeChat, currentUser, filterStatus, onFilterChange, onReopenChat }) {

  const formatNumber = (number) => number.split('@')[0];

  const getLastMessageSnippet = (chat) => {
    if (!chat.messages || chat.messages.length === 0) {
      return "Nenhuma mensagem ainda";
    }
    const lastMessage = chat.messages[0];
    if (lastMessage.media_type !== 'chat' && lastMessage.body) {
      return `[Mídia] ${lastMessage.body.slice(0, 25)}...`;
    }
    if (lastMessage.media_type !== 'chat') {
      const mediaTypeName = lastMessage.media_type.charAt(0).toUpperCase() + lastMessage.media_type.slice(1);
      return `[${mediaTypeName}]`;
    }
    if (lastMessage.body) {
      return lastMessage.body.slice(0, 35) + (lastMessage.body.length > 35 ? '...' : '');
    }
    return "Mensagem vazia";
  };
  
  const filters = [
    { name: 'Abertos', value: 'open' },
    { name: 'Todos', value: 'all' },
  ];

  return (
    <div className="sidebar-chats">
      <div className="sidebar-header">
        <h5>Conversas</h5>
        <ButtonGroup className="mt-2">
          {filters.map((filter, idx) => (
            <ToggleButton
              key={idx}
              id={`filter-${idx}`}
              type="radio"
              variant="outline-secondary"
              name="filter"
              value={filter.value}
              checked={filterStatus === filter.value}
              onChange={(e) => onFilterChange(e.currentTarget.value)}
            >
              {filter.name}
            </ToggleButton>
          ))}
        </ButtonGroup>
      </div>
      <div className="chat-list-items">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => onSelectChat(chat)} 
            className={`chat-item ${activeChatId === chat.id ? 'active' : ''} ${chat.status === 'closed' ? 'chat-item-closed' : ''}`}
          >
            <img 
              src={chat.profile_pic_url || defaultAvatar} 
              alt="Avatar" 
              className="chat-avatar" 
            />
            <div className="chat-item-info">
              <strong>{chat.name || formatNumber(chat.whatsapp_number)}</strong>
              <p className="last-message-snippet">
                {getLastMessageSnippet(chat)}
              </p>

              {/* === BLOCO DE CÓDIGO RESTAURADO ABAIXO === */}
              <div className="status-container">
                {chat.status === 'closed' ? (
                  <Button 
                    variant="info" 
                    size="sm" 
                    className="mt-1 w-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReopenChat(chat.id);
                    }}
                  >
                    Reabrir Atendimento
                  </Button>
                ) : chat.assignee ? (
                  <span className="assigned-text">
                    Atendido por: {chat.assignee.id === currentUser.id ? 'Você' : chat.assignee.name}
                  </span>
                ) : chat.status === 'autoatendimento' ? (
                  <span className="unassigned-text text-primary">
                    Em autoatendimento
                  </span>
                ) : (
                  // CORREÇÃO: O botão "Assumir" agora está dentro do bloco correto.
                  <>
                    <span className="unassigned-text">Aguardando atendimento</span>
                    <Button 
                      variant="success" 
                      size="sm" 
                      className="mt-1 w-100"
                      onClick={(e) => { e.stopPropagation(); onAssumeChat(chat.id); }}
                    >
                      Assumir
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {chats.length === 0 && <p className="text-center p-3 text-muted">Nenhum chat encontrado.</p>}
      </div>
    </div>
  );
}

export default ChatList;