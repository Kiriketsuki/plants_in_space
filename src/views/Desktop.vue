<template>
    <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold mb-4">Main Display (Room: {{ id }})</h2>
            <div class="mb-4 text-sm">
                <p>Connection Status: {{ connectionStatus }}</p>
                <p class="text-xs text-gray-500">Server: {{ serverUrl }}</p>
            </div>
            <div class="w-full min-h-[200px] p-4 border rounded-md bg-gray-50">
                {{ text }}
            </div>
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

    const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
        console.log("Connected to server:", SOCKET_URL);
        connectionStatus.value = "Connected";
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
</script>
