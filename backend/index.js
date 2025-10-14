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
let agentChatStates = {}; // Mapeia o atendente (agentNumber) ao cliente (customerNumber)

// --- 4. Configuração dos Middlewares do Express ---
// CORREÇÃO: Lista de origens permitidas. Adicione o IP do seu frontend na LAN se for diferente do backend.
const allowedOrigins = [
  'http://localhost:5173', // Frontend local
  `http://${process.env.LOCAL_IP || 'localhost'}:5173` // Permite acesso via IP da LAN
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: Postman) ou da lista de permitidos.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// CORREÇÃO: Aplica o middleware globalmente para que todas as rotas tenham acesso.
app.use(addUserConversationStates);

// --- 7. Definição das Rotas da API ---
app.get("/", (req, res) => res.send("Servidor do Chatbot no ar!"));
require('./routes/auth.routes')(app);
require('./routes/command.routes')(app);
require('./routes/user.routes')(app);
require('./routes/chat.routes')(app, client); // REMOÇÃO: Não precisa mais passar o middleware aqui.
require('./routes/flow.routes')(app);
const flowRoutes = require('./routes/flow.routes');
flowRoutes(app);
// Adiciona a nova rota para atualizar a posição
const flowController = require('./controllers/flow.controller');
app.put('/api/steps/:stepId/position', flowController.updateStepPosition);

// Rota para colunas da tabela (depende de ambos os controllers, pode ficar aqui ou em flow.routes)
app.get('/api/database-credentials/:id/databases/:dbName/tables/:tableName/columns', flowController.getTableColumns); // <-- ROTA CORRIGIDA

