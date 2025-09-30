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
const { Sequelize } = require('sequelize');


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

// Middleware para injetar userConversationStates
const addUserConversationStates = (req, res, next) => {
  req.userConversationStates = userConversationStates;
  next();
};

// --- 7. Definição das Rotas da API ---
app.get("/", (req, res) => res.send("Servidor do Chatbot no ar!"));
require('./routes/auth.routes')(app);
require('./routes/command.routes')(app);
require('./routes/user.routes')(app);
require('./routes/chat.routes')(app, client, addUserConversationStates); // Passa o middleware
require('./routes/flow.routes')(app);
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
    // Busca a etapa e inclui as opções de enquete (poll_options)
    const step = await db.flow_steps.findByPk(stepId, {
        include: [{ model: db.poll_options, as: 'poll_options' }]
    });
    if (!step) {
        delete userConversationStates[userNumber];
        return;
    }

    // CORREÇÃO: Verifica se um atendente assumiu o chat no meio do fluxo.
    const chat = await db.chats.findOne({ where: { whatsapp_number: userNumber } });
    if (chat && chat.assigned_to) {
        console.log(`Atendimento com ${userNumber} foi assumido pelo atendente ID ${chat.assigned_to}. Interrompendo fluxo.`);
        // Se o chat foi assumido, o fluxo para este usuário é encerrado.
        // A mensagem do atendente será processada pela lógica de atendimento humano.
        delete userConversationStates[userNumber];
        return;
    }

    userConversationStates[userNumber].currentStepId = step.id;

    // Função para substituir variáveis como {nome} na mensagem
    const replaceVariables = (text, data) => {
        if (!text) return '';
        return text.replace(/{(\w+)}/g, (match, key) => {
            return data[key] || match; // Se a variável não existir, mantém o placeholder
        });
    };
    const finalMessage = replaceVariables(step.message_body, userConversationStates[userNumber].formData);

    if (step.step_type === 'MESSAGE' || step.step_type === 'QUESTION_TEXT') {
        const sentMessage = await client.sendMessage(userNumber, finalMessage);
        // Garante que o chat exista e o cria como 'autoatendimento' se for novo.
        const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: userNumber }, defaults: { status: 'autoatendimento' } });
        if (chat.status === 'closed') {
            chat.status = 'autoatendimento';
            await chat.save();
            io.emit('chat_updated', chat.toJSON());
        }
        const savedMessage = await db.messages.create({
            chat_id: chat.id, body: finalMessage, timestamp: sentMessage.timestamp,
            from_me: true, media_type: 'chat', ack: sentMessage.ack
        });
        io.emit('nova_mensagem', savedMessage.toJSON());
    } 
    else if (step.step_type === 'QUESTION_POLL') {
        console.log("Disparando etapa de ENQUETE como MENSAGEM DE TEXTO...");
        
        // 1. Inicia a mensagem com a pergunta principal
        let textMessage = `${finalMessage}\n`;
 
        // 2. Adiciona cada opção formatada à mensagem
        step.poll_options.forEach(opt => {
            textMessage += `\n▶️ ${opt.option_text}`;
        });
 
        // 3. Adiciona uma instrução final
        if (step.poll_options.length > 0) {
            textMessage += `\n\nResponda com o texto exato de uma das opções acima.`;
        };
 
        // 4. Envia a mensagem de texto completa
        const sentMessage = await client.sendMessage(userNumber, textMessage);
        // Garante que o chat exista e o cria como 'autoatendimento' se for novo.
        const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: userNumber }, defaults: { status: 'autoatendimento' } });
        if (chat.status === 'closed') {
            chat.status = 'autoatendimento';
            await chat.save();
            io.emit('chat_updated', chat.toJSON());
        }
        const savedMessage = await db.messages.create({
            chat_id: chat.id, body: textMessage, timestamp: sentMessage.timestamp,
            from_me: true, media_type: 'chat', ack: sentMessage.ack
        });
        io.emit('nova_mensagem', savedMessage.toJSON());
        console.log("Mensagem de texto da enquete enviada com sucesso para", userNumber);
    }
    else if (step.step_type === 'FORM_SUBMIT') {
        const userState = userConversationStates[userNumber];
        
        await db.form_submissions.create({
            flow_id: userState.flowId,
            whatsapp_number: userNumber,
            submission_data: userState.formData
        });

        // Lógica de Webhook (se houver uma integração global de webhook)
        const webhookIntegration = await db.integrations.findOne({ where: { type: 'WEBHOOK' } });
        if (webhookIntegration && webhookIntegration.target_url) {
            try {
                await axios.post(webhookIntegration.target_url, userState.formData);
                console.log("Dados do formulário enviados para o Webhook com sucesso.");
            } catch (error) {
                console.error("Erro ao enviar para webhook:", error.message);
            }
        }

        // Lógica de Banco de Dados (configurada na própria etapa)
        if (step.db_name && step.db_table) {
            const externalDb = new Sequelize(step.db_name, step.db_user, step.db_pass, {
                host: step.db_host,
                port: step.db_port,
                dialect: step.db_dialect || 'mysql'
            });

            try {
                await externalDb.authenticate();
                console.log('Conexão com banco de dados externo bem-sucedida.');

                await externalDb.queryInterface.bulkInsert(step.db_table, [userState.formData]);
                console.log(`Dados inseridos na tabela ${step.db_table} com sucesso.`);

                if (step.extra_sql) {
                    await externalDb.query(step.extra_sql, { replacements: userState.formData });
                    console.log("SQL extra executado com sucesso.");
                }
            } catch (error) {
                console.error("Erro na integração com banco de dados externo:", error.message);
            } finally {
                await externalDb.close();
            }
        }

        await client.sendMessage(userNumber, finalMessage);
        delete userConversationStates[userNumber];
    }
    // NOVO TIPO DE ETAPA: FINALIZAR FLUXO
    else if (step.step_type === 'END_FLOW') {
        if (step.message_body) {
            await client.sendMessage(userNumber, finalMessage); // Envia uma mensagem final, se houver
        }
        console.log(`Fluxo finalizado para o usuário ${userNumber}.`);
        delete userConversationStates[userNumber]; // Remove o usuário do estado de conversa
    }
    // NOVO TIPO DE ETAPA: SOLICITAR ATENDIMENTO HUMANO
    else if (step.step_type === 'REQUEST_HUMAN_SUPPORT') {
        if (step.message_body) {
            const sentMessage = await client.sendMessage(userNumber, finalMessage); // Envia a mensagem de transição
            // CORREÇÃO: Salva a mensagem de transição no banco de dados.
            const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: userNumber } });
            await db.messages.create({
                chat_id: chat.id,
                body: finalMessage,
                timestamp: sentMessage.timestamp,
                from_me: true,
                media_type: 'chat'
            });
        }
        console.log(`Usuário ${userNumber} solicitou atendimento humano. Saindo do fluxo.`);
        
        // Encontra ou cria o chat, mas não atribui a ninguém ainda.
        const [chat] = await db.chats.findOrCreate({
            where: { whatsapp_number: userNumber },
            defaults: { status: 'autoatendimento' }
        });
        // Garante que o chat esteja aberto e não atribuído
        chat.status = 'open';
        chat.assigned_to = null;
        await chat.save();
        io.emit('chat_updated', chat.toJSON()); // Notifica a interface sobre o novo chat/status
        delete userConversationStates[userNumber]; // Remove o usuário do estado de conversa do fluxo
    }

    // Se a etapa for do tipo MESSAGE e tiver uma próxima etapa, avança automaticamente.
    if (step.step_type === 'MESSAGE' && step.next_step_id) {
        // Adiciona um pequeno delay para que as mensagens não cheguem juntas
        setTimeout(() => processFlowStep(step.next_step_id, userNumber), 500);
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
    // CORREÇÃO DEFINITIVA: Ignora qualquer mensagem enviada pelo próprio bot no início do processamento.
    // Isso impede que o bot reaja às suas próprias mensagens ou inicie fluxos para si mesmo.
    if (message.fromMe) {
        return;
    }

    const userNumber = message.from; // Agora que filtramos as mensagens 'fromMe', 'from' será sempre o usuário.
    const userState = userConversationStates[userNumber];

    if (userState) {
        // CORREÇÃO: Salva a mensagem do usuário no banco de dados, mesmo durante um fluxo.
        // Garante que o chat exista e o cria como 'autoatendimento' se for novo.
        const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: userNumber }, defaults: { status: 'autoatendimento' } });
        if (chat.status === 'closed') {
            // Se o chat estava fechado e o usuário responde, ele volta para o bot.
            chat.status = 'autoatendimento';
            await chat.save();
            io.emit('chat_updated', chat.toJSON());
        }
        const savedMessage = await db.messages.create({
            chat_id: chat.id,
            body: message.body,
            timestamp: message.timestamp,
            from_me: false,
            media_type: message.type
        });
        io.emit('nova_mensagem', savedMessage.toJSON());

        const currentStep = await db.flow_steps.findByPk(userState.currentStepId, { include: [{ model: db.poll_options, as: 'poll_options' }] });
        let nextStepId = null;

        if (!currentStep) {
            delete userConversationStates[userNumber];
            return;
        }

        if (currentStep.step_type === 'QUESTION_TEXT') {
            userState.formData[currentStep.form_field_key] = message.body;

            // CORREÇÃO: A decisão do próximo passo é feita *dentro* da lógica do DB.
            // NOVA LÓGICA: Consulta ao banco de dados
            if (currentStep.db_query && currentStep.db_name) {
                const externalDb = new Sequelize(currentStep.db_name, currentStep.db_user, currentStep.db_pass, {
                    host: currentStep.db_host, port: currentStep.db_port, dialect: currentStep.db_dialect || 'mysql', logging: false
                });
                try {
                    // CORREÇÃO: 'results' agora é o array de resultados.
                    const results = await externalDb.query(currentStep.db_query, {
                        replacements: { userinput: message.body }, // CORREÇÃO: Chave em minúsculo para corresponder ao erro.
                        type: Sequelize.QueryTypes.SELECT
                    });

                    // CORREÇÃO: Verifica se o array de resultados não está vazio.
                    if (results && results.length > 0) {
                        nextStepId = currentStep.next_step_id; // Define o passo de SUCESSO aqui.
                        const firstResult = results[0]; // Pega o primeiro resultado.
                        console.log("Dados encontrados no DB externo:", firstResult);
                        if (currentStep.db_query_result_mapping) {
                            const mapping = JSON.parse(currentStep.db_query_result_mapping);
                            for (const formKey in mapping) {
                                const dbColumn = mapping[formKey];
                                if (firstResult[dbColumn] !== undefined) {
                                    userState.formData[formKey] = firstResult[dbColumn];
                                }
                            }
                            console.log("formData atualizado após mapeamento:", userState.formData);
                        }
                    } else {
                        console.log("Nenhum dado encontrado para a consulta. Verificando 'next_step_id_on_fail'.");
                        nextStepId = currentStep.next_step_id_on_fail || null; // Usa o passo de falha, se existir
                    }
                } catch (error) {
                    console.error("Erro ao consultar banco de dados externo na etapa QUESTION_TEXT:", error.message);
                    // Opcional: definir um passo de erro
                    // nextStepId = currentStep.next_step_id_on_error;
                } finally {
                    await externalDb.close();
                }
            } else { // Se não houver consulta ao DB, segue o caminho padrão.
                nextStepId = currentStep.next_step_id;
            }
        } 
        else if (currentStep.step_type === 'QUESTION_POLL') {
            const userResponse = message.body.trim();
            const selectedOption = currentStep.poll_options.find(opt => 
                (opt.trigger_keyword && opt.trigger_keyword.toLowerCase() === userResponse.toLowerCase()) || 
                opt.option_text === userResponse
            );
            if (selectedOption) {
                userState.formData[currentStep.form_field_key] = message.body;
                nextStepId = selectedOption.next_step_id_on_select;
            } else {
                client.sendMessage(userNumber, "Opção inválida. Por favor, escolha uma das opções da enquete.");
                return;
            }
        }
        
        if (nextStepId) {
            // Chama a próxima etapa diretamente para garantir que os dados atualizados sejam usados.
            await processFlowStep(nextStepId, userNumber);
        } else {
            // Se não houver um próximo passo, encerra a conversa
            delete userConversationStates[userNumber];
        }
    } else {
        // CORREÇÃO: A lógica de verificação de gatilho e atendimento humano foi movida para uma função separada.
        await handleIncomingMessage(message, userNumber);
    }
});

