const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const chatRoute = require('./backend/routes/chat.js');
const analyticsRoutes = require('./backend/routes/analyticsRoutes.js');
const redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const cors = require('cors');
const fs = require('fs');
const uuid = require('uuid'); 
const app = express();

// Logging middleware for debugging
app.use((req, res, next) => {
  next();
});

const setupGoogleCredentials = require('./setupGoogleCreds.js');  

// Call the function to set up Google Cloud credentials
setupGoogleCredentials();

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

// Initialize Redis client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

// Define session middleware
const sessionMiddleware = session({
    store: new RedisStore({ 
        client: redisClient, 
        ttl: 1800  // Expiry time in seconds
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
});

// Use session middleware with Express
app.use(sessionMiddleware);

// Middlewares
app.use(bodyParser.json());

// Serve static files for the frontend from the /oxofrmbl directory
app.use('/frontend/dist', express.static(process.env.RAILWAY_VOLUME_MOUNT_PATH));

// Serve static files for the frontend from the frontend/dist directory
app.use('/frontend/dist', express.static(path.join(__dirname, 'frontend/dist')));

// Routes
app.use('/chat', chatRoute);
app.use('/analytics', analyticsRoutes);

// Set up CORS for Socket.io
const io = socketIo(server, {
  cors: {
    origin: whitelist,
    methods: ["GET", "POST"]
  }
});

// Use session middleware with Socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Socket.io connection with error handling
io.on('connection', (socket) => {
    const uid = uuid.v4();  
    socket.emit('uid', uid);  // Emit the UUID to the client
    const sessionId = socket.request.session.sessionID;  // Retrieve sessionId from request session
    socket.sessionId = sessionId;  // Attach sessionId to the socket object

    // Debug: Emit sessionId for debugging
    socket.emit('debugSessionId', sessionId);

    chatRoute.handleSocketConnection(socket, uid);

    socket.on('error', (error) => {
        console.error('Socket.io Error:', error);
    });
});

// Error handling for Socket.io
io.on('connect_error', (error) => {
    console.error('Connection Error:', error);
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
