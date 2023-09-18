// server.js


const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const chatRoute = require('./routes/chat');

const app = express();

// Middlewares
app.use(bodyParser.json());

// Routes
app.use('/chat', chatRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
