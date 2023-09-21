// backend/routes/chat.js

const fetch = require('node-fetch');
const { generateAudio } = require('../models/tts.js');
const { Pool } = require('pg');
const router = require('express').Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Construct the complete Chat URL from environment variables
const CHAT_URL_BASE = process.env.CHAT_URL;
const HIVE_ACCESS_PUBLIC = process.env.HIVE_ACCESS_PUBLIC;
const completeChatUrl = `${CHAT_URL_BASE}${HIVE_ACCESS_PUBLIC}`;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

router.handleSocketConnection = (socket, uid) => {
    console.log(`[Chat Route] User ${uid} connected: ${socket.id}`);

    socket.on('chatMessage', async (data) => {
        try {
            console.log("[Chat Route] Received chat message:", data);

            const userInput = data.question;
            const currentTimestamp = new Date();
            const systemMessage = "you are a pirate";

            const dataToSend = {
                question: userInput,
                overrideConfig: {
                    systemMessage,
                    openAIApiKey: process.env.OPENAI_API_KEY,
                    pineconeEnv: process.env.PINECONE_ENVIRONMENT,
                    pineconeApiKey: process.env.PINECONE_API_KEY,
                    pineconeNamespace: process.env.PINECONE_NAMESPACE,
                    pineconeIndex: process.env.PINECONE_INDEX_NAME
                },
            };

            const response = await fetch(completeChatUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${FLOWISE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSend),
            });

            const responseBody = await response.json();
            let aiResponse = responseBody;

            if (data.ttsEnabled) {
                const audioUrl = await generateAudio(aiResponse);
                socket.emit('botResponse', { text: aiResponse, audioUrl });
            } else {
                socket.emit('botResponse', { text: aiResponse });
            }

            // Database operations
            if (!socket.request.session.conversation_id) {
                const result = await pool.query('INSERT INTO chat_Conversations (start_timestamp, ip_address, user_agent) VALUES ($1, $2, $3) RETURNING conversation_id', [currentTimestamp, socket.request.ip, socket.request.headers['user-agent']]);
                socket.request.session.conversation_id = result.rows[0].conversation_id;
            }

            await pool.query('INSERT INTO chat_Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'sent', userInput]);
            await pool.query('INSERT INTO chat_Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'received', aiResponse]);
            await pool.query('UPDATE chat_Conversations SET end_timestamp = $1 WHERE conversation_id = $2', [currentTimestamp, socket.request.session.conversation_id]);
            
        } catch (error) {
            console.error('Error:', error);
            socket.emit('error', { error: 'An error occurred' });
        }
    });
};

module.exports = router;
