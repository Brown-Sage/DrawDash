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
    
    // TODO: WebSocket connection for collaboration
    // TODO: Toolbar controls (color picker, clear button, etc.)
    
    console.log('DrawDash initialized - Ready for drawing!');
});
