const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../client")));

// --- STATE MANAGEMENT ---
let drawingHistory = [];
let redoStack = []; 
let users = {}; // Stores { socketId: { name, color } }

// Helper: Generate a random bright color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

io.on("connection", (socket) => {
    console.log("New Connection: " + socket.id);

    // 1. Handle New User (Assign Color)
    socket.on('new-user', (name) => {
        users[socket.id] = {
            name: name,
            color: getRandomColor() // Assign unique color
        };
        // Send history to the new guy
        socket.emit('initial-history', drawingHistory);
    });

    // 2. Cursor Movement
    socket.on('cursor-move', (coords) => {
        const user = users[socket.id];
        if (user) {
            socket.broadcast.emit('cursor-move', {
                id: socket.id,
                x: coords.x,
                y: coords.y,
                name: user.name, // Send the real name
                color: user.color // Send the assigned color
            });
        }
    });

    // 3. Drawing - Live (Movement)
    socket.on("drawing-live", (data) => {
        socket.broadcast.emit("drawing-live", data);
    });

    // 4. Drawing - Save (Mouse Up)
    socket.on("drawing-save", (finishedStroke) => {
        drawingHistory.push(finishedStroke);
        redoStack = []; // Clear redo stack on new action
        // No broadcast needed here, users already saw live drawing
    });

    // 5. UNDO
    socket.on('undo', () => {
        if (drawingHistory.length > 0) {
            const lastStroke = drawingHistory.pop();
            redoStack.push(lastStroke);
            io.emit('history-update', drawingHistory);
        }
    });

    // 6. REDO
    socket.on('redo', () => {
        if (redoStack.length > 0) {
            const strokeToRestore = redoStack.pop();
            drawingHistory.push(strokeToRestore);
            io.emit('history-update', drawingHistory);
        }
    });

    // 7. CLEAR
    socket.on('clear', () => {
        drawingHistory = [];
        redoStack = [];
        io.emit('history-update', drawingHistory);
    });

    // 8. Disconnect
    socket.on("disconnect", () => {
        delete users[socket.id];
        io.emit('user-disconnected', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});