require('./routes/contact.routes')(app);
require('./routes/database_credential.routes')(app); // <-- ADICIONAR

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
        if (step.database_credential_id && step.db_table) {
            const creds = await db.database_credentials.findByPk(step.database_credential_id);
            if (!creds) {
                console.error(`Credenciais de banco de dados com ID ${step.database_credential_id} não encontradas.`);
                await client.sendMessage(userNumber, "Ocorreu um erro interno (DB Credential not found).");
                delete userConversationStates[userNumber];
                return;
            }
            const externalDb = new Sequelize(step.db_name, creds.user, creds.pass, { // CORREÇÃO: Usar o db_name da etapa (step)
                host: creds.host,
                port: creds.port,
                dialect: creds.dialect || 'mysql'
            });

            try {
                await externalDb.authenticate();
                console.log('Conexão com banco de dados externo bem-sucedida.');

                let dataToInsert = userState.formData;

                // Se houver um mapeamento de colunas, transforma os dados
                if (step.db_column_mapping) {
                    const mapping = JSON.parse(step.db_column_mapping);
                    const mappedData = {};
                    for (const dbColumn in mapping) {
                        const formKey = mapping[dbColumn];
                        if (formKey && userState.formData[formKey] !== undefined) {
                            mappedData[dbColumn] = userState.formData[formKey];
                        }
                    }
                    dataToInsert = mappedData;
                }
                await externalDb.getQueryInterface().bulkInsert(step.db_table, [dataToInsert]);

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
        console.log(`Fluxo finalizado para o usuário ${userNumber} através da etapa END_FLOW.`);
        // CORREÇÃO: Ao finalizar o fluxo com a etapa END_FLOW, o chat deve ser marcado como 'closed'.
        const chat = await db.chats.findOne({ where: { whatsapp_number: userNumber } });
        if (chat && chat.status === 'autoatendimento') {
            chat.status = 'closed';
            await chat.save();
            io.emit('chat_updated', chat.toJSON());
        }
        delete userConversationStates[userNumber]; // Remove o usuário do estado de conversa
        return; // Adiciona um return para garantir que o processamento pare aqui.
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
    } else if (step.step_type === 'MESSAGE' && !step.next_step_id) {
        // ATUALIZAÇÃO: Se for uma mensagem final, encerra o fluxo imediatamente.
        console.log(`Fluxo finalizado para o usuário ${userNumber} após a etapa final MESSAGE.`);
        const chat = await db.chats.findOne({ where: { whatsapp_number: userNumber } });
        if (chat && chat.status === 'autoatendimento') {
            chat.status = 'closed';
            await chat.save();
            // Notifica a interface que o chat foi fechado.
            const updatedChat = await db.chats.findByPk(chat.id, { include: [{ model: db.users, as: 'assignee', attributes: ['id', 'name'] }] });
            io.emit('chat_updated', updatedChat.toJSON());
        }
        delete userConversationStates[userNumber]; // Remove o usuário do estado de conversa
        return; // Garante que o processamento pare aqui.
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
            // CORREÇÃO: Se a chave do formulário não for definida na etapa,
            // usa 'userinput' como padrão. Isso garante que a resposta do usuário
            // seja sempre acessível via :userinput na query SQL.
            const formKey = currentStep.form_field_key || 'userinput';
            userState.formData[formKey] = message.body;

            // CORREÇÃO: A decisão do próximo passo é feita *dentro* da lógica do DB.
            // NOVA LÓGICA: Consulta ao banco de dados
            if (currentStep.db_query && currentStep.database_credential_id) {
                const creds = await db.database_credentials.findByPk(currentStep.database_credential_id);
                if (!creds) {
                    console.error(`Credenciais de banco de dados com ID ${currentStep.database_credential_id} não encontradas para a etapa QUESTION_TEXT.`);
                    nextStepId = currentStep.next_step_id_on_fail || null; // Segue para a etapa de falha
                } else {
                    const externalDb = new Sequelize(currentStep.db_name, creds.user, creds.pass, { // CORREÇÃO: Usar o db_name da etapa (currentStep)
                    host: creds.host, port: creds.port, dialect: creds.dialect || 'mysql', logging: false
                });


                // CORREÇÃO: A chave deve ser 'userinput' (minúscula) para corresponder ao placeholder :userinput
                // que os usuários são instruídos a usar na interface.
                // MELHORIA: Adiciona múltiplas variações do placeholder para robustez.
                // Isso previne erros se o admin digitar :userInput, :UserInput, ou mesmo o typo :userinpunt.
                const queryReplacements = { 
                    ...userState.formData, 
                    userinput: message.body, // O padrão correto
                    userInput: message.body, // Variação comum
                };

                try {
                    // CORREÇÃO: 'results' agora é o array de resultados.
                    const results = await externalDb.query(currentStep.db_query, {
                        replacements: queryReplacements, // CORREÇÃO: Usa o objeto de substituições completo.
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
                                    let value = firstResult[dbColumn];

                                    // Aplica as transformações em sequência, se existirem
                                    if (typeof value === 'string' && currentStep.db_result_transforms) {
                                        try {
                                            const transforms = JSON.parse(currentStep.db_result_transforms);
                                            if (Array.isArray(transforms)) {
                                                for (const transform of transforms) {
                                                    switch(transform) {
                                                        case 'UPPERCASE': value = value.toUpperCase(); break;
                                                        case 'LOWERCASE': value = value.toLowerCase(); break;
                                                        case 'TITLECASE': value = value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()); break;
                                                        case 'TRUNCATE_FIRST_SPACE': value = value.split(' ')[0]; break;
                                                        case 'TRUNCATE_SECOND_SPACE':
                                                            const parts = value.split(' ');
                                                            value = parts.slice(0, 2).join(' ');
                                                            break;
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.error("Erro ao aplicar transformações de resultado de DB:", e);
                                        }
                                    }

                                    userState.formData[formKey] = value;
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
                    // CORREÇÃO: Se a consulta falhar (por sintaxe, conexão, etc.),
                    // o fluxo deve seguir para a etapa de falha, se definida.
                    nextStepId = currentStep.next_step_id_on_fail || null;
                } finally {
                    await externalDb.close();
                }
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
            // Se não houver um próximo passo definido (nextStepId é nulo), o fluxo chegou ao fim.
            // CORREÇÃO: Ao finalizar o fluxo, o chat deve ser marcado como 'closed'.
            console.log(`Fluxo finalizado para ${userNumber} pois não há próxima etapa definida.`);
            // Ele só deve ir para 'open' se uma etapa específica (REQUEST_HUMAN_SUPPORT) for acionada.
            const chat = await db.chats.findOne({ where: { whatsapp_number: userNumber } });
            if (chat && chat.status === 'autoatendimento') {
                chat.status = 'closed';
                await chat.save();
                io.emit('chat_updated', chat.toJSON());
            }
            delete userConversationStates[userNumber];
        }
    } else {
        // CORREÇÃO: A lógica de verificação de gatilho e atendimento humano foi movida para uma função separada.
        // NOVA LÓGICA: Verifica se a mensagem vem de um admin/atendente registrado.
        const fromNumber = userNumber.replace('@c.us', '');
        let internalUser = await db.users.findOne({ where: { whatsapp_number: fromNumber } });

        // CORREÇÃO: Se não encontrou, tenta buscar sem o DDI 55, caso o número
        // tenha sido cadastrado incorretamente.
        if (!internalUser && fromNumber.startsWith('55')) {
            const numberWithoutDDI = fromNumber.substring(2);
            internalUser = await db.users.findOne({ where: { whatsapp_number: numberWithoutDDI } });
        }

        if (internalUser) {
            // Garante que o número no banco seja corrigido para o formato completo para futuras buscas, se necessário.
            if (internalUser.whatsapp_number !== fromNumber) await internalUser.update({ whatsapp_number: fromNumber });
            await handleInternalUserMessage(message, internalUser);
        } else {
            await handleCustomerMessage(message, userNumber);
        }
    }
});

/**
 * Processa uma nova mensagem de um usuário interno (admin/atendente).
 * @param {object} message O objeto da mensagem do whatsapp-web.js
 * @param {object} internalUser O objeto do usuário do Sequelize.
 */
async function handleInternalUserMessage(message, internalUser) {
    // --- CORREÇÃO CRÍTICA ---
    // A mensagem do usuário interno (atendente/admin) também precisa ser
    // registrada no banco de dados para que a lógica de chat existente funcione.
    // Sem isso, o sistema não consegue associar a conversa a um chat.
    try {
        const [chat] = await db.chats.findOrCreate({
            where: { whatsapp_number: message.from },
            defaults: { name: internalUser.name, status: 'closed' } // Inicia como 'closed' se não existir
        });
        await db.messages.create({
            chat_id: chat.id,
            body: message.body,
            timestamp: message.timestamp,
            from_me: false, // A mensagem vem do WhatsApp do atendente para o bot
            media_type: message.type
        });
    } catch (e) {
        console.error("Erro ao salvar mensagem do usuário interno:", e);
    }
    // --- FIM DA CORREÇÃO ---

    const userNumber = message.from;
    const messageBody = message.body.trim();
    const triggerKeyword = messageBody.toLowerCase();
    const userRole = internalUser.role === 'admin' ? ['admin', 'agent'] : ['agent']; // Admin pode acionar fluxos de agente também

    // --- LÓGICA DE MODO CONVERSA E COMANDOS ---
    const activeConversation = agentChatStates[userNumber];

    if (activeConversation) {
        // O atendente está em uma conversa ativa.
        if (messageBody.startsWith('!')) {
            // É um comando, não uma mensagem para o cliente.
            const [command, ...args] = messageBody.split(' ');
            
            if (command.toLowerCase() === '!fechar') {
                const chat = await db.chats.findOne({ where: { whatsapp_number: activeConversation.customerNumber } });
                if (chat) {
                    const attendantName = internalUser.name;
                    const goodbyeMessage = `Seu atendimento foi finalizado por ${attendantName}. Agradecemos o seu contato! 😊`;
                    await client.sendMessage(chat.whatsapp_number, goodbyeMessage);
                    
                    await db.messages.create({ chat_id: chat.id, body: goodbyeMessage, timestamp: Math.floor(Date.now() / 1000), from_me: true });
                    
                    chat.status = 'closed';
                    chat.assigned_to = null;
                    await chat.save();
                    
                    io.emit('chat_updated', chat.toJSON());
                    await client.sendMessage(userNumber, `✅ Atendimento com ${chat.name || chat.whatsapp_number} foi finalizado.`);
                    delete agentChatStates[userNumber]; // Sai do modo conversa
                }
                return; // Comando executado
            } 
            else if (command.toLowerCase() === '!sair') {
                delete agentChatStates[userNumber];
                await client.sendMessage(userNumber, "Você saiu do modo conversa. Agora você pode usar os comandos de fluxo novamente.");
                return; // Comando executado
            }
        }

        // Se não for um comando, é uma mensagem para o cliente.
        const formattedMessage = `*${internalUser.name} diz:*\n\n${messageBody}`;
        await client.sendMessage(activeConversation.customerNumber, formattedMessage);

        // Salva a mensagem no banco de dados como se fosse da interface
        const chat = await db.chats.findOne({ where: { whatsapp_number: activeConversation.customerNumber } });
        if (chat) {
            const savedMessage = await db.messages.create({
                chat_id: chat.id, body: messageBody, timestamp: message.timestamp, from_me: true, media_type: 'chat'
            });
            io.emit('nova_mensagem', savedMessage.toJSON()); // Notifica a interface
        }
        return; // Mensagem encaminhada
    }

    // --- LÓGICA DE COMANDOS FORA DO MODO CONVERSA ---
    if (messageBody.startsWith('!assumir')) {
        const chatId = messageBody.split(' ')[1];
        if (!chatId || isNaN(chatId)) {
            await client.sendMessage(userNumber, "⚠️ Comando inválido. Use: `!assumir [ID do chat]`");
            return;
        }

        const chat = await db.chats.findByPk(chatId);
        if (!chat) {
            await client.sendMessage(userNumber, `❌ Chat com ID ${chatId} não encontrado.`);
            return;
        }
        if (chat.status !== 'open') {
            await client.sendMessage(userNumber, `⚠️ O chat com ${chat.name} não está aberto para ser assumido.`);
            return;
        }

        // Atribui o chat
        chat.assigned_to = internalUser.id;
        await chat.save();

        // Entra no modo conversa
        agentChatStates[userNumber] = { customerNumber: chat.whatsapp_number };

        // Envia mensagem de boas-vindas para o cliente e para o atendente
        const welcomeMessage = `Olá! Meu nome é ${internalUser.name} e darei continuidade ao seu atendimento. 👋`;
        await client.sendMessage(chat.whatsapp_number, welcomeMessage);
        await db.messages.create({ chat_id: chat.id, body: welcomeMessage, timestamp: Math.floor(Date.now() / 1000), from_me: true });

        await client.sendMessage(userNumber, `✅ Você assumiu o atendimento de *${chat.name || chat.whatsapp_number}*.`
            + `\n\nAgora você está em *modo conversa*. Tudo que você digitar aqui será enviado para o cliente.`
            + `\n\nPara finalizar, digite \`!fechar\`.\nPara sair do modo conversa sem fechar, digite \`!sair\`.`);

        // Notifica a interface
        const updatedChat = await db.chats.findByPk(chatId, { include: [{ model: db.users, as: 'assignee', attributes: ['id', 'name'] }] });
        io.emit('chat_updated', updatedChat.toJSON());
        return; // Comando executado
    }


    // --- LÓGICA DE FLUXOS (se nenhum comando ou modo conversa foi ativado) ---
    const flow = await db.flows.findOne({
        where: {
            trigger_keyword: triggerKeyword,
            target_audience: userRole
        }
    });

    if (flow && flow.initial_step_id) {
        userConversationStates[userNumber] = {
            flowId: flow.id,
            currentStepId: flow.initial_step_id,
            formData: {
                // Podemos pré-popular dados do usuário se necessário
                userName: internalUser.name,
                userEmail: internalUser.email,
                userId: internalUser.id
            }
        };
        await processFlowStep(flow.initial_step_id, userNumber);
    } else {
        // Se nenhum fluxo for encontrado, pode enviar uma mensagem de ajuda
        // console.log(`Nenhum fluxo interno encontrado para o gatilho '${triggerKeyword}' e role '${internalUser.role}'.`);
        await client.sendMessage(userNumber, "Comando não reconhecido. Digite '!ajuda' para ver as opções disponíveis.");
    }
}

/**
 * Processa uma nova mensagem que não faz parte de um fluxo ativo.
 * Verifica se a mensagem dispara um fluxo ou se deve ser tratada como atendimento humano.
 * @param {object} message O objeto da mensagem do whatsapp-web.js
 * @param {string} userNumber O número do remetente.
 */
async function handleCustomerMessage(message, userNumber) {
    // CORREÇÃO: Verifica se já existe um chat para este número.
    const existingChat = await db.chats.findOne({ where: { whatsapp_number: userNumber } });

    // CORREÇÃO: Se o chat já existe E está atribuído a um atendente, trata como atendimento humano direto.
    // Isso impede que um fluxo seja acionado no meio de uma conversa humana ativa.
    if (existingChat && existingChat.assigned_to) {
        await processHumanChatMessage(message, existingChat);
        return; // Encerra a função aqui para não verificar gatilhos.
    }

    // Se não há chat existente, a lógica de verificação de gatilho continua...

    // --- INÍCIO DA VERIFICAÇÃO DE GATILHO ---
    const triggerKeyword = message.body.trim().toLowerCase();
    
    // 1. Tenta encontrar um fluxo de CLIENTE com a palavra-chave exata.
    let flow = await db.flows.findOne({ where: { trigger_keyword: triggerKeyword, target_audience: 'customer' } });
    
    // 2. Se não encontrar, procura por um fluxo "padrão" (catch-all) de CLIENTE.
    if (!flow) {
        flow = await db.flows.findOne({ where: { trigger_keyword: '*', target_audience: 'customer' } });
    }
    
    if (flow && flow.initial_step_id) {
        // CORREÇÃO CRÍTICA: Salva a mensagem que disparou o fluxo no banco de dados.
        // Isso garante que a primeira mensagem do usuário apareça no histórico do chat.
        const [chatForLog] = await db.chats.findOrCreate({ where: { whatsapp_number: userNumber }, defaults: { status: 'autoatendimento' } });
        const savedMessage = await db.messages.create({
            chat_id: chatForLog.id,
            body: message.body,
            timestamp: message.timestamp,
            from_me: false,
            media_type: message.type
        });
        io.emit('nova_mensagem', savedMessage.toJSON());
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
            console.log(`AVISO: Fluxo '${flow.name}' encontrado, mas não possui uma etapa inicial (initial_step_id é nulo).`);
        } else {
            console.log(`Nenhum gatilho correspondente para a mensagem: "${message.body}". Mensagem será salva no chat.`);
        }
        // CORREÇÃO: Se nenhum fluxo foi disparado (nem por palavra-chave, nem o padrão),
        // a mensagem deve ser apenas salva no chat, que deve ser criado (ou encontrado)
        // com o status 'autoatendimento'. O status só deve mudar para 'open'
        // quando um atendente for solicitado ou assumir.
        const [chat] = await db.chats.findOrCreate({
            where: { whatsapp_number: userNumber },
            defaults: { status: 'autoatendimento' }
        });

        // A função processHumanChatMessage já salva a mensagem e atualiza os dados do chat.
        await processHumanChatMessage(message, chat);
    }
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
        // O status deve voltar para 'autoatendimento' para que o bot possa agir na próxima mensagem.
        // Se o status for 'open', significa que o bot já terminou e a mensagem é para um atendente (ou para iniciar novo fluxo).
        // Não devemos alterar o status 'open' aqui.
        if (chat.status === 'closed' || chat.status === 'open') {
            chat.status = 'autoatendimento';
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