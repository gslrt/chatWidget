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
      const userInput = data.question;
      const chatMode = data.mode;
      const streamEnabled = (chatMode === 'C');
      const url = process.env.CHAT_URL;
      const dataToSend = {
        question: userInput,
        overrideConfig: {
          // ... other config properties
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          socket.emit('token', value.toString());
        }
        reader.releaseLock();
      } else {
        const responseBody = await response.json();
        let aiResponse = responseBody;
        socket.emit('botResponse', { 'text': aiResponse });
      }

      const currentTimestamp = new Date();
      await updateDatabaseAndSession(socket, currentTimestamp, userInput, aiResponse);
      
    } catch (error) {
      console.error('Error:', error);
      socket.emit('error', { error: 'An error occurred' });
    }
  });
};

module.exports = router;
