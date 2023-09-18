const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fetch = require('node-fetch');
const { generateAudio } = require('./tts.js');
const { Pool } = require('pg');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

app.use(session({
    store: new RedisStore({ url: process.env.REDIS_URL }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('chatMessage', async (data) => {
        const userInput = data.question;
        const currentTimestamp = new Date();
        const hiveAccess = process.env.HIVE_ACCESS_PUBLIC;
        const url = process.env.CHAT_URL + hiveAccess;
        let systemMessage = `you are a pirate`;

        const dataToSend = {
            question: userInput,
            overrideConfig: {
                systemMessage,
                openAIApiKey: process.env.OPENAI_API_KEY,
                pineconeEnv: process.env.PINECONE_ENVIRONMENT,
                pineconeApiKey: process.env.PINECONE_API_KEY,
                pineconeNamespace: process.env.PINECONE_NAMESPACE,
                pineconeIndex: process.env.PINECONE_INDEX_NAME
            }
        };

        try {
            if (data.ttsEnabled) {
                // Fetch the entire response for TTS
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.FLOWISE_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dataToSend)
                });
                const responseBody = await response.json();
                let aiResponse = responseBody;

                let responseObject = { 'text': aiResponse };
                let audioUrl = await generateAudio(aiResponse);
                responseObject['audioUrl'] = audioUrl;
                socket.emit('botResponse', responseObject);
            } else {
                // Streaming for non-TTS
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.FLOWISE_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dataToSend)
                });

                response.body.on('data', (chunk) => {
                    const token = chunk.toString(); 
                    socket.emit('token', token);
                });

                response.body.on('end', () => {
                    socket.emit('end');
                });
            }

            // Database Logging & Session Handling
            if (!socket.request.session.conversation_id) {
                const result = await pool.query('INSERT INTO chat_Conversations (start_timestamp, ip_address, user_agent) VALUES ($1, $2, $3) RETURNING conversation_id', [currentTimestamp, socket.request.ip, socket.request.headers['user-agent']]);
                socket.request.session.conversation_id = result.rows[0].conversation_id;
            }

            await pool.query('INSERT INTO chat_Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'sent', userInput]);
            await pool.query('INSERT INTO chat_Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'received', aiResponse]);
            await pool.query('UPDATE chat_Conversations SET end_timestamp = $1 WHERE conversation_id = $2', [currentTimestamp, socket.request.session.conversation_id]);

        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            socket.emit('error', { error: 'Failed to fetch from the API' });
        }
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
