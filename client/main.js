document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('drawingCanvas');
    const statusEl = document.getElementById('status');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    Canvas.init(canvas);
    
    // Socket.io client connection
    let socket = null;
    let userId = null;
    
    if (typeof io === 'function') {
        socket = io();
        window.socket = socket;

        socket.on('connect', () => {
            userId = socket.id;
            if (statusEl) statusEl.textContent = 'Connected';
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            if (statusEl) statusEl.textContent = 'Disconnected';
            console.log('Socket disconnected:', reason);
        });
        
        // Listen for stroke:add - draw received stroke from another user
        socket.on('stroke:add', (stroke) => {
            Canvas.drawStroke(stroke);
        });
        
        // Listen for canvas:reset - server sends full stroke history after undo/redo
        socket.on('canvas:reset', (data) => {
            Canvas.setStrokesFromServer(data.strokes);
        });
    } else {
        console.warn('Socket.io client not found (io is not defined).');
        if (statusEl) statusEl.textContent = 'No socket.io client';
    }
    
    // Mouse event handlers
    canvas.addEventListener('mousedown', (e) => {
        Canvas.handleMouseDown(e);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        // Draw locally for responsiveness
        Canvas.handleMouseMove(e);
    });
    
    // Listen on document so we catch mouseup even if cursor leaves canvas
    document.addEventListener('mouseup', (e) => {
        // Get completed stroke from canvas module
        const completedStroke = Canvas.handleMouseUp(e);
        
        // Send complete stroke to server on mouseup
        if (completedStroke && socket && socket.connected) {
            // Add userId to stroke before sending
            const strokeToSend = {
                ...completedStroke,
                userId: userId
            };
            
            // Add to local strokes array immediately for consistency
            // (will also be added when we receive it back from server, but drawStroke checks for duplicates)
            Canvas.drawStroke(strokeToSend);
            
            socket.emit('stroke:add', strokeToSend);
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
    
    // Undo/redo - emit to server, server handles and broadcasts canvas:reset
    undoBtn.addEventListener('click', () => {
        if (socket && socket.connected) {
            socket.emit('undo');
        }
    });
    
    redoBtn.addEventListener('click', () => {
        if (socket && socket.connected) {
            socket.emit('redo');
        }
    });
    
    // Keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z or Cmd+Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (socket && socket.connected) {
                socket.emit('undo');
            }
        }
        // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            if (socket && socket.connected) {
                socket.emit('redo');
            }
        }
    });
    
    // Clear canvas (local only - server doesn't handle clear yet)
    clearBtn.addEventListener('click', () => {
        if (confirm('Clear the entire canvas? This cannot be undone.')) {
            Canvas.clear();
        }
    });
    
    console.log('DrawDash initialized - Ready for drawing!');
});
