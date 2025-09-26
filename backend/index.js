// ARQUIVO: backend/index.js (VERSÃO COMPLETA E CORRIGIDA)

// --- 1. Imports ---
require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { Client, LocalAuth, Poll } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require("./models");
const bcrypt = require('bcryptjs');
const axios = require('axios');


// --- 2. Setup do Express e Servidor ---
const app = express();
const server = http.createServer(app);

// --- 3. Setup do Socket.IO ---
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
let userSockets = {};
let userConversationStates = {};

// --- 4. Configuração dos Middlewares do Express ---
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

// --- 5. Criação do Cliente WhatsApp ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

// --- 6. Middleware para Injetar Instâncias nas Rotas ---
app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
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

// --- 7. Definição das Rotas da API ---
app.get("/", (req, res) => res.send("Servidor do Chatbot no ar!"));
require('./routes/auth.routes')(app);
require('./routes/command.routes')(app);
require('./routes/user.routes')(app);
require('./routes/chat.routes')(app, client);
require('./routes/integration.routes')(app);
require('./routes/flow.routes')(app);
require('./routes/integration.routes')(app);
// require('./routes/contact.routes')(app); // Mantenha comentado se não implementado

// --- 8. Setup do Banco de Dados ---
db.sequelize.sync().then(() => {
  console.log("Banco de dados sincronizado.");
  initial();
});

// --- 9. Funções Auxiliares (initial, processFlowStep) ---
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

async function processFlowStep(stepId, userNumber) {
    const step = await db.flow_steps.findByPk(stepId, { include: [{ model: db.poll_options, as: 'poll_options' }] });
    if (!step) {
        delete userConversationStates[userNumber];
        return;
    }

    userConversationStates[userNumber].currentStepId = step.id;

    if (step.step_type === 'MESSAGE' || step.step_type === 'QUESTION_TEXT') {
        await client.sendMessage(userNumber, step.message_body);
    } 
    else if (step.step_type === 'QUESTION_POLL') {
        const pollOptions = step.poll_options.map(opt => opt.option_text);
        await client.sendMessage(userNumber, new Poll(step.message_body, pollOptions));
    }
    else if (step.step_type === 'FORM_SUBMIT') {
        const userState = userConversationStates[userNumber];
        
        await db.form_submissions.create({
            flow_id: userState.flowId,
            whatsapp_number: userNumber,
            submission_data: userState.formData
        });

        const integration = await db.integrations.findOne();
        if (integration && integration.type === 'WEBHOOK') {
            try {
                await axios.post(integration.target_url, userState.formData);
            } catch (error) {
                console.error("Erro ao enviar para webhook:", error.message);
            }
        }

        await client.sendMessage(userNumber, step.message_body);
        delete userConversationStates[userNumber];
    }
    
    if (step.step_type === 'MESSAGE' && step.next_step_id) {
        await processFlowStep(step.next_step_id, userNumber);
    }
}

// --- 10. Lógica dos Eventos do WhatsApp Client ---
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

client.on('message', async (message) => {
    if (message.fromMe) return;

    const userNumber = message.from;
    const userState = userConversationStates[userNumber];

    if (userState) {
        const currentStep = await db.flow_steps.findByPk(userState.currentStepId, { include: [{ model: db.poll_options, as: 'poll_options' }] });
        let nextStepId = null;

        if (!currentStep) {
            delete userConversationStates[userNumber];
            return;
        }

        if (currentStep.step_type === 'QUESTION_TEXT') {
            userState.formData[currentStep.form_field_key] = message.body;
            nextStepId = currentStep.next_step_id;
        } 
        else if (currentStep.step_type === 'QUESTION_POLL') {
            const selectedOption = currentStep.poll_options.find(opt => opt.option_text === message.body);
            if (selectedOption) {
                userState.formData[currentStep.form_field_key] = message.body;
                nextStepId = selectedOption.next_step_id_on_select;
            } else {
                client.sendMessage(userNumber, "Opção inválida. Por favor, escolha uma das opções da enquete.");
                return;
            }
        }
        
        if (nextStepId) {
            await processFlowStep(nextStepId, userNumber);
        } else {
            delete userConversationStates[userNumber];
        }

    } else {
        const flow = await db.flows.findOne({ where: { trigger_keyword: message.body.toLowerCase() } });
        if (flow && flow.initial_step_id) {
            userConversationStates[userNumber] = {
                flowId: flow.id,
                currentStepId: flow.initial_step_id,
                formData: {}
            };
            await processFlowStep(flow.initial_step_id, userNumber);
        } else {
            try {
                const chatInfo = await message.getChat();
                const contact = await chatInfo.getContact();
                const profilePicUrl = await contact.getProfilePicUrl();
                const chatData = {
                    whatsapp_number: chatInfo.id._serialized,
                    name: contact.name || contact.pushname || chatInfo.name, 
                    profile_pic_url: profilePicUrl
                };
                const [chat] = await db.chats.findOrCreate({
                    where: { whatsapp_number: chatData.whatsapp_number },
                    defaults: chatData
                });
                await chat.update(chatData);

                let messageData = {
                    chat_id: chat.id, body: message.body, timestamp: message.timestamp,
                    from_me: false, media_url: null, media_type: message.type
                };

                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    if (media) {
                        const mediaPath = './media/';
                        const filename = `${message.timestamp}-${media.filename || `${message.id.id}.${media.mimetype.split('/')[1]}`}`;
                        const fullPath = mediaPath + filename;
                        fs.writeFileSync(fullPath, Buffer.from(media.data, 'base64'));
                        messageData.media_url = `http://localhost:3001/media/${filename}`;
                        messageData.body = message.body || '';
                    }
                }
                const savedMessage = await db.messages.create(messageData);
                io.emit('nova_mensagem', savedMessage.toJSON());

            } catch (error) {
                console.error("Erro ao processar mensagem para atendimento humano:", error);
            }
        }
    }
});

// --- 11. Lógica do Socket.IO ---
io.on('connection', (socket) => {
    console.log('✔️ Novo cliente conectado à interface:', socket.id);
    
    socket.on('user_connected', (userId) => {
        userSockets[userId] = socket.id;
    });

    socket.on('disconnect', () => {
        for (const userId in userSockets) {
            if (userSockets[userId] === socket.id) {
                delete userSockets[userId];
                break;
            }
        }
    });

    socket.on('enviar_mensagem', async (data) => {
        const { to, text } = data;
        try {
            await client.sendMessage(to, text);
            const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: to } });
            await db.messages.create({
              chat_id: chat.id, body: text, timestamp: Math.floor(Date.now() / 1000), from_me: true, media_type: 'chat'
            });
        } catch (error) {
            console.error("Erro ao enviar mensagem pelo socket:", error);
        }
    });
});

// --- 12. Inicialização do Servidor e do Cliente ---
const PORT = process.env.PORT || 3001;
client.initialize();
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));