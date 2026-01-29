// 1. Ask for Name immediately
const username = prompt("Enter your name:") || "Guest";

//Getting the status bar element
const statusEl = document.getElementById('status-bar');

const socket = io();

// 2. Variables to track users
const cursorLayer = document.getElementById('cursor-layer');
const cursors = {};

socket.on('connect', () => {
    console.log("✅ Connected.");
    // Tell server our name
    socket.emit('new-user', username);
    // Change statusEl background to 'green' and text to 'Online'
    statusEl.style.background = 'green';
    statusEl.innerText = 'Online';
});

/* --- CURSOR LOGIC --- */
socket.on('cursor-move', (data) => {
    const { id, x, y, name, color } = data;

    // Create cursor if it doesn't exist
    if (!cursors[id]) {
        const cursor = document.createElement('div');
        cursor.className = 'cursor';
        cursor.style.backgroundColor = color; // Use server-assigned color
        
        const label = document.createElement('div');
        label.className = 'cursor-label';
        label.innerText = name; // Show REAL name
        cursor.appendChild(label);

        cursorLayer.appendChild(cursor);
        cursors[id] = cursor;
    }

    // Move cursor
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

/* --- DRAWING SYNC LOGIC --- */
socket.on('drawing-live', (data) => {
    drawLine(data);
});

socket.on('history-update', (history) => {
    window.localHistory = history;
    if (typeof window.redrawCanvas === 'function') {
        window.redrawCanvas();
    }
});

socket.on('initial-history', (history) => {
    window.localHistory = history;
    if (typeof window.redrawCanvas === 'function') {
        window.redrawCanvas();
    }
});

// Detect when we lose connection
socket.on('disconnect', () => {
    // Change statusEl background to 'red' and text to 'Reconnecting...'
    statusEl.style.background = 'red';
    statusEl.innerText = 'Reconnecting...';
});

// Handle a connection error (The 'Error Handling' part!)
socket.on('connect_error', (err) => {
    console.error("Connection failed:", err);
    // Alert the user or log a helpful message
    alert("Connection error! Please check your network and try refreshing the page.");
});