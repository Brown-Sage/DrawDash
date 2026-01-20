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

// Server is the source of truth for stroke history
// Each stroke: { id, userId, color, width, points: [{x, y}, ...] }
const strokes = [];
const redoStack = [];

// Broadcast canvas reset to all clients with current stroke history
function broadcastCanvasReset() {
    io.emit('canvas:reset', { strokes: [...strokes] });
}

// Socket.io connection handling
io.on('connection', (socket) => {
    connectedUsers.add(socket.id);
    console.log(`User connected: ${socket.id} (Total: ${connectedUsers.size})`);
    
    // Send current canvas state to newly connected client
    socket.emit('canvas:reset', { strokes: [...strokes] });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        console.log(`User disconnected: ${socket.id} (Total: ${connectedUsers.size})`);
    });
    
    // Handle stroke:add - client sends complete stroke on mouseup
    socket.on('stroke:add', (stroke) => {
        // Add stroke to history
        strokes.push(stroke);
        
        // Clear redo stack (new action invalidates redo)
        redoStack.length = 0;
        
        // Broadcast new stroke to all clients (including sender)
        // This ensures all clients have the same state
        io.emit('stroke:add', stroke);
    });
    
    // Handle undo request
    socket.on('undo', () => {
        if (strokes.length === 0) {
            return;
        }
        
        // Pop last stroke from history
        const undoneStroke = strokes.pop();
        
        // Push to redo stack
        redoStack.push(undoneStroke);
        
        // Broadcast reset to all clients with updated stroke history
        broadcastCanvasReset();
    });
    
    // Handle redo request
    socket.on('redo', () => {
        if (redoStack.length === 0) {
            return;
        }
        
        // Pop from redo stack
        const redoneStroke = redoStack.pop();
        
        // Push back to strokes
        strokes.push(redoneStroke);
        
        // Broadcast reset to all clients with updated stroke history
        broadcastCanvasReset();
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`DrawDash server running on http://localhost:${PORT}`);
});
