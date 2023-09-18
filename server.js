// server.js


const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const tts = require('./backend/modules/tts.js');
const chatRoute = require('./backend/routes/chat.js');

const app = express();

// Middlewares
app.use(bodyParser.json());

// Routes
app.use('/chat', chatRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
