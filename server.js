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
        this.mobileClient = null;
        this.desktopClient = null;
        this.lastActivity = Date.now();
        this.spotifyToken = null;
        this.selectedSongs = [];
    }

    setMobileClient(socketId) {
        this.mobileClient = socketId;
        this.lastActivity = Date.now();
    }

    setDesktopClient(socketId) {
        this.desktopClient = socketId;
        this.lastActivity = Date.now();
    }

    removeMobileClient(socketId) {
        if (this.mobileClient === socketId) {
            this.mobileClient = null;
        }
        this.lastActivity = Date.now();
    }

    removeDesktopClient(socketId) {
        if (this.desktopClient === socketId) {
            this.desktopClient = null;
        }
        this.lastActivity = Date.now();
    }

    setSpotifyToken(token) {
        this.spotifyToken = token;
    }

    updateSelectedSongs(songs) {
        this.selectedSongs = songs;
    }

    isMobileClient(socketId) {
        return this.mobileClient === socketId;
    }

    isDesktopClient(socketId) {
        return this.desktopClient === socketId;
    }

    hasClient(socketId) {
        return this.mobileClient === socketId || this.desktopClient === socketId;
    }

    reset() {
        this.spotifyToken = null;
        this.selectedSongs = [];
        this.lastActivity = Date.now();
    }

    get isComplete() {
        return this.mobileClient && this.desktopClient;
    }
}

const rooms = new Map();
const pendingAssignments = new Map();

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    let currentRoom = null;

    socket.on("join-room", (roomId) => {
        console.log(`Client ${socket.id} requesting to join room: ${roomId}`);

        // Store the room ID temporarily
        pendingAssignments.set(socket.id, {
            roomId,
            assigned: false,
        });

        // Request client type
        socket.emit("get-client-type");
    });

    socket.on("client-type-response", (clientType) => {
        console.log(`Received client type for ${socket.id}: ${clientType}`);

        const pending = pendingAssignments.get(socket.id);
        if (!pending || pending.assigned) return;

        const roomId = pending.roomId;

        if (currentRoom) {
            console.log(`Client ${socket.id} leaving current room: ${currentRoom}`);
            leaveRoom(socket, currentRoom, clientType);
        }

        currentRoom = roomId;
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            console.log(`Creating new room: ${roomId}`);
            rooms.set(roomId, new Room());
        }

        const room = rooms.get(roomId);
        if (clientType === "mobile") {
            room.setMobileClient(socket.id);
        } else {
            room.setDesktopClient(socket.id);
        }

        pending.assigned = true;

        // Send current state to the newly connected client
        socket.emit("initial-state", {
            spotifyToken: room.spotifyToken,
            selectedSongs: room.selectedSongs,
        });

        console.log(`Room ${roomId} status - Mobile: ${room.mobileClient}, Desktop: ${room.desktopClient}`);
    });

    socket.on("spotify-token", ({ roomId, token }) => {
        console.log(`Received Spotify token for room ${roomId}`);
        const room = rooms.get(roomId);
        if (room) {
            room.setSpotifyToken(token);
            io.to(roomId).emit("spotify-token-updated", { token });
        }
    });

    socket.on("update-songs", ({ roomId, songs }) => {
        console.log(`Updating songs for room ${roomId}`);
        const room = rooms.get(roomId);
        if (room && room.isMobileClient(socket.id)) {
            room.updateSelectedSongs(songs);
            io.to(roomId).emit("songs-updated", { songs: room.selectedSongs });
        }
    });

    socket.on("start-growth", ({ roomId, songs, growthTime, distributions }) => {
        console.log(`Received growth start request for room ${roomId}`);
        const room = rooms.get(roomId);
        if (room && room.isMobileClient(socket.id)) {
            // Send the growth data to all clients in the room
            io.to(roomId).emit("growth-started", {
                songs,
                growthTime,
                distributions,
            });
        }
    });

    socket.on("update-volume", ({ roomId, volume }) => {
        const room = rooms.get(roomId);
        if (room && room.isMobileClient(socket.id)) {
            io.to(roomId).emit("volume-updated", { volume });
        }
    });

    socket.on("toggle-playback", ({ roomId }) => {
        console.log(`Received playback toggle request for room ${roomId}`);
        const room = rooms.get(roomId);
        if (room && room.isMobileClient(socket.id)) {
            io.to(roomId).emit("toggle-playback");
        }
    });

    socket.on("next-song", ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.isMobileClient(socket.id)) {
            io.to(roomId).emit("next-song");
        }
    });

    socket.on("previous-song", ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.isMobileClient(socket.id)) {
            io.to(roomId).emit("previous-song");
        }
    });

    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        pendingAssignments.delete(socket.id);

        if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
                const isMobile = room.isMobileClient(socket.id);
                leaveRoom(socket, currentRoom, isMobile ? "mobile" : "desktop");

                // If it's a desktop client, ensure we clean up Spotify tokens
                if (!isMobile) {
                    room.spotifyToken = null;
                    console.log(`Cleared Spotify token for room ${currentRoom}`);
                }
            }
        }
    });
});

function leaveRoom(socket, roomId, clientType) {
    console.log(`Client ${socket.id} leaving room ${roomId}`);
    const room = rooms.get(roomId);
    if (room) {
        if (clientType === "mobile") {
            room.removeMobileClient(socket.id);
            if (room.desktopClient) {
                io.to(room.desktopClient).emit("mobile-disconnected");
            }
        } else {
            room.removeDesktopClient(socket.id);
            // Clear Spotify token when desktop leaves
            room.spotifyToken = null;
            if (room.mobileClient) {
                io.to(room.mobileClient).emit("desktop-disconnected");
            }
        }

        socket.leave(roomId);
        console.log(`Room ${roomId} status after leave - Mobile: ${room.mobileClient}, Desktop: ${room.desktopClient}`);

        // If room is empty, clean it up after a delay
        if (!room.mobileClient && !room.desktopClient) {
            setTimeout(() => {
                const currentRoom = rooms.get(roomId);
                if (currentRoom && !currentRoom.mobileClient && !currentRoom.desktopClient) {
                    rooms.delete(roomId); // Remove the room completely
                    console.log(`Room ${roomId} has been deleted due to inactivity`);
                }
            }, 5000);
        }
    }
}

app.get("/api/rooms/:roomId/status", (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (room) {
        console.log(`Status request for room ${req.params.roomId}:`, {
            hasDesktop: !!room.desktopClient,
            hasMobile: !!room.mobileClient,
            hasSpotifyToken: !!room.spotifyToken,
            selectedSongsCount: room.selectedSongs.length,
        });
        res.json({
            hasDesktop: !!room.desktopClient,
            hasMobile: !!room.mobileClient,
            hasSpotifyToken: !!room.spotifyToken,
            selectedSongsCount: room.selectedSongs.length,
        });
    } else {
        console.log(`Status request for non-existent room ${req.params.roomId}`);
        res.status(404).json({ error: "Room not found" });
    }
});

http.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
