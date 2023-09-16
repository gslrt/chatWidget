// routes/chat.js

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { generateAudio } = require('./tts.js');
const db = require('./db');  // Assuming you'll set up a basic db.js for PostgreSQL connection using pg-promise

router.post("/", async (req, res) => {
    const userInput = req.body.question;

    console.log("User Input:", userInput);

    function getCurrentDateTime(timezone = 'Europe/Berlin') {
        const date = new Date();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone,
            hour12: false
        };

        const formatter = new Intl.DateTimeFormat('en-US', options);
        return formatter.format(date);
    }

    const hiveAccess = process.env.HIVE_ACCESS_PUBLIC;  // Keeping only public access as default
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

    // Log the data being sent to the chatbot
    console.log("Sending data to chatbot:", dataToSend);

    try {
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
        console.log('AI response:', aiResponse);
        let responseObject = { 'text': aiResponse };

        // Begin database logging
        // Start a conversation
        const startTimestamp = new Date();
        const conversationResult = await db.none('INSERT INTO Conversations (start_timestamp, ip_address) VALUES ($1, $2)', [startTimestamp, req.ip]);

        // Log the message
        await db.none('INSERT INTO Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [conversationResult.conversation_id, startTimestamp, 'sent', userInput]);
        await db.none('INSERT INTO Messages (conversation_id, timestamp, direction, content) VALUES ($1, $2, $3, $4)', [conversationResult.conversation_id, new Date(), 'received', aiResponse]);

        // Here you'd ideally generate an engagement report based on the conversation and store it. This is a placeholder.
        // await generateEngagementReport(conversationResult.conversation_id);

        // End database logging

        if (req.body.ttsEnabled) {
            let audioUrl = await generateAudio(aiResponse);
            responseObject['audioUrl'] = audioUrl;
        }

        res.send(responseObject);
    } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        res.status(500).send({ error: 'Failed to fetch from the API' });
    }
});

module.exports = router;
