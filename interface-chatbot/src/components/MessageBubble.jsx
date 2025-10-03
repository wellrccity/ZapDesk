// src/components/MessageBubble.jsx

import React from 'react';
import { Card, Image } from 'react-bootstrap';
import './MessageBubble.css'; // Criaremos este CSS

// Ícones para os documentos (opcional, mas melhora a UI)
import { FileEarmarkTextFill, FileEarmarkZipFill, FileEarmarkMusicFill, FileEarmarkPlayFill } from 'react-bootstrap-icons';

function MessageBubble({ message, isFromMe }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMedia = () => {
    switch (message.media_type) {
      case 'image':
        return <Image src={message.media_url} fluid rounded className="message-image" />;

      case 'audio':
        return <audio controls src={message.media_url} className="message-audio" />;

      case 'video':
        return <video controls src={message.media_url} className="message-video" />;
      
      case 'sticker':
          return <Image src={message.media_url} style={{ maxWidth: '150px', height: '150px' }} />;
      
      // Para documentos, criamos um link clicável
      case 'document':
        const filename = message.media_url.split('-').pop();
        return (
          <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="document-link">
            <FileEarmarkTextFill size={30} className="me-2" />
            <span>{filename}</span>
          </a>
        );

      default:
        // Se for um tipo de documento não mapeado, mostramos um link genérico
        if(message.media_url){
            const genericFilename = message.media_url.split('-').pop();
            return (
                <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="document-link">
                  <FileEarmarkZipFill size={30} className="me-2" />
                  <span>{genericFilename}</span>
                </a>
              );
        }
        return null;
    }
  };

  return (
    <div className={`d-flex ${isFromMe ? 'justify-content-end' : 'justify-content-start'}`}>
      <div className={`message-bubble ${isFromMe ? 'from-me' : 'from-them'}`}>
        {message.media_url && renderMedia()}
        {message.body && <div className="message-text">{message.body}</div>}
        <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
      </div>
    </div>
  );
}

export default MessageBubble;