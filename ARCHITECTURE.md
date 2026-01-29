# Collaborative Drawing Architecture

## 1. System Overview

This project is a real-time, multi-user drawing application utilizing a **Client-Server Architecture**. It relies on **WebSockets** for bidirectional communication and a **Centralized State Pattern** to ensure data consistency across all connected clients.

### 🏛 High-Level Architecture Diagram

The system follows a "Thin Client, Fat Server" state model. The Client is responsible for Rendering, while the Server is responsible for Truth.

```mermaid
graph TD
    ClientA[Client A (Browser)] -->|Emits Events| Server[Node.js Server]
    ClientB[Client B (Browser)] -->|Emits Events| Server

    subgraph Server Logic
        Server -->|Maintains| History[Global History Stack]
        Server -->|Maintains| Redo[Redo Stack]
        Server -->|Broadcasts| Updates[State Updates]
    end

    Updates -->|Syncs| ClientA
    Updates -->|Syncs| ClientB
```

````

## 2. Data Flow & Synchronization Strategy

### A. The "Stroke" Data Model (Vector Storage)

Instead of transmitting raw pixels (bitmap data), which is bandwidth-heavy and impossible to undo cleanly, we transmit **Vector Paths**. A "Stroke" is defined as a collection of coordinate points.

**JSON Structure:**

```json
{
  "color": "#FF0000",
  "size": 5,
  "points": [
    { "x": 100, "y": 100 },
    { "x": 105, "y": 102 },
    ...
  ]
}

```

### B. Event Protocol

We use a custom WebSocket protocol to manage state.

| Event Name       | Direction       | Payload               | Purpose                                                                           |
| ---------------- | --------------- | --------------------- | --------------------------------------------------------------------------------- |
| `connection`     | Client → Server | -                     | Establishes the socket tunnel.                                                    |
| `new-user`       | Client → Server | `String` (Name)       | Registers the user and assigns a unique color.                                    |
| `drawing-live`   | Bidirectional   | `{x0, y0, x1, y1...}` | Broadcasts temporary mouse movements for real-time feedback. **Not saved to DB.** |
| `drawing-save`   | Client → Server | `Stroke Object`       | Sent on `mouseup`. The server commits this to the Global History.                 |
| `cursor-move`    | Bidirectional   | `{id, x, y}`          | Broadcasts mouse position for "Ghost Cursors."                                    |
| `undo` / `redo`  | Client → Server | -                     | Triggers state modification on the server.                                        |
| `history-update` | Server → Client | `Array<Stroke>`       | Forces clients to re-render the canvas with the new truth.                        |

---

## 3. State Management (Global Undo/Redo)

We implement a **Global State Replacement** strategy to ensure perfect synchronization.

### The Problem

In a collaborative environment, if User A undos their last action, User B's screen must update immediately. Local history is unreliable because network latency can cause stroke order to differ between clients.

### The Solution: Server-Side Stacks

The server maintains two arrays:

1. **`drawingHistory`**: The active stack of rendered strokes.
2. **`redoStack`**: The "future" stack (strokes that have been undone).

**Logic Flow:**

1. **Action:** User clicks "Undo."
2. **Server:** Pops the last item from `drawingHistory` and pushes it to `redoStack`.
3. **Broadcast:** The server emits `history-update` with the new `drawingHistory`.
4. **Client:** Wipes the canvas (`ctx.clearRect`) and iterates through the new array, redrawing every stroke.

---

## 4. Conflict Resolution & Concurrency

How do we handle two users drawing or undoing at the exact same time?

1. **Single-Threaded Authority:** Node.js is single-threaded. Even if two requests arrive at the exact same millisecond, the event loop processes them sequentially.
2. **Source of Truth:** The server's array index is the law. If User A and User B both send a stroke, the server pushes them one after another (e.g., Index 4 and Index 5).
3. **Branch Breaking:** If the `redoStack` has items (History = A, B, C | Redo = D), and a user draws a _new_ line (E), the server clears the `redoStack`. The new history becomes A, B, C, E. This prevents "Time Travel Paradoxes."

---

## 5. Technical Decisions & Optimizations

### Why Socket.io?

While native WebSockets are lighter, Socket.io was chosen for:

1. **Auto-Reconnection:** Handles network blips gracefully without custom retry logic.
2. **Broadcasting:** Simplifies the logic of sending data to "everyone except sender" (`socket.broadcast.emit`).

### Why Vector Storage?

Storing strokes as arrays of points rather than pixels allows for:

1. **Resolution Independence:** The canvas can be resized without losing image quality (we simply re-render the paths).
2. **Memory Efficiency:** A complex drawing takes a few KB of JSON vs. MBs for a bitmap image.


````
