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
    });
    
    canvas.addEventListener('mousemove', (e) => {
        Canvas.handleMouseMove(e);
    });
    
    // Listen on document so we catch mouseup even if cursor leaves canvas
    document.addEventListener('mouseup', (e) => {
        Canvas.handleMouseUp(e);
        updateUndoRedoButtons();
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
        if (Canvas.undo()) {
            updateUndoRedoButtons();
        }
    });
    
    redoBtn.addEventListener('click', () => {
        if (Canvas.redo()) {
            updateUndoRedoButtons();
        }
    });
    
    // Keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z or Cmd+Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (Canvas.undo()) {
                updateUndoRedoButtons();
            }
        }
        // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            if (Canvas.redo()) {
                updateUndoRedoButtons();
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
    
    // Minimal Socket.io client connection (no drawing events yet).
    // This creates the `socket` instance that you can inspect in DevTools.
    if (typeof io === 'function') {
        const socket = io();
        window.socket = socket; // handy for debugging: try `socket.connected` in console

        socket.on('connect', () => {
            if (statusEl) statusEl.textContent = 'Connected';
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            if (statusEl) statusEl.textContent = 'Disconnected';
            console.log('Socket disconnected:', reason);
        });
    } else {
        // If this happens, make sure `index.html` includes `/socket.io/socket.io.js`
        console.warn('Socket.io client not found (io is not defined).');
        if (statusEl) statusEl.textContent = 'No socket.io client';
    }
    
    console.log('DrawDash initialized - Ready for drawing!');
});
