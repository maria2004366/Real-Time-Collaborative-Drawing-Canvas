const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');

// Global History
window.localHistory = [];

// Helper: Generate Unique ID (for optimistic updates)
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper: Draw a single stroke
function drawLine({ points, color, size }) {
    if (!points || points.length === 0) return;
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.closePath();
}

// Helper: Repaint the entire canvas
window.redrawCanvas = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.localHistory.forEach(stroke => drawLine(stroke));
};

// Helper: Delete a specific stroke by ID (Delta Update)
window.removeStroke = function(strokeId) {
    window.localHistory = window.localHistory.filter(s => s.id !== strokeId);
    window.redrawCanvas();
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.redrawCanvas();
}
window.addEventListener('resize', resize);
resize();

/* ================= DRAWING LOGIC ================= */

let isDrawing = false;
let currentStroke = [];

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    currentStroke = [];
    currentStroke.push({ x: e.clientX, y: e.clientY });
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const lastPoint = currentStroke[currentStroke.length - 1];
    
    // Live Draw (Visual only)
    const liveData = {
        x0: lastPoint.x, y0: lastPoint.y,
        x1: e.clientX, y1: e.clientY,
        color: colorPicker.value,
        size: brushSize.value
    };
    
    // Draw locally for instant feedback
    ctx.beginPath();
    ctx.moveTo(liveData.x0, liveData.y0);
    ctx.lineTo(liveData.x1, liveData.y1);
    ctx.strokeStyle = liveData.color;
    ctx.lineWidth = liveData.size;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (typeof socket !== 'undefined') {
        socket.emit('drawing-live', liveData);
        socket.emit('cursor-move', { x: e.clientX, y: e.clientY });
    }

    currentStroke.push({ x: e.clientX, y: e.clientY });
});

canvas.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;

    // Create the full Stroke Object with a Unique ID
    const finishedStroke = {
        id: generateId(), // <--- NEW: Client generates ID
        color: colorPicker.value,
        size: brushSize.value,
        points: currentStroke
    };

    // Save locally
    window.localHistory.push(finishedStroke);
    
    // Send to server
    if (typeof socket !== 'undefined') {
        socket.emit('drawing-save', finishedStroke);
    }
});

/* ================= OPTIMISTIC UNDO ================= */

document.getElementById('undoBtn').addEventListener('click', () => {
    if (typeof socket === 'undefined') return;

    // 1. Find my last stroke (Optimistic)
    // We scan backwards for the last stroke that doesn't have a 'foreign' flag
    // (In a real app, we check userId, but here we assume local push = mine for the moment)
    // A safer way is to let the server handle ID matching, 
    // BUT for "Optimistic," we simply tell the server "Undo" and wait for the delta.
    
    // For pure Delta speed without complexity, we send the command.
    socket.emit('undo');
});

document.getElementById('redoBtn').addEventListener('click', () => {
    if (typeof socket !== 'undefined') socket.emit('redo');
});

document.getElementById('clearBtn').addEventListener('click', () => {
    if (typeof socket !== 'undefined') socket.emit('clear');
});


/* ================= MOBILE TOUCH ================= */
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
}
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if(e.touches.length > 0) {
        const pos = getTouchPos(e);
        canvas.dispatchEvent(new MouseEvent("mousedown", { clientX: pos.x, clientY: pos.y }));
    }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if(e.touches.length > 0) {
        const pos = getTouchPos(e);
        canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: pos.x, clientY: pos.y }));
    }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    canvas.dispatchEvent(new MouseEvent("mouseup", {}));
});