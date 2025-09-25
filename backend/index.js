// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path'); 
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require("./models");
const bcrypt = require('bcryptjs');

// --- SETUP INICIAL ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/media', express.static(path.join(__dirname, 'media')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3001;

// --- BANCO DE DADOS ---
db.sequelize.sync().then(() => {
  console.log("Banco de dados sincronizado.");
  initial(); // Cria um usuário admin inicial, se não existir
});

async function initial() {
  const User = db.users;
  const count = await User.count({ where: { role: 'admin' }});
  if (count === 0) {
    User.create({
      name: "Admin",
      email: "admin@example.com",
      password: bcrypt.hashSync("admin123", 8),
      role: "admin"
    });
    console.log("Usuário Admin inicial criado com email 'admin@example.com' e senha 'admin123'");
  }
}

// --- ROTAS DA API ---
app.get("/", (req, res) => res.send("Servidor do Chatbot no ar!"));
require('./routes/auth.routes')(app);
require('./routes/command.routes')(app);
require('./routes/user.routes')(app); 
require('./routes/chat.routes')(app); 

// --- WHATSAPP CLIENT ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('qr', async (qr) => {
    console.log('QR Code recebido, escaneie com seu celular!');
    const qrDataUrl = await qrcode.toDataURL(qr);
    io.emit('qr', qrDataUrl);
    io.emit('status', 'Aguardando leitura do QR Code...');
});

client.on('ready', () => {
    console.log('Cliente do WhatsApp conectado e pronto!');
    io.emit('status', 'Bot Conectado!');
    io.emit('qr', null);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado!', reason);
    io.emit('status', 'Bot Desconectado!');
});

// Evento principal de recebimento de mensagens
client.on('message', async (message) => {
    if (message.fromMe) return;

    try {
        const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: message.from } });

        let messageData = {
            chat_id: chat.id,
            body: message.body,
            timestamp: message.timestamp,
            from_me: false,
            media_url: null,
            media_type: message.type // O tipo já vem da mensagem (chat, image, audio, etc)
        };

        // Se a mensagem tiver mídia, baixe-a
        if (message.hasMedia) {
            console.log("Mensagem com mídia recebida, baixando...");
            const media = await message.downloadMedia();
            
            if (media) {
                const mediaPath = './media/';
                // Cria um nome de arquivo único para evitar colisões
                const filename = `${message.timestamp}-${media.filename || `${message.id.id}.${media.mimetype.split('/')[1]}`}`;
                const fullPath = mediaPath + filename;

                // Salva o arquivo no sistema
                fs.writeFileSync(fullPath, Buffer.from(media.data, 'base64'));
                console.log(`Mídia salva em: ${fullPath}`);

                // Define a URL pública para o arquivo
                messageData.media_url = `http://localhost:3001/media/${filename}`;
                messageData.body = message.body || ''; // A legenda da mídia fica no 'body'
            }
        }

        // Salva a mensagem (texto ou mídia) no banco de dados
        const savedMessage = await db.messages.create(messageData);

        // Emite a mensagem completa para o frontend
        io.emit('nova_mensagem', savedMessage.toJSON());

    } catch (error) {
        console.error("Erro ao processar mensagem:", error);
    }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('✔️ Novo cliente conectado à interface:', socket.id);
    
    socket.on('enviar_mensagem', async (data) => {
        const { to, text } = data;
        try {
            await client.sendMessage(to, text);
            // Salvar mensagem do atendente no DB
            const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: to } });
            await db.messages.create({
              chat_id: chat.id, body: text, timestamp: Math.floor(Date.now() / 1000), from_me: true
            });
        } catch (error) {
            console.error("Erro ao enviar mensagem pelo socket:", error);
        }
    });

    socket.on('enviar_comando_bot', async (data) => {
      const { to, command } = data;
      const cmd = await db.commands.findOne({ where: { keyword: command.toLowerCase() } });
      if (cmd) {
        await client.sendMessage(to, cmd.response);
         const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: to } });
         await db.messages.create({
            chat_id: chat.id, body: cmd.response, timestamp: Math.floor(Date.now() / 1000), from_me: true
         });
      }
    });
});

// --- INICIAR SERVIDOR ---
client.initialize();
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));