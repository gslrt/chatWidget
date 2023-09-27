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

// Initialize Express app
const app = express();

// Logging middleware for debugging
app.use((req, res, next) => {
  next();
});

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
    store: new RedisStore({ client: redisClient }),
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

// Socket.io connection
io.on('connection', (socket) => {
    const uid = uuid.v4();  
    socket.emit('uid', uid);  // Emit the UUID to the client

    console.log("Debug: socket.request.session:", socket.request.session);

    const sessionId = socket.request.session.sessionID;  // Retrieve sessionId from request session
    console.log("Debug: Retrieved sessionId:", sessionId);

    if(sessionId) {
        socket.sessionId = sessionId;  // Attach sessionId to the socket object
        // Debug: Emit sessionId for debugging
        socket.emit('debugSessionId', sessionId);

        // When storing session data into Redis
        redisClient.set(sessionId, JSON.stringify({uid: uid}), (err) => {
            if (err) console.error('Error storing session data in Redis:', err);
            else console.log(`Stored session data for sessionId: ${sessionId}`);
        });

        // When retrieving session data from Redis just to debug
        redisClient.get(sessionId, (err, reply) => {
            if (err) console.error('Error retrieving session data from Redis:', err);
            else console.log(`Retrieved session data for sessionId: ${sessionId} - Data: ${reply}`);
        });
    } else {
        console.error("Session ID is undefined.");
    }

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
