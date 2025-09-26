// ARQUIVO: backend/index.js (Versão com a Ordem Corrigida)

// --- 1. Imports (require) ---
require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require("./models");
const bcrypt = require('bcryptjs');

// --- 2. Criação da Aplicação Express ---
// Esta linha PRECISA vir antes de qualquer 'app.use' ou 'app.get'
const app = express();

// --- 3. Configuração dos Middlewares do Express ---
const corsOptions = {
  origin: 'http://localhost:5173', // Endereço do seu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/media', express.static(path.join(__dirname, 'media')));

// --- 4. Setup do Servidor HTTP e Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
let userSockets = {};

// --- 5. Setup do Banco de Dados ---
db.sequelize.sync().then(() => {
  console.log("Banco de dados sincronizado.");
  initial(); // Cria usuário admin se necessário
});
async function initial() { /* ... (função initial sem alterações) ... */ }

// --- 6. Criação do Cliente WhatsApp ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

// --- 7. Middleware para Injetar Instâncias nas Rotas ---
// Este middleware PRECISA vir antes da definição das rotas
app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
  // Precisamos adicionar o nome do usuário aqui também para a notificação de transferência
  if (req.userId) {
    db.users.findByPk(req.userId).then(user => {
      req.userName = user ? user.name : 'um colega';
      next();
    }).catch(() => {
      req.userName = 'um colega';
      next();
    });
  } else {
    next();
  }
});

// --- 8. Definição das Rotas da API ---
app.get("/", (req, res) => res.send("Servidor do Chatbot no ar!"));
require('./routes/auth.routes')(app);
require('./routes/command.routes')(app);
require('./routes/user.routes')(app);
require('./routes/chat.routes')(app, client);
//require('./routes/contact.routes')(app);

// --- 9. Lógica dos Eventos (WhatsApp e Socket.IO) ---
client.on('qr', async (qr) => { /* ... */ });
client.on('ready', () => { /* ... */ });
client.on('message', async (message) => { /* ... */ });
client.on('disconnected', (reason) => { /* ... */ });

io.on('connection', (socket) => { /* ... */ });


// --- 10. Inicialização do Servidor e do Cliente ---
const PORT = process.env.PORT || 3001;
client.initialize();
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));