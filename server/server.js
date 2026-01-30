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
let users = {}; 

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

    socket.on('new-user', (name) => {
        users[socket.id] = { name: name, color: getRandomColor() };
        // Initial load still needs full history
        socket.emit('initial-history', drawingHistory);
    });

    socket.on('cursor-move', (coords) => {
        const user = users[socket.id];
        if (user) {
            socket.broadcast.emit('cursor-move', {
                id: socket.id,
                x: coords.x, y: coords.y,
                name: user.name, color: user.color
            });
        }
    });

    socket.on("drawing-live", (data) => {
        socket.broadcast.emit("drawing-live", data);
    });

    socket.on("drawing-save", (finishedStroke) => {
        // Tag with UserID
        finishedStroke.userId = socket.id;
        // Ensure it has an ID (if client didn't send one)
        if (!finishedStroke.id) finishedStroke.id = Math.random().toString(36);

        drawingHistory.push(finishedStroke);
        redoStack = []; 
        
        // Broadcast ONLY the new stroke to everyone else (Delta Update)
        // This saves bandwidth compared to sending the whole history
        socket.broadcast.emit('new-stroke', finishedStroke);
    });

    // --- OPTIMIZED UNDO ---
    socket.on('undo', () => {
        let indexToRemove = -1;
        // Find last stroke by this user
        for (let i = drawingHistory.length - 1; i >= 0; i--) {
            if (drawingHistory[i].userId === socket.id) {
                indexToRemove = i;
                break;
            }
        }

        if (indexToRemove !== -1) {
            const removedStroke = drawingHistory.splice(indexToRemove, 1)[0];
            redoStack.push(removedStroke);
            
            // DELTA UPDATE: Don't send the whole history.
            // Just tell clients: "Delete ID #xyz"
            io.emit('delete-stroke', removedStroke.id);
        }
    });

    // --- OPTIMIZED REDO ---
    socket.on('redo', () => {
        if (redoStack.length > 0) {
            const strokeToRestore = redoStack.pop();
            drawingHistory.push(strokeToRestore);
            // Just send the one new stroke
            io.emit('new-stroke', strokeToRestore);
        }
    });

    socket.on('clear', () => {
        drawingHistory = [];
        redoStack = [];
        // Clear is a rare event, simple signal is fine
        io.emit('clear-canvas');
    });

    socket.on("disconnect", () => {
        delete users[socket.id];
        io.emit('user-disconnected', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});