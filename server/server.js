// TODO: Set up Express server
// TODO: Serve static files from client directory
// TODO: Set up Socket.io server
// TODO: Handle Socket.io connection events
// TODO: Broadcast drawing events to all connected clients
// TODO: Store canvas state (optional - for persistence)
// TODO: Track connected users
// TODO: Handle canvas clear events
// TODO: Send initial canvas state to newly connected clients

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// TODO: Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// TODO: Store canvas state (in-memory for now)
let canvasState = [];

// TODO: Track connected users
let connectedUsers = new Set();

// TODO: Set up Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // TODO: Add user to connected users
    connectedUsers.add(socket.id);
    
    // TODO: Send current canvas state to newly connected client
    socket.emit('canvasState', canvasState);
    
    // TODO: Broadcast user joined event
    io.emit('userJoined', { userId: socket.id, userCount: connectedUsers.size });
    
    // TODO: Handle drawing events
    socket.on('draw', (data) => {
        // TODO: Store drawing data in canvas state
        // TODO: Broadcast to all other clients
        socket.broadcast.emit('draw', data);
    });
    
    // TODO: Handle canvas clear events
    socket.on('clear', () => {
        // TODO: Clear canvas state
        canvasState = [];
        // TODO: Broadcast clear to all clients
        io.emit('clear');
    });
    
    // TODO: Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        connectedUsers.delete(socket.id);
        // TODO: Broadcast user left event
        io.emit('userLeft', { userId: socket.id, userCount: connectedUsers.size });
    });
});

// TODO: Start server
server.listen(PORT, () => {
    console.log(`DrawDash server running on http://localhost:${PORT}`);
});
