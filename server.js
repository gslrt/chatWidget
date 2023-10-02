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
    sessionMiddleware(socket.request, socket.request.res || {}, () => {
        // Check if the session object exists
        if (!socket.request.session) {
            console.error("Session object doesn't exist");
            return next(new Error("Session object doesn't exist"));
        }

        // Check if sessionID exists in the session object
        if (!socket.request.session.sessionID) {
            console.error("sessionID is not in the session object");
        }

        // Log the full session object for debugging
        console.log("Debug: Full socket.request.session object:", JSON.stringify(socket.request.session));
        
        // Manually save the session before calling next
        socket.request.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
            }
            next();
        });
    });
});





// Socket.io connection
io.on('connection', (socket) => {
    // Generate a UUID for the client
    const uid = uuid.v4();  
    
    // Emit the UUID to the client
    socket.emit('uid', uid);  
    
    // Retrieve the session ID from the Express session middleware
    const sessionId = socket.request.session.sessionID;  

   // More debugging: Log full session object
    console.log('Debug: Complete Session Object:', JSON.stringify(socket.request.session));
    

    
    // Attach the session ID to the socket object, so it can be used later in other events
    socket.sessionId = sessionId;  

      // Log the session ID for debugging purposes
    console.log(`[Socket.io] User ${uid} connected with sessionId: ${sessionId}`);
    
    // Emit the session ID to the client for debugging
    socket.emit('debugSessionId', sessionId);  
    
    // Handle the chat connection
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
