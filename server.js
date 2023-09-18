// server.js


const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { generateAudio } = require('./backend/models/tts.js');  
const chatRoute = require('./backend/routes/chat.js');
const redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Middlewares
app.use(bodyParser.json());

// Routes
app.use('/chat', chatRoute);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Pass the socket to your chatRoute logic or any other routes that need it
    chatRoute.handleSocketConnection(socket);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
