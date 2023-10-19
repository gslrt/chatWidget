// backend/routes/chat.js

const fetch = require('node-fetch');
const { generateAudio } = require('../models/tts.js');
const { Pool } = require('pg');
const router = require('express').Router();
const IPGeolocationAPI = require('ip-geolocation-api-javascript-sdk');
const { getGeolocation } = require('../geolocation');
const ipgeolocationApi = new IPGeolocationAPI(process.env.GEOLOCATOR_API_KEY, false);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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

router.handleSocketConnection = (socket, uid) => {
  console.log(`[Chat Route] User ${uid} connected: ${socket.id}`);

  socket.on('setSessionId', (sessionId) => {
    socket.request.session.sessionID = sessionId;
  });

  socket.on('chatMessage', async (data) => {
    try {
      data.ttsEnabled = (data.mode === 'A' || data.mode === 'B');
      const userInput = data.question;
      const chatMode = data.mode;
      const streamEnabled = (chatMode === 'C');

      let maxTokens = 100;
      if (chatMode === 'B') {
        maxTokens = 40;
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
      let systemMessage = `You are a pirate. Max Tokens: ${maxTokens}`;
      
      const dataToSend = {
        question: userInput,
        overrideConfig: {
          maxTokens,
          systemMessage,
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

      if (streamEnabled) {
        const reader = response.body.getReader();
        let done = false;
        while (!done) {
          const { done, value } = await reader.read();
          if (value) {
            socket.emit('token', new TextDecoder().decode(value));
          }
        }
      } else {
        const responseBody = await response.json();
        let aiResponse = responseBody;

        if (data.ttsEnabled) {
          let audioUrl = await generateAudio(aiResponse);
          socket.emit('botResponse', { 'text': aiResponse, 'audioUrl': audioUrl });
        } else {
          socket.emit('botResponse', { 'text': aiResponse });
        }
      }

      await updateDatabaseAndSession(socket, currentTimestamp, userInput, aiResponse);
      
    } catch (error) {
      console.error('Error:', error);
      socket.emit('error', { error: 'An error occurred' });
    }
  });
};

module.exports = router;
