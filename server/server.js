const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Track connected users
let connectedUsers = new Set();

// Socket.io connection handling
io.on('connection', (socket) => {
    connectedUsers.add(socket.id);
    console.log(`User connected: ${socket.id} (Total: ${connectedUsers.size})`);
    
    // Handle disconnect
    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        console.log(`User disconnected: ${socket.id} (Total: ${connectedUsers.size})`);
    });
    
    // Real-time drawing events
    // Event-based approach: Instead of sending complete strokes after drawing,
    // we send incremental events (start, point, end) for immediate synchronization.
    // Why this approach:
    // 1. Low latency - other users see drawing in real-time as it happens
    // 2. Efficient - only sends coordinate data, not images or canvas blobs
    // 3. Scalable - works well with multiple concurrent users
    // 4. Natural - matches the drawing interaction model (mouse events)
    
    socket.on('stroke:start', (data) => {
        // Broadcast stroke start to all other clients
        socket.broadcast.emit('stroke:start', data);
    });
    
    socket.on('stroke:point', (data) => {
        // Broadcast each point as it's drawn for real-time rendering
        socket.broadcast.emit('stroke:point', data);
    });
    
    socket.on('stroke:end', (data) => {
        // Broadcast stroke end to finalize the stroke
        socket.broadcast.emit('stroke:end', data);
    });
    
    // Undo/redo synchronization
    socket.on('undo', (data) => {
        // Broadcast undo to all other clients
        socket.broadcast.emit('undo', data);
    });
    
    socket.on('redo', (data) => {
        // Broadcast redo to all other clients
        socket.broadcast.emit('redo', data);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`DrawDash server running on http://localhost:${PORT}`);
});
