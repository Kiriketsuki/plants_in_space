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
    allowEIO3: true,
    transports: ["websocket", "polling"],
});

const port = 3000;

class Room {
    constructor() {
        this.clients = new Set();
        this.lastActivity = Date.now();
        this.spotifyToken = null;
        this.selectedSongs = [];
    }

    addClient(socketId) {
        this.clients.add(socketId);
        this.lastActivity = Date.now();
    }

    removeClient(socketId) {
        this.clients.delete(socketId);
        this.lastActivity = Date.now();
    }

    setSpotifyToken(token) {
        this.spotifyToken = token;
    }

    addSelectedSong(song) {
        if (this.selectedSongs.length < 2) {
            this.selectedSongs.push(song);
            return true;
        }
        return false;
    }

    removeSelectedSong(songId) {
        this.selectedSongs = this.selectedSongs.filter((song) => song.id !== songId);
    }

    reset() {
        this.spotifyToken = null;
        this.selectedSongs = [];
        this.lastActivity = Date.now();
    }

    get clientCount() {
        return this.clients.size;
    }
}

const rooms = new Map();

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    let currentRoom = null;

    socket.on("join-room", (roomId) => {
        console.log(`Client ${socket.id} joining room: ${roomId}`);

        if (currentRoom) {
            console.log(`Client ${socket.id} leaving current room: ${currentRoom}`);
            leaveRoom(socket, currentRoom);
        }

        currentRoom = roomId;
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            console.log(`Creating new room: ${roomId}`);
            rooms.set(roomId, new Room());
        }

        const room = rooms.get(roomId);
        room.addClient(socket.id);
        console.log(`Room ${roomId} now has ${room.clientCount} client(s)`);

        // Send current state to the newly connected client
        socket.emit("initial-state", {
            spotifyToken: room.spotifyToken,
            selectedSongs: room.selectedSongs,
        });
    });

    socket.on("spotify-token", ({ roomId, token }) => {
        console.log(`Received Spotify token for room ${roomId}`);
        const room = rooms.get(roomId);
        if (room) {
            room.setSpotifyToken(token);
            io.to(roomId).emit("spotify-token-updated", { token });
        }
    });

    socket.on("select-song", ({ roomId, song }) => {
        console.log(`Song selection for room ${roomId}: ${song.name} by ${song.artists[0].name}`);
        const room = rooms.get(roomId);
        if (room) {
            if (room.addSelectedSong(song)) {
                io.to(roomId).emit("songs-updated", { songs: room.selectedSongs });
                console.log(`Room ${roomId} now has ${room.selectedSongs.length} song(s)`);
            }
        }
    });

    socket.on("remove-song", ({ roomId, songId }) => {
        console.log(`Removing song ${songId} from room ${roomId}`);
        const room = rooms.get(roomId);
        if (room) {
            room.removeSelectedSong(songId);
            io.to(roomId).emit("songs-updated", { songs: room.selectedSongs });
            console.log(`Room ${roomId} now has ${room.selectedSongs.length} song(s)`);
        }
    });

    socket.on("playback-command", ({ roomId, command, data }) => {
        console.log(`Playback command received - Room: ${roomId}, Command: ${command}`);
        if (command === "status") {
            console.log("Current playback status:", {
                isPlaying: data.isPlaying,
                track: data.currentTrack?.name,
                volume: data.volume,
            });
        }

        // Broadcast command to other clients
        socket.to(roomId).emit("playback-update", { command, data });

        // For status updates, broadcast to all clients including sender
        if (command === "status") {
            io.to(roomId).emit("playback-status", data);
        }
    });

    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        if (currentRoom) {
            leaveRoom(socket, currentRoom);
        }
    });
});

app.get("/api/rooms/:roomId/status", (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (room) {
        console.log(`Status request for room ${req.params.roomId}:`, {
            clientCount: room.clientCount,
            hasSpotifyToken: !!room.spotifyToken,
            selectedSongsCount: room.selectedSongs.length,
        });
        res.json({
            clientCount: room.clientCount,
            hasSpotifyToken: !!room.spotifyToken,
            selectedSongsCount: room.selectedSongs.length,
        });
    } else {
        console.log(`Status request for non-existent room ${req.params.roomId}`);
        res.status(404).json({ error: "Room not found" });
    }
});

function leaveRoom(socket, roomId) {
    console.log(`Client ${socket.id} leaving room ${roomId}`);
    const room = rooms.get(roomId);
    if (room) {
        room.removeClient(socket.id);
        socket.leave(roomId);
        console.log(`Room ${roomId} now has ${room.clientCount} client(s)`);

        if (room.clientCount === 0) {
            setTimeout(() => {
                const room = rooms.get(roomId);
                if (room && room.clientCount === 0) {
                    room.reset();
                    console.log(`Room ${roomId} has been reset due to inactivity`);
                }
            }, 5000);
        }
    }
}

http.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
