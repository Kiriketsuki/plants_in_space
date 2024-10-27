<template>
    <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold mb-4">Mobile Control (Room: {{ id }})</h2>
            <div class="mb-4 text-sm">
                <p>Connection Status: {{ connectionStatus }}</p>
                <p class="text-xs text-gray-500">Server: {{ serverUrl }}</p>
            </div>
            <textarea
                v-model="text"
                @input="updateText"
                class="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter text here..."
                rows="4"></textarea>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted } from "vue";
    import { io } from "socket.io-client";
    import { SOCKET_URL } from "../../config.js";

    const props = defineProps(["id"]);
    const text = ref("");
    const connectionStatus = ref("Disconnected");
    const serverUrl = ref(SOCKET_URL);

    // Create socket with explicit configuration
    const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });

    // Connection event handlers
    socket.on("connect", () => {
        console.log("Connected to server:", SOCKET_URL);
        connectionStatus.value = "Connected";
        // Join room after connection is established
        socket.emit("join-room", props.id);
        console.log("Joined room:", props.id);
    });

    socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        connectionStatus.value = "Error: " + error.message;
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from server");
        connectionStatus.value = "Disconnected";
    });

    onMounted(() => {
        socket.on("initial-state", (state) => {
            console.log("Received initial state:", state);
            text.value = state.text;
        });

        socket.on("text-updated", ({ text: newText }) => {
            console.log("Received text update:", newText);
            text.value = newText;
        });
    });

    onUnmounted(() => {
        console.log("Component unmounting, disconnecting socket");
        socket.disconnect();
    });

    const updateText = () => {
        console.log("Sending text update:", text.value);
        socket.emit("update-text", {
            roomId: props.id,
            text: text.value,
        });
    };
</script>
