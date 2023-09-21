// backend/routes/chat.js

const fetch = require('node-fetch');
const { generateAudio } = require('../models/tts.js');
const { Pool } = require('pg');
const router = require('express').Router();

// Initialize PostgreSQL pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Handle WebSocket Connection
router.handleSocketConnection = (socket, uid) => {
    console.log(`[Chat Route] User ${uid} connected: ${socket.id}`);

    // On receiving chat message from client
    socket.on('chatMessage', async (data) => {
        try {
            handleChatMessage(socket, data);
        } catch (error) {
            console.error('Error:', error);
            socket.emit('error', { error: 'An error occurred' });
        }
    });
};

// Function to handle chat message
const handleChatMessage = async (socket, data) => {
    console.log("[Chat Route] Received chat message:", data);
    const userInput = data.question;
    const currentTimestamp = new Date();
    const systemMessage = "you are a pirate";

    // Prepare data to send to external API
    const dataToSend = prepareDataToSend(userInput, systemMessage);

    // Fetch response from external API
    const responseBody = await fetchResponseFromAPI(dataToSend);

    // Generate audio if TTS is enabled
    let aiResponse = responseBody;
    if (data.ttsEnabled) {
        const audioUrl = await generateAudio(aiResponse);
        socket.emit('botResponse', { 'text': aiResponse, 'audioUrl': audioUrl });
    } else {
        socket.emit('botResponse', { 'text': aiResponse });
    }

    // Update database and session
    updateDatabaseAndSession(socket, currentTimestamp, userInput, aiResponse);
};

// Function to prepare data for external API
const prepareDataToSend = (userInput, systemMessage) => {
    return {
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
};

// Function to fetch response from external API
const fetchResponseFromAPI = async (dataToSend) => {
    const url = ''; // Define the API URL
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.FLOWISE_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dataToSend)
    });
    return await response.json();
};

// Function to update database and session
const updateDatabaseAndSession = async (socket, currentTimestamp, userInput, aiResponse) => {
    if (!socket.request.session.conversation_id) {
        const result = await pool.query('INSERT INTO chat_Conversations (start_timestamp, ip_address, user_agent) VALUES ($1, $2, $3) RETURNING conversation_id', [currentTimestamp, socket.request.ip, socket.request.headers['user-agent']]);
        socket.request.session.conversation_id = result.rows[0].conversation_id;
    }

    await pool.query('INSERT INTO chat_Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'sent', userInput]);
    await pool.query('INSERT INTO chat_Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'received', aiResponse]);
    await pool.query('UPDATE chat_Conversations SET end_timestamp = $1 WHERE conversation_id = $2', [currentTimestamp, socket.request.session.conversation_id]);
};

module.exports = router;

