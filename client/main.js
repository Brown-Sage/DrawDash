document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('drawingCanvas');
    const statusEl = document.getElementById('status');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    Canvas.init(canvas);
    
    canvas.addEventListener('mousedown', (e) => {
        Canvas.handleMouseDown(e);
        
        // Send stroke start event
        if (socket && socket.connected) {
            const rect = canvas.getBoundingClientRect();
            sendStrokeStart({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        Canvas.handleMouseMove(e);
        
        // Send stroke point event if we're drawing
        if (socket && socket.connected && Canvas.getIsDrawing()) {
            const rect = canvas.getBoundingClientRect();
            sendStrokePoint({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    });
    
    // Listen on document so we catch mouseup even if cursor leaves canvas
    document.addEventListener('mouseup', (e) => {
        const wasDrawing = Canvas.getIsDrawing();
        Canvas.handleMouseUp(e);
        updateUndoRedoButtons();
        
        // Send stroke end event
        if (socket && socket.connected && wasDrawing) {
            const rect = canvas.getBoundingClientRect();
            sendStrokeEnd({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    });
    
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Toolbar controls
    const colorPicker = document.getElementById('colorPicker');
    const strokeWidth = document.getElementById('strokeWidth');
    const strokeWidthValue = document.getElementById('strokeWidthValue');
    const penTool = document.getElementById('penTool');
    const eraserTool = document.getElementById('eraserTool');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    // Update undo/redo button states
    function updateUndoRedoButtons() {
        undoBtn.disabled = !Canvas.canUndo();
        redoBtn.disabled = !Canvas.canRedo();
    }
    
    // Color picker
    colorPicker.addEventListener('input', (e) => {
        Canvas.setColor(e.target.value);
    });
    
    // Stroke width slider
    strokeWidth.addEventListener('input', (e) => {
        const width = parseInt(e.target.value);
        strokeWidthValue.textContent = width;
        Canvas.setLineWidth(width);
    });
    
    // Tool selection
    penTool.addEventListener('click', () => {
        Canvas.setTool('pen');
        penTool.classList.add('active');
        eraserTool.classList.remove('active');
    });
    
    eraserTool.addEventListener('click', () => {
        Canvas.setTool('eraser');
        eraserTool.classList.add('active');
        penTool.classList.remove('active');
    });
    
    // Undo/redo
    undoBtn.addEventListener('click', () => {
        const undoneStroke = Canvas.undo();
        if (undoneStroke) {
            updateUndoRedoButtons();
            
            // Send undo event to server
            if (socket && socket.connected) {
                socket.emit('undo', {
                    userId: userId,
                    strokeId: undoneStroke.id
                });
            }
        }
    });
    
    redoBtn.addEventListener('click', () => {
        const redoneStroke = Canvas.redo();
        if (redoneStroke) {
            updateUndoRedoButtons();
            
            // Send redo event to server
            if (socket && socket.connected) {
                socket.emit('redo', {
                    userId: userId,
                    stroke: redoneStroke
                });
            }
        }
    });
    
    // Keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z or Cmd+Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            const undoneStroke = Canvas.undo();
            if (undoneStroke) {
                updateUndoRedoButtons();
                
                // Send undo event to server
                if (socket && socket.connected) {
                    socket.emit('undo', {
                        userId: userId,
                        strokeId: undoneStroke.id
                    });
                }
            }
        }
        // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            const redoneStroke = Canvas.redo();
            if (redoneStroke) {
                updateUndoRedoButtons();
                
                // Send redo event to server
                if (socket && socket.connected) {
                    socket.emit('redo', {
                        userId: userId,
                        stroke: redoneStroke
                    });
                }
            }
        }
    });
    
    // Clear canvas
    clearBtn.addEventListener('click', () => {
        if (confirm('Clear the entire canvas? This cannot be undone.')) {
            Canvas.clear();
            updateUndoRedoButtons();
        }
    });
    
    // Initial button state
    updateUndoRedoButtons();
    
    // Socket.io client connection for real-time collaboration
    let socket = null;
    let userId = null;
    
    if (typeof io === 'function') {
        socket = io();
        window.socket = socket; // handy for debugging: try `socket.connected` in console

        socket.on('connect', () => {
            userId = socket.id;
            if (statusEl) statusEl.textContent = 'Connected';
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            if (statusEl) statusEl.textContent = 'Disconnected';
            console.log('Socket disconnected:', reason);
        });
        
        // Listen for remote stroke events
        socket.on('stroke:start', (data) => {
            Canvas.handleRemoteStrokeStart(data);
        });
        
        socket.on('stroke:point', (data) => {
            Canvas.handleRemoteStrokePoint(data);
        });
        
        socket.on('stroke:end', (data) => {
            Canvas.handleRemoteStrokeEnd(data);
            updateUndoRedoButtons();
        });
        
        // Listen for remote undo/redo events
        socket.on('undo', (data) => {
            // Only handle undo from other users
            if (data.userId !== userId) {
                Canvas.undoStrokeById(data.strokeId);
                updateUndoRedoButtons();
            }
        });
        
        socket.on('redo', (data) => {
            // Only handle redo from other users
            if (data.userId !== userId) {
                Canvas.redoStroke(data.stroke);
                updateUndoRedoButtons();
            }
        });
    } else {
        // If this happens, make sure `index.html` includes `/socket.io/socket.io.js`
        console.warn('Socket.io client not found (io is not defined).');
        if (statusEl) statusEl.textContent = 'No socket.io client';
    }
    
    // Send stroke events to server
    function sendStrokeStart(coords) {
        if (!socket || !socket.connected) return;
        
        const strokeData = Canvas.getCurrentStrokeData();
        if (!strokeData) return;
        
        socket.emit('stroke:start', {
            strokeId: strokeData.strokeId,
            userId: userId,
            color: strokeData.color,
            width: strokeData.width,
            x: coords.x,
            y: coords.y
        });
    }
    
    function sendStrokePoint(coords) {
        if (!socket || !socket.connected) return;
        
        const strokeData = Canvas.getCurrentStrokeData();
        if (!strokeData) return;
        
        socket.emit('stroke:point', {
            strokeId: strokeData.strokeId,
            userId: userId,
            color: strokeData.color,
            width: strokeData.width,
            x: coords.x,
            y: coords.y
        });
    }
    
    function sendStrokeEnd(coords) {
        if (!socket || !socket.connected) return;
        
        const strokeData = Canvas.getCurrentStrokeData();
        if (!strokeData) return;
        
        socket.emit('stroke:end', {
            strokeId: strokeData.strokeId,
            userId: userId,
            color: strokeData.color,
            width: strokeData.width,
            x: coords.x,
            y: coords.y
        });
    }
    
    console.log('DrawDash initialized - Ready for drawing!');
});
