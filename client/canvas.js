// Canvas drawing module - handles freehand drawing with mouse events
const Canvas = (function() {
    let canvas;
    let ctx;
    let isDrawing = false;
    let currentColor = '#000000';
    let lineWidth = 2;
    
    let strokeIdCounter = 0;
    let currentStroke = null;
    
    // Each stroke: { id, color, width, points: [{x, y}, ...] }
    let strokes = [];
    
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
        
        // Start a new stroke with the initial point
        currentStroke = {
            id: `stroke_${strokeIdCounter++}`,
            color: currentColor,
            width: lineWidth,
            points: [coords]
        };
        
        isDrawing = true;
        
        // Draw the initial point (drawing a line to itself creates a dot)
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
    
    // For future networking - draw strokes received from other users
    function drawFromData(data) {
        strokes.push(data);
        
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.width;
        
        if (data.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(data.points[0].x, data.points[0].y);
            
            for (let i = 1; i < data.points.length; i++) {
                ctx.lineTo(data.points[i].x, data.points[i].y);
            }
            
            ctx.stroke();
        }
    }
    
    function clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes = [];
        currentStroke = null;
        isDrawing = false;
    }
    
    function setTool(tool) {
        // Placeholder for future tools (eraser, shapes, etc.)
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
    
    return {
        init,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        drawFromData,
        clear,
        setTool,
        setColor,
        setLineWidth,
        getAllStrokes
    };
})();
