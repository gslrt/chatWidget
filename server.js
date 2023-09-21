// server.js


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
const fs = require('fs');
const uuid = require('uuid');  // You'll need to install this package

// Initialize Express app
const app = express();

// Set up CORS for Express
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

// Create HTTP Server
const server = http.createServer(app);

// Set up CORS for Socket.io
const io = socketIo(server, {
  cors: {
    origin: whitelist,
    methods: ["GET", "POST"]
  }
});

// Initialize Redis client
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

// Middlewares
app.use(bodyParser.json());

// Serve static files for the frontend from the /oxofrmbl directory
app.use('/frontend/dist', express.static('/oxofrmbl'));

// Serve static files for the frontend from the frontend/dist directory
app.use('/frontend/dist', express.static(path.join(__dirname, 'frontend/dist')));

// Routes
app.use('/chat', chatRoute);

// Socket.io connection
io.on('connection', (socket) => {
    const uid = uuid.v4();  
    console.log(`[Server] User ${uid} connected: ${socket.id}`);
    socket.emit('uid', uid);  // Emit the UUID to the client
    chatRoute.handleSocketConnection(socket, uid);
});

// Debugging log: Socket.io connection established
console.log("[Server] Socket.io connection established");

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Server] Server is running on port ${PORT}`);
});

// Log the contents of /oxofrmbl
fs.readdir('/oxofrmbl', (err, files) => {
    if (err) {
        console.log('Error reading /oxofrmbl:', err);
    } else {
        console.log('Contents of /oxofrmbl:', files);
    }
});

// Log the webpack output path
console.log('Webpack output path:', path.resolve(__dirname, '/oxofrmbl'));
