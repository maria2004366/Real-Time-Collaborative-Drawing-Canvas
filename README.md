# Real-Time Collaborative Drawing Canvas

A multi-user drawing application allowing simultaneous collaboration on a shared canvas. Features real-time synchronization, global undo/redo, and live user cursors.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repo-link>
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
4.  Open `http://localhost:3000` in multiple browser tabs to test.

## 🧪 Testing Instructions

1.  **Open Tab A:** Enter name "Alice". Draw a shape.
2.  **Open Tab B:** Enter name "Bob". You will see Alice's drawing immediately.
3.  **Real-Time Sync:** Draw in Tab B. Tab A updates instantly.
4.  **Cursor Tracking:** Move mouse in Tab A without drawing. Tab B shows "Alice" floating cursor.
5.  **Global Undo:** Click "Undo" in Tab A. The last stroke (even if drawn by Bob) will vanish from both screens.

## 🔧 Technical Implementation

### Core Stack

- **Frontend:** Vanilla JavaScript, HTML5 Canvas API.
- **Backend:** Node.js, Express.
- **Communication:** Socket.io (WebSockets).

### Key Decisions

- **Vector Storage:** Drawing data is stored as arrays of coordinate points (Vectors) rather than pixel data. This allows for clean "Undo" operations without quality loss.
- **Global State:** The Server acts as the "Single Source of Truth." Clients render strictly based on the server's history stack.
- **Smooth Curves:** Used `quadraticCurveTo` logic in the canvas API to prevent jagged lines during fast mouse movement.

## 🐛 Known Limitations

- **Network Latency:** On very slow networks (>500ms), there is no "Optimistic UI" prediction, so drawing might feel slightly delayed.
- **Mobile Support:** Basic touch events are supported, but the UI is optimized for desktop mouse usage.

## ⏱️ Time Spent

- **2 Days**
