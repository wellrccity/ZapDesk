// src/pages/QRCodePage.jsx

import React, { useState, useEffect } from 'react';
import { Container, Card, Spinner, Alert } from 'react-bootstrap';
import io from 'socket.io-client';

// Conecta ao servidor de Socket.IO
const socket = io('http://localhost:3001');

function QRCodePage() {
  const [status, setStatus] = useState('Conectando ao servidor...');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    // Função para lidar com o status recebido
    const handleStatus = (newStatus) => {
      console.log("Novo status recebido:", newStatus);
      setStatus(newStatus);
    };

    // Função para lidar com o QR code recebido
    const handleQrCode = (url) => {
      console.log("QR Code recebido.");
      setQrCodeUrl(url);
    };

    // Ouve os eventos do socket
    socket.on('status', handleStatus);
    socket.on('qr', handleQrCode);

    // Função de limpeza: remove os listeners quando o componente é desmontado
    return () => {
      socket.off('status', handleStatus);
      socket.off('qr', handleQrCode);
    };
  }, []); // O array vazio garante que o efeito rode apenas uma vez (montagem/desmontagem)

  const renderContent = () => {
    if (status === 'Bot Conectado!') {
      return (
        <Alert variant="success" className="text-center">
          <Alert.Heading>Conexão Ativa!</Alert.Heading>
          <p>O chatbot está conectado ao WhatsApp com sucesso.</p>
        </Alert>
      );
    }

    if (status.includes('QR Code') && qrCodeUrl) {
      return (
        <div className="text-center">
          <h5>Escaneie para Conectar</h5>
          <p>Abra o WhatsApp no seu celular e escaneie o código abaixo.</p>
          <img src={qrCodeUrl} alt="QR Code do WhatsApp" style={{ maxWidth: '300px' }} />
        </div>
      );
    }
    
    if (status === 'Bot Desconectado!') {
         return (
             <Alert variant="danger" className="text-center">
                 <Alert.Heading>Bot Desconectado</Alert.Heading>
                 <p>Reinicie o servidor do backend para gerar um novo QR Code e tentar novamente.</p>
             </Alert>
         );
    }

    // Estado de carregamento ou intermediário
    return (
      <div className="text-center">
        <Spinner animation="border" role="status" className="mb-3" />
        <p className="text-muted">{status}</p>
      </div>
    );
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 70px)' }}>
      <Card style={{ width: '450px' }}>
        <Card.Header as="h4" className="text-center">Status da Conexão com WhatsApp</Card.Header>
        <Card.Body className="p-4">
          {renderContent()}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default QRCodePage;