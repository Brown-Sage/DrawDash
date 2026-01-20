// Canvas drawing module - handles freehand drawing with mouse events
const Canvas = (function() {
    let canvas;
    let ctx;
    let isDrawing = false;
    let currentColor = '#000000';
    let lineWidth = 2;
    let currentTool = 'pen';  // 'pen' or 'eraser'
    const CANVAS_BG_COLOR = '#FFFFFF';  // Background color for eraser
    
    let strokeIdCounter = 0;
    let currentStroke = null;
    
    // Each stroke: { id, color, width, points: [{x, y}, ...] }
    // Note: Eraser strokes store the background color, not a special "eraser" type
    // The strokes array represents the current canvas state (acts as undo stack)
    let strokes = [];
    
    // Redo stack: stores strokes that were undone and can be redone
    let redoStack = [];
    
    // Track remote strokes being drawn by other users
    // Key: `${userId}_${strokeId}`, Value: { userId, strokeId, color, width, points: [...] }
    let remoteStrokes = new Map();
    
    function init(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        resizeCanvas();
        
        // Rounded ends make strokes look smoother
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = lineWidth;
        
        window.addEventListener('resize', () => {
            resizeCanvas();
            redrawAllStrokes();
        });
    }
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 40;
        
        const width = Math.min(800, maxWidth);
        const height = Math.min(600, maxHeight);
        
        canvas.width = width;
        canvas.height = height;
        
        redrawAllStrokes();
    }
    
    // Convert mouse coordinates to canvas coordinates
    function getCanvasCoordinates(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    
    function handleMouseDown(event) {
        event.preventDefault();
        
        const coords = getCanvasCoordinates(event);
        
        // Determine the color to use based on current tool
        // Eraser draws with background color, pen uses selected color
        // This way eraser still creates a stroke (important for networking and undo/redo)
        const strokeColor = currentTool === 'eraser' ? CANVAS_BG_COLOR : currentColor;
        
        // Start a new stroke with the initial point
        currentStroke = {
            id: `stroke_${strokeIdCounter++}`,
            color: strokeColor,
            width: lineWidth,
            points: [coords]
        };
        
        isDrawing = true;
        
        // Draw the initial point (drawing a line to itself creates a dot)
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }
    
    function handleMouseMove(event) {
        if (!isDrawing || !currentStroke) {
            return;
        }
        
        const coords = getCanvasCoordinates(event);
        currentStroke.points.push(coords);
        
        // Draw line from previous point to current one
        if (currentStroke.points.length >= 2) {
            const prevPoint = currentStroke.points[currentStroke.points.length - 2];
            const currPoint = currentStroke.points[currentStroke.points.length - 1];
            
            ctx.strokeStyle = currentStroke.color;
            ctx.lineWidth = currentStroke.width;
            
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(currPoint.x, currPoint.y);
            ctx.stroke();
        }
    }
    
    function handleMouseUp(event) {
        if (!isDrawing || !currentStroke) {
            return;
        }
        
        // Add final point if it's different from the last one
        const coords = getCanvasCoordinates(event);
        const lastPoint = currentStroke.points[currentStroke.points.length - 1];
        
        if (coords.x !== lastPoint.x || coords.y !== lastPoint.y) {
            currentStroke.points.push(coords);
        }
        
        // Save the completed stroke
        strokes.push(currentStroke);
        
        // Clear redo stack when new action is performed (new action invalidates redo)
        redoStack = [];
        
        currentStroke = null;
        isDrawing = false;
    }
    
    // Redraw everything when canvas is resized
    function redrawAllStrokes() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        strokes.forEach(stroke => {
            if (stroke.points.length === 0) return;
            
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            
            ctx.stroke();
        });
    }
    
    // Handle remote stroke start (from another user)
    function handleRemoteStrokeStart(data) {
        // data: { strokeId, userId, color, width, x, y }
        const key = `${data.userId}_${data.strokeId}`;
        
        // Create new remote stroke
        remoteStrokes.set(key, {
            userId: data.userId,
            strokeId: data.strokeId,
            color: data.color,
            width: data.width,
            points: [{ x: data.x, y: data.y }]
        });
        
        // Draw initial point immediately
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.width;
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
    }
    
    // Handle remote stroke point (from another user)
    function handleRemoteStrokePoint(data) {
        // data: { strokeId, userId, color, width, x, y }
        const key = `${data.userId}_${data.strokeId}`;
        const remoteStroke = remoteStrokes.get(key);
        
        if (!remoteStroke) {
            // Stroke not found, might have missed start event - ignore
            return;
        }
        
        // Add point to remote stroke
        const newPoint = { x: data.x, y: data.y };
        remoteStroke.points.push(newPoint);
        
        // Draw line segment immediately for real-time rendering
        if (remoteStroke.points.length >= 2) {
            const prevPoint = remoteStroke.points[remoteStroke.points.length - 2];
            const currPoint = remoteStroke.points[remoteStroke.points.length - 1];
            
            ctx.strokeStyle = remoteStroke.color;
            ctx.lineWidth = remoteStroke.width;
            
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(currPoint.x, currPoint.y);
            ctx.stroke();
        }
    }
    
    // Handle remote stroke end (from another user)
    function handleRemoteStrokeEnd(data) {
        // data: { strokeId, userId, color, width, x, y }
        const key = `${data.userId}_${data.strokeId}`;
        const remoteStroke = remoteStrokes.get(key);
        
        if (!remoteStroke) {
            return;
        }
        
        // Add final point if provided
        if (data.x !== undefined && data.y !== undefined) {
            const lastPoint = remoteStroke.points[remoteStroke.points.length - 1];
            if (data.x !== lastPoint.x || data.y !== lastPoint.y) {
                remoteStroke.points.push({ x: data.x, y: data.y });
            }
        }
        
        // Convert remote stroke to local stroke format and save it
        const completedStroke = {
            id: remoteStroke.strokeId,
            color: remoteStroke.color,
            width: remoteStroke.width,
            points: remoteStroke.points
        };
        
        strokes.push(completedStroke);
        
        // Remove from remote strokes map
        remoteStrokes.delete(key);
    }
    
    // Get current stroke data for sending (used by networking)
    function getCurrentStrokeData() {
        if (!currentStroke) {
            return null;
        }
        return {
            strokeId: currentStroke.id,
            color: currentStroke.color,
            width: currentStroke.width
        };
    }
    
    function clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes = [];
        redoStack = [];
        currentStroke = null;
        isDrawing = false;
    }
    
    // Undo: remove last stroke and redraw canvas
    // Returns the undone stroke data (for syncing) or null if nothing to undo
    function undo() {
        if (strokes.length === 0) {
            return null;
        }
        
        // Remove last stroke from current strokes
        const lastStroke = strokes.pop();
        
        // Move to redo stack
        redoStack.push(lastStroke);
        
        // Redraw canvas with remaining strokes
        redrawAllStrokes();
        
        // Return stroke data for syncing
        return lastStroke;
    }
    
    // Undo a specific stroke by ID (for remote undo)
    function undoStrokeById(strokeId) {
        // Find stroke by ID
        const index = strokes.findIndex(s => s.id === strokeId);
        if (index === -1) {
            return false;
        }
        
        // Remove stroke
        const removedStroke = strokes.splice(index, 1)[0];
        
        // Add to redo stack
        redoStack.push(removedStroke);
        
        // Redraw canvas
        redrawAllStrokes();
        
        return true;
    }
    
    // Redo: reapply last undone stroke
    // Returns the redone stroke data (for syncing) or null if nothing to redo
    function redo() {
        if (redoStack.length === 0) {
            return null;
        }
        
        // Get stroke from redo stack
        const strokeToRedo = redoStack.pop();
        
        // Add back to strokes array
        strokes.push(strokeToRedo);
        
        // Redraw canvas with all strokes
        redrawAllStrokes();
        
        // Return stroke data for syncing
        return strokeToRedo;
    }
    
    // Redo a specific stroke (for remote redo)
    function redoStroke(strokeData) {
        // Add stroke back to strokes array
        strokes.push(strokeData);
        
        // Remove from redo stack if it exists there
        const redoIndex = redoStack.findIndex(s => s.id === strokeData.id);
        if (redoIndex !== -1) {
            redoStack.splice(redoIndex, 1);
        }
        
        // Redraw canvas
        redrawAllStrokes();
        
        return true;
    }
    
    // Check if undo is available
    function canUndo() {
        return strokes.length > 0;
    }
    
    // Check if redo is available
    function canRedo() {
        return redoStack.length > 0;
    }
    
    function setTool(tool) {
        // Set current drawing tool
        // 'pen' - draws with selected color
        // 'eraser' - draws with background color (still creates a stroke)
        // 
        // Why eraser creates strokes instead of clearing:
        // 1. Maintains consistency with stroke data structure
        // 2. Enables future networking - eraser strokes sync like regular strokes
        // 3. Supports undo/redo - eraser actions are reversible
        // 4. Simpler implementation - no special eraser logic needed
        if (tool === 'pen' || tool === 'eraser') {
            currentTool = tool;
        }
    }
    
    function getCurrentTool() {
        return currentTool;
    }
    
    function setColor(color) {
        currentColor = color;
        ctx.strokeStyle = color;
    }
    
    function setLineWidth(width) {
        lineWidth = width;
        ctx.lineWidth = width;
    }
    
    function getAllStrokes() {
        return strokes;
    }
    
    function getIsDrawing() {
        return isDrawing;
    }
    
    return {
        init,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleRemoteStrokeStart,
        handleRemoteStrokePoint,
        handleRemoteStrokeEnd,
        getCurrentStrokeData,
        clear,
        undo,
        undoStrokeById,
        redo,
        redoStroke,
        canUndo,
        canRedo,
        setTool,
        getCurrentTool,
        setColor,
        setLineWidth,
        getAllStrokes,
        getIsDrawing
    };
})();
