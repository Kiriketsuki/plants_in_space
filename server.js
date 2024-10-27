import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const http = createServer(app);
const io = new Server(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["*"],
    },
    allowEIO3: true, // Allow Engine.IO version 3
    transports: ["websocket", "polling"],
});

const port = 3000;

// Store active rooms
const rooms = new Map();

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join a specific room based on unique_id
    socket.on("join-room", (roomId) => {
        console.log(`Socket ${socket.id} joining room:`, roomId);
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            console.log("Creating new room:", roomId);
            rooms.set(roomId, { text: "" });
        }

        // Send current state to the newly connected client
        const currentState = rooms.get(roomId);
        console.log("Sending initial state:", currentState);
        socket.emit("initial-state", currentState);
    });

    // Handle text updates
    socket.on("update-text", ({ roomId, text }) => {
        console.log(`Received text update in room ${roomId}:`, text);

        if (rooms.has(roomId)) {
            rooms.get(roomId).text = text;
            console.log(`Broadcasting to room ${roomId}:`, text);
            // Broadcast to all clients in the room except sender
            socket.to(roomId).emit("text-updated", { text });
        } else {
            console.log("Room not found:", roomId);
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

http.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Log current rooms periodically
setInterval(() => {
    console.log("\nCurrent rooms:");
    for (const [roomId, data] of rooms) {
        console.log(`Room ${roomId}:`, data);
    }
}, 5000);
