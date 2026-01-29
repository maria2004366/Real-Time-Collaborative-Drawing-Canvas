let storedName = sessionStorage.getItem("collaborative_username");

if (!storedName) {
    let input = prompt("Enter your name:");
    if (input && input.trim() !== "") {
        storedName = input.trim();
    } else {
        storedName = "Guest-" + Math.floor(Math.random() * 1000);
    }
    sessionStorage.setItem("collaborative_username", storedName);
}

const username = storedName;


// Getting the status bar element
const statusEl = document.getElementById('status-bar');

const socket = io();

// 2. Variables to track users
const cursorLayer = document.getElementById('cursor-layer');
const cursors = {};

socket.on('connect', () => {
    console.log("✅ Connected.");
    socket.emit('new-user', username);
    
    // UI Feedback
    if(statusEl) {
        statusEl.style.background = '#4CAF50'; // Green
        statusEl.innerText = 'Online';
        statusEl.style.color = 'white';
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

/* --- DRAWING SYNC LOGIC --- */
socket.on('drawing-live', (data) => {
    // Check if drawLine exists (it's in canvas.js)
    if (typeof drawLine === 'function') drawLine(data);
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

/* --- CONNECTION HANDLING (NO ALERTS!) --- */

// Detect when we lose connection
socket.on('disconnect', () => {
    if(statusEl) {
        statusEl.style.background = '#f44336'; // Red
        statusEl.innerText = 'Reconnecting...';
    }
});

// Handle connection error silently in the UI
socket.on('connect_error', (err) => {
    console.warn("Connection failed, retrying...", err);
    // DO NOT USE ALERT HERE. It freezes the browser loop.
    if(statusEl) {
        statusEl.style.background = '#f44336'; // Red
        statusEl.innerText = 'Connection Issues...';
    }
});