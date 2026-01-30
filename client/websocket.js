/* ===================== websocket.js ===================== */
let storedName = sessionStorage.getItem('collaborative_username');
if (!storedName) {
    storedName = prompt("Enter your name:") || "Guest";
    sessionStorage.setItem('collaborative_username', storedName);
}
const username = storedName;
const statusEl = document.getElementById('status-bar');
const socket = io();
const cursorLayer = document.getElementById('cursor-layer');
const cursors = {};

socket.on('connect', () => {
    console.log("✅ Connected.");
    socket.emit('new-user', username);
    if(statusEl) {
        statusEl.style.background = '#4CAF50';
        statusEl.innerText = 'Online';
    }
});

/* --- CURSOR LOGIC --- */
socket.on('cursor-move', (data) => {
    const { id, x, y, name, color } = data;
    if (!cursors[id]) {
        const cursor = document.createElement('div');
        cursor.className = 'cursor';
        cursor.style.backgroundColor = color;
        const label = document.createElement('div');
        label.className = 'cursor-label';
        label.innerText = name;
        cursor.appendChild(label);
        cursorLayer.appendChild(cursor);
        cursors[id] = cursor;
    }
    const el = cursors[id];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
});

socket.on('user-disconnected', (id) => {
    if (cursors[id]) {
        cursors[id].remove();
        delete cursors[id];
    }
});

/* --- DRAWING SYNC LOGIC (OPTIMIZED) --- */

socket.on('drawing-live', (data) => {
    // Only visualize the temporary movement
    const ctx = document.getElementById('drawingCanvas').getContext('2d');
    ctx.beginPath();
    ctx.moveTo(data.x0, data.y0);
    ctx.lineTo(data.x1, data.y1);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
});

// 1. Initial Load (Full History)
socket.on('initial-history', (history) => {
    window.localHistory = history;
    if (typeof window.redrawCanvas === 'function') window.redrawCanvas();
});

// 2. New Stroke (Delta Update) - someone else finished a line
socket.on('new-stroke', (stroke) => {
    window.localHistory.push(stroke);
    // Optimization: Just draw this one stroke instead of clearing everything
    // But to be safe with z-index ordering, we usually redraw, 
    // or just draw this one on top.
    // Ideally: just draw it.
    if (stroke.points && stroke.points.length > 0) {
        const ctx = document.getElementById('drawingCanvas').getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        ctx.closePath();
    }
});

// 3. Delete Stroke (Delta Update) - Undo happened
socket.on('delete-stroke', (strokeId) => {
    if (typeof window.removeStroke === 'function') {
        window.removeStroke(strokeId);
    }
});

// 4. Clear Canvas
socket.on('clear-canvas', () => {
    window.localHistory = [];
    if (typeof window.redrawCanvas === 'function') window.redrawCanvas();
});

/* --- CONNECTION HANDLING --- */
socket.on('disconnect', () => {
    if(statusEl) {
        statusEl.style.background = '#f44336';
        statusEl.innerText = 'Reconnecting...';
    }
});

socket.on('connect_error', (err) => {
    console.warn("Connection failed, retrying...", err);
});