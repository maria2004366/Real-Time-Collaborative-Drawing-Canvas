# Real-Time Collaborative Drawing Canvas

A multi-user drawing application allowing simultaneous collaboration on a shared canvas. Features real-time synchronization, user-specific undo/redo, live user cursors, and mobile touch support.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/bhargavaalapati/Real-Time-Collaborative-Drawing-Canvas

    cd collaborative-canvas
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    npm start
    ```
4.  Open `http://localhost:3000` in multiple browser tabs (or devices) to test.

## 🧪 Testing Instructions

1.  **Open Tab A:** Enter name "Alice". Draw a shape.
2.  **Open Tab B:** Enter name "Bob". You will see Alice's drawing immediately.
3.  **Real-Time Sync:** Draw in Tab B. Tab A updates instantly.
4.  **Cursor Tracking:** Move mouse in Tab A without drawing. Tab B shows "Alice" floating cursor.
5.  **Smart Undo:** Click "Undo" in Tab A. Only **Alice's** last stroke vanishes (Bob's work remains).
6.  **Mobile Support:** Open the link on your phone (connected to the same Wi-Fi) and draw using touch.

## 🔧 Technical Implementation

### Core Stack

- **Frontend:** Vanilla JavaScript, HTML5 Canvas API.
- **Backend:** Node.js, Express.
- **Communication:** Socket.io (WebSockets).

### Key Decisions

- **Vector Storage:** Drawing data is stored as arrays of coordinate points (Vectors) rather than pixel data. This allows for clean "Undo" operations without quality loss.

- **Global State:** The Server acts as the "Single Source of Truth." Clients render strictly based on the server's history stack.

- **Delta Updates:** To improve performance, we use "Delta Updates" for Undo/Redo. Instead of re-sending the entire history array, the server broadcasts lightweight `delete-stroke` or `new-stroke` events.

- **Optimistic UI:** Local undo operations happen instantly on the client side before waiting for server confirmation to reduce perceived lag.

- **Smooth lines sequence:** Uses `ctx.lineTo(...)` with high-frequency sampling for performance.

## 🐛 Known Limitations

- **Network Latency:** On very slow networks (>500ms), drawing might feel slightly delayed as we prioritize exact server synchronization for new strokes.
- **Canvas Resizing:** Resizing the window clears the canvas briefly before the history replays (visual blink).

## ⏱️ Time Spent

- **2 Days (1 - Learning and 1 - Implementing)**
