const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const chatRoute = require('./backend/routes/chat.js');
const redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

// Set up session storage
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Set up CORS
const whitelist = process.env.CORS_WHITELIST_WIDGET.split(',');
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.use(cors(corsOptions));

// Middlewares
app.use(bodyParser.json());

// Serve static files for the frontend
const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH || 'frontend/dist';
app.use('/frontend/dist', express.static(path.join(__dirname, volumePath)));

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
