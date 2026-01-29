const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');

// Global History (The rendered truth)
window.localHistory = [];

// Helper: Draw a single line segment
function drawLine({ x0, y0, x1, y1, color, size }) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
}

// Helper: Repaint the entire history
window.redrawCanvas = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw all finished strokes from history
    window.localHistory.forEach(stroke => {
        // A stroke is now a list of points, not just one line
        if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            
            const p = stroke.points;
            ctx.moveTo(p[0].x, p[0].y);
            
            for (let i = 1; i < p.length; i++) {
                ctx.lineTo(p[i].x, p[i].y);
            }
            ctx.stroke();
            ctx.closePath();
        }
    });
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.redrawCanvas();
}
window.addEventListener('resize', resize);
resize();

/* ================= THE NEW LOGIC ================= */

let isDrawing = false;
let currentStroke = []; // Stores the path we are currently drawing

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    currentStroke = []; // Start a new stroke
    // Add the first point
    currentStroke.push({ x: e.clientX, y: e.clientY });
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const lastPoint = currentStroke[currentStroke.length - 1];
    
    // 1. Prepare the tiny segment (just for live view)
    const liveDrawData = {
        x0: lastPoint.x,
        y0: lastPoint.y,
        x1: e.clientX,
        y1: e.clientY,
        color: colorPicker.value,
        size: brushSize.value
    };

    // 2. Draw it locally (Instant feedback)
    drawLine(liveDrawData);

    // 3. Send "Live" update to others (So they see you drawing)
    // NOTE: This does NOT go into history yet!
    if (typeof socket !== 'undefined') {
        socket.emit('drawing-live', liveDrawData);
    }

    // 4. Save point to our current buffer
    currentStroke.push({ x: e.clientX, y: e.clientY });

    // UPDATE THIS PART:
    if (typeof socket !== 'undefined') {
        // We aren't drawing, just moving the mouse
        // We don't need to send name every millisecond (wasteful), 
        // but for simplicity in this assignment, we rely on the server's stored state.
        socket.emit('cursor-move', { x: e.clientX, y: e.clientY });
    }
});

canvas.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;

    // 5. PACK IT UP! 
    // Now that the user lifted the mouse, we create one big "Stroke Object"
    const finishedStroke = {
        color: colorPicker.value,
        size: brushSize.value,
        points: currentStroke
    };

    // Save locally
    window.localHistory.push(finishedStroke);
    
    // Send to server to save in PERMANENT history
    if (typeof socket !== 'undefined') {
        socket.emit('drawing-save', finishedStroke);
    }
});

// Undo / Clear Buttons
document.getElementById('undoBtn').addEventListener('click', () => {
    socket.emit('undo');
});
document.getElementById('clearBtn').addEventListener('click', () => {
    socket.emit('clear');
});
// REDO BUTTON
document.getElementById('redoBtn').addEventListener('click', () => {
    if (typeof socket !== 'undefined') {
        socket.emit('redo');
    }
});