// backend/routes/chat.js

const fetch = require('node-fetch');
const { generateAudio } = require('../models/tts.js');
const { Pool } = require('pg');
const router = require('express').Router();
const IPGeolocationAPI = require('ip-geolocation-api-javascript-sdk');
const { getGeolocation } = require('../geolocation');
const socketIOClient = require('socket.io-client');

const socketIoBaseUrl = process.env.CHAT_URL.split('/api/v1/prediction/')[0];
console.log("Attempting to connect to Socket.IO server with base URL:", socketIoBaseUrl);


let flowiseSocketId = null; 

// Existing Flowise socket connection
const flowiseSocket = socketIOClient(socketIoBaseUrl);

// Capture the Flowise socket ID on connect
flowiseSocket.on('connect', () => {
  flowiseSocketId = flowiseSocket.id;
  console.log('Successfully connected to Flowise Socket.IO server with ID:', flowiseSocketId);
});

const ipgeolocationApi = new IPGeolocationAPI(process.env.GEOLOCATOR_API_KEY, false);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

flowiseSocket.onAny((event, ...args) => {
  console.log(`Received event ${event} with data:`, args);
});


const updateDatabaseAndSession = async (socket, currentTimestamp, userInput, aiResponse) => {
  if (!socket.request || !socket.request.session) {
    console.error('Session or request object is undefined.');
    return;
  }

  const sessionId = socket.request.session.sessionID;

  if (!socket.request.session.conversation_id) {
    const existingConv = await pool.query(
      'SELECT conversation_id FROM website_chat_conversations WHERE session_id = $1 LIMIT 1',
      [sessionId]
    ).catch(err => {
      console.error('Database Error:', err);
    });

    if (existingConv.rows.length > 0) {
      socket.request.session.conversation_id = existingConv.rows[0].conversation_id;
    } else {
      const result = await pool.query(
        'INSERT INTO website_chat_conversations (start_timestamp, session_id) VALUES ($1, $2) RETURNING conversation_id',
        [currentTimestamp, sessionId]
      ).catch(err => {
        console.error('Database Error:', err);
      });

      socket.request.session.conversation_id = result.rows[0].conversation_id;
    }
  }

  await pool.query('INSERT INTO website_chat_messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'sent', userInput]);
  await pool.query('INSERT INTO website_chat_messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [socket.request.session.conversation_id, currentTimestamp, 'received', aiResponse]);
  await pool.query('UPDATE website_chat_conversations SET end_timestamp = $1 WHERE conversation_id = $2', [currentTimestamp, socket.request.session.conversation_id]);
};

// Debugging line to confirm Flowise socket connection
flowiseSocket.on('connect', () => {
  console.log('Successfully connected to Flowise Socket.IO server');
});

// Debugging line to confirm Flowise socket disconnection
flowiseSocket.on('disconnect', (reason) => {
  console.log(`Disconnected from Flowise Socket.IO server. Reason: ${reason}`);
});

router.handleSocketConnection = (socket, uid) => {
  console.log(`[Chat Route] User ${uid} connected: ${socket.id}`);

  socket.on('setSessionId', (sessionId) => {
    socket.request.session.sessionID = sessionId;
  });

  // listen for token streaming
  flowiseSocket.on('token', (token) => {
      console.log('Connected to Flowise');
      console.log("Received token from Flowise:", token);  
    if (socket.chatMode === 'C') {
      socket.emit('token', token);
    }
  });

   

socket.on('chatMessage', async (data) => {
  try {
    const userInput = data.question;
    const chatMode = data.mode;
    socket.chatMode = chatMode;  // Save the chat mode to the socket

    // Emitting the 'start' event here
    socket.emit('start');
      
    let maxTokens = 400;  // Default max tokens
    let systemMessage = 'You are representing the LE4F.AGENCY and your name is HALVI. Your job is to answer questions of our prospects with the ultimate goal to win them as our clients. When you feel they are ready (without being to pushy) give them the link www.explorationatle4f.agency to book an exploration call with an human.';  // Default system message
    
    // If in Conversation Mode (Mode B), adjust settings
    if (chatMode === 'B') {
      maxTokens = 80;  // Shorter responses
      systemMessage = 'Use maximum one short sentence as response';  // Custom system message
    }
    
    const currentTimestamp = new Date();
    const role = 'public';
    let hiveAccess;
    switch (role) {
      case 'public':
        hiveAccess = process.env.HIVE_ACCESS_PUBLIC;
        break;
      default:
        socket.emit('error', { error: 'Invalid role' });
        return;
    }
    
    const url = process.env.CHAT_URL + hiveAccess;
    
    const dataToSend = {
      question: userInput,
      chatId: socket.request.session.conversation_id,
      socketIOClientId: flowiseSocketId,
      overrideConfig: {
        maxTokens,
        systemMessage,
        openAIApiKey: process.env.OPENAI_API_KEY,
        pineconeEnv: process.env.PINECONE_ENVIRONMENT,
        pineconeApiKey: process.env.PINECONE_API_KEY,
        pineconeNamespace: process.env.PINECONE_NAMESPACE,
        pineconeIndex: process.env.PINECONE_INDEX_NAME
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.FLOWISE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dataToSend)
    });

  const responseBody = await response.json();
  const aiResponse = responseBody;

  // Extract the text part from aiResponse
  // Assuming aiResponse contains a property 'text' that holds the response
  const responseText = aiResponse.text || '';  // Use a fallback empty string

  // Generate audio only if mode is not 'C'
  let audioUrl = null;
  if (chatMode !== 'C') {
    audioUrl = await generateAudio(responseText); // Pass responseText instead of aiResponse
  }

socket.emit('botResponse', { 'text': aiResponse, 'audioUrl': audioUrl });


    // Emitting the 'end' event after sending the AI response
    socket.emit('end');

    await updateDatabaseAndSession(socket, currentTimestamp, userInput, aiResponse);

  } catch (error) {
    console.error('Error:', error);
    socket.emit('error', { error: 'An error occurred' });
  }
});
}



flowiseSocket.on('error', (error) => {
  console.error('Flowise Socket Error:', error);
});

flowiseSocket.on('connect_error', (error) => {
  console.error('Flowise Socket Connect Error:', error);
});


module.exports = router;
