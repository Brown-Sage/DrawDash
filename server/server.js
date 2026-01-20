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
    
    // Placeholder for future drawing events
    // socket.on('draw', (data) => {
    //     // Broadcast drawing data to all other clients
    //     socket.broadcast.emit('draw', data);
    // });
    
    // socket.on('clear', () => {
    //     // Broadcast clear event to all clients
    //     io.emit('clear');
    // });
});

// Start server
server.listen(PORT, () => {
    console.log(`DrawDash server running on http://localhost:${PORT}`);
});
