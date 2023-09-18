// server.js


const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { generateAudio } = require('./backend/models/tts.js');  
const chatRoute = require('./backend/routes/chat.js');
const io = socketIo(server);
const app = express();


const redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
