document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('drawingCanvas');
    
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
    
    // Clear canvas
    clearBtn.addEventListener('click', () => {
        if (confirm('Clear the entire canvas? This cannot be undone.')) {
            Canvas.clear();
        }
    });
    
    // TODO: WebSocket connection for collaboration
    
    console.log('DrawDash initialized - Ready for drawing!');
});