/**
 * Processa uma nova mensagem que não faz parte de um fluxo ativo.
 * Verifica se a mensagem dispara um fluxo ou se deve ser tratada como atendimento humano.
 * @param {object} message O objeto da mensagem do whatsapp-web.js
 * @param {string} userNumber O número do remetente.
 */
async function handleIncomingMessage(message, userNumber) {
    // CORREÇÃO: Verifica se já existe um chat para este número.
    const existingChat = await db.chats.findOne({ where: { whatsapp_number: userNumber } });

    // CORREÇÃO: Se o chat já existe E está atribuído a um atendente, trata como atendimento humano direto.
    // Isso impede que um fluxo seja acionado no meio de uma conversa humana ativa.
    if (existingChat && existingChat.assigned_to) {
        console.log(`Chat com ${userNumber} já está com o atendente ${existingChat.assigned_to}. Encaminhando para atendimento humano.`);
        await processHumanChatMessage(message, existingChat);
        return; // Encerra a função aqui para não verificar gatilhos.
    }

    // Se não há chat existente, a lógica de verificação de gatilho continua...

    // --- INÍCIO DA VERIFICAÇÃO DE GATILHO ---
    console.log("\n--- INÍCIO DA VERIFICAÇÃO DE GATILHO ---");
    console.log(`1. Mensagem recebida: "${message.body}"`);
    const triggerKeyword = message.body.trim().toLowerCase();
    console.log(`2. Palavra-chave tratada (trim + minúsculo): "${triggerKeyword}"`);
    
    // 1. Tenta encontrar um fluxo com a palavra-chave exata.
    let flow = await db.flows.findOne({ where: { trigger_keyword: triggerKeyword } });
    
    // 2. Se não encontrar, procura por um fluxo "padrão" (catch-all).
    if (!flow) {
        console.log("3. Nenhum fluxo com gatilho exato. Procurando por fluxo padrão...");
        flow = await db.flows.findOne({ where: { trigger_keyword: '*' } });
    }
    
    console.log("3. Resultado da busca por fluxo no DB:", flow ? flow.toJSON() : "Nenhum fluxo encontrado (nem exato, nem padrão).");
    
    if (flow && flow.initial_step_id) {
        console.log("4. CONCLUSÃO: Gatilho correspondente encontrado! O bot deveria iniciar o fluxo.");
        // CORREÇÃO: Cria ou atualiza o chat para 'autoatendimento' no momento em que o fluxo é iniciado.
        const [chat] = await db.chats.findOrCreate({ where: { whatsapp_number: userNumber }, defaults: { status: 'autoatendimento' } });
        if (chat.status !== 'autoatendimento') {
            chat.status = 'autoatendimento';
            await chat.save();
            io.emit('chat_updated', chat.toJSON());
        }

        userConversationStates[userNumber] = {
            flowId: flow.id,
            currentStepId: flow.initial_step_id,
            formData: {}
        };
        await processFlowStep(flow.initial_step_id, userNumber);
    } else {
        if (flow) {
            console.log("4. AVISO: Fluxo encontrado, mas não possui uma etapa inicial (initial_step_id é nulo).");
        } else {
            console.log("4. CONCLUSÃO: Nenhum gatilho correspondente. Mensagem será tratada como atendimento humano.");
        }
        // Cria um novo chat para atendimento humano, já que nenhum fluxo foi disparado.
        // CORREÇÃO: O chat já começa como 'open' (aguardando)
        const [newChat] = await db.chats.findOrCreate({ where: { whatsapp_number: userNumber }, defaults: { status: 'open' } });
        await processHumanChatMessage(message, newChat);
    }
    console.log("--- FIM DA VERIFICAÇÃO DE GATILHO ---\n");
}

/**
 * Processa e salva uma mensagem dentro de um chat de atendimento humano.
 * @param {object} message O objeto da mensagem do whatsapp-web.js
 * @param {object} chat O objeto do chat do Sequelize.
 */
async function processHumanChatMessage(message, chat) {
    try {
        const chatInfo = await message.getChat();
        const contact = await chatInfo.getContact();
        const profilePicUrl = await contact.getProfilePicUrl();

        // Atualiza os dados do chat (nome, foto) e reabre se estiver fechado.
        chat.name = contact.name || contact.pushname || chatInfo.name;
        chat.profile_pic_url = profilePicUrl;
        // CORREÇÃO: Se o chat estava fechado, reabre e notifica a interface.
        if (chat.status === 'closed') {
            chat.status = 'open';
            await chat.save();
            io.emit('chat_updated', chat.toJSON()); // Emite o evento para a UI atualizar o status.
        }
        await chat.save();

        // Prepara e salva a mensagem no banco.
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

        // Emite o evento para a interface.
        io.emit('nova_mensagem', savedMessage.toJSON());

    } catch (error) {
        console.error("Erro ao processar mensagem para atendimento humano:", error);
    }
}

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