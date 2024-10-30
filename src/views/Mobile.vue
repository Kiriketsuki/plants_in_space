<template>
    <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold mb-4">Music Control (Room: {{ id }})</h2>

            <!-- Connection Status -->
            <div class="mb-4 space-y-2">
                <div class="p-3 bg-gray-50 rounded text-sm">
                    <p>
                        Connection Status:
                        <span
                            :class="{
                                'text-green-600': connectionStatus === 'Connected',
                                'text-red-600': connectionStatus === 'Disconnected',
                                'text-yellow-600': connectionStatus === 'Connecting',
                            }"
                            >{{ connectionStatus }}</span
                        >
                    </p>
                    <p>Socket ID: {{ socketId || "Not connected" }}</p>
                    <p>Room ID: {{ id }}</p>
                </div>

                <div
                    v-if="error"
                    class="p-3 bg-red-50 text-red-700 rounded">
                    {{ error }}
                </div>

                <!-- Connection Actions -->
                <div class="flex space-x-2">
                    <button
                        @click="reconnect"
                        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Reconnect
                    </button>
                </div>
            </div>

            <!-- Spotify Login -->
            <div
                v-if="!spotifyToken"
                class="mb-6">
                <button
                    @click="loginToSpotify"
                    class="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors">
                    Login with Spotify
                </button>
            </div>

            <!-- Song Selection Interface -->
            <div
                v-if="spotifyToken"
                class="space-y-6">
                <!-- Search Box -->
                <div>
                    <label
                        for="search"
                        class="block text-sm font-medium text-gray-700 mb-1">
                        Search Songs
                    </label>
                    <input
                        id="search"
                        v-model="searchQuery"
                        @input="debounceSearch"
                        type="text"
                        placeholder="Enter song or artist name..."
                        class="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <!-- Search Results -->
                <div v-if="searchResults.length > 0">
                    <h3 class="text-lg font-semibold mb-2">Search Results</h3>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        <div
                            v-for="track in searchResults"
                            :key="track.id"
                            class="flex items-center justify-between p-2 hover:bg-gray-50 rounded border">
                            <div class="flex items-center space-x-3">
                                <img
                                    :src="track.album.images[track.album.images.length - 1]?.url"
                                    class="w-10 h-10 object-cover rounded"
                                    alt="Album art" />
                                <div>
                                    <p class="font-medium">{{ track.name }}</p>
                                    <p class="text-sm text-gray-600">
                                        {{ track.artists.map((a) => a.name).join(", ") }}
                                    </p>
                                </div>
                            </div>
                            <button
                                @click="selectSong(track)"
                                :disabled="selectedSongs.length >= 5 || isSelected(track.id)"
                                class="px-3 py-1 bg-green-500 text-white rounded-md disabled:bg-gray-300 hover:bg-green-600 transition-colors">
                                {{ isSelected(track.id) ? "Selected" : "Select" }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Selected Songs -->
                <div v-if="selectedSongs.length > 0">
                    <h3 class="text-lg font-semibold mb-2">Selected Songs ({{ selectedSongs.length }}/5)</h3>
                    <div class="space-y-2">
                        <div
                            v-for="song in selectedSongs"
                            :key="song.id"
                            class="flex flex-col p-3 bg-gray-50 rounded border">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <img
                                        :src="song.album.images[song.album.images.length - 1]?.url"
                                        class="w-12 h-12 object-cover rounded"
                                        alt="Album art" />
                                    <div>
                                        <p class="font-medium">{{ song.name }}</p>
                                        <p class="text-sm text-gray-600">
                                            {{ song.artists.map((a) => a.name).join(", ") }}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    @click="removeSong(song.id)"
                                    class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                                    Remove
                                </button>
                            </div>
                            <!-- Distribution slider -->
                            <div
                                v-if="selectedSongs.length > 1"
                                class="mt-2">
                                <div>
                                    <label class="text-sm text-gray-600">Distribution: </label>
                                    <input
                                        type="number"
                                        class="text-sm text-gray-600 text-center"
                                        v-model.number="songDistributions[song.id]"
                                        min="0"
                                        max="100"
                                        step="1" />
                                    <label class="text-sm text-gray-600"> %</label>
                                </div>
                                <label class="text-sm text-gray-600">
                                    Total Duration:
                                    {{ Math.floor((songDistributions[song.id] * growthTime) / 100) }}s {{ (((songDistributions[song.id] * growthTime) % 100) * 10).toFixed(0) }}ms
                                </label>
                                <input
                                    type="range"
                                    v-model.number="songDistributions[song.id]"
                                    @input="updateDistributions($event, song.id)"
                                    min="0"
                                    max="100"
                                    step="1"
                                    class="w-full" />
                            </div>
                        </div>
                    </div>
                    <!-- Distribution Total Warning -->
                    <div
                        v-if="selectedSongs.length > 1"
                        class="mt-2 text-sm"
                        :class="{ 'text-red-500': !isDistributionValid, 'text-green-500': isDistributionValid }">
                        Total Distribution: {{ totalDistribution }}% (Must equal 100%)
                    </div>
                </div>

                <!-- Growth Time Selection -->
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Plant Growth Time</label>
                    <select
                        v-model="growthTime"
                        class="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="120">2 minutes</option>
                        <option value="150">2.5 minutes</option>
                        <option value="180">3 minutes</option>
                        <option value="210">3.5 minutes</option>
                        <option value="240">4 minutes</option>
                    </select>
                </div>

                <div class="mt-6">
                    <button
                        @click="startGrowth"
                        :disabled="!canStart"
                        class="w-full py-3 bg-green-500 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-colors">
                        Start Plant Growth
                    </button>
                </div>

                <!-- Playback Controls -->
                <div
                    v-if="selectedSongs.length > 0"
                    class="mt-8 bg-gray-800 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Playback Controls</h3>

                    <!-- Controls -->
                    <div class="flex flex-col space-y-4">
                        <!-- Main Controls -->
                        <div class="flex justify-center items-center space-x-6">
                            <button
                                @click="previousSong"
                                class="p-2 text-white hover:text-green-400 transition-colors">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-8 w-8"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>

                            <button
                                @click="togglePlayback"
                                class="p-3 bg-green-500 rounded-full text-white hover:bg-green-600 transition-colors">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-8 w-8"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                            </button>

                            <button
                                @click="nextSong"
                                class="p-2 text-white hover:text-green-400 transition-colors">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-8 w-8"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <!-- Volume Control -->
                        <div class="flex items-center space-x-4">
                            <button
                                @click="toggleMute"
                                class="p-2 text-white hover:text-green-400 transition-colors">
                                <svg
                                    v-if="musicVolume > 0"
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                                <svg
                                    v-else
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            </button>

                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                v-model="musicVolume"
                                class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />

                            <span class="text-white text-sm w-8">
                                {{ musicVolume }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Loading State -->
                <div
                    v-if="isLoading"
                    class="text-center py-4">
                    <p class="text-gray-600">Searching...</p>
                </div>

                <!-- No Results -->
                <div
                    v-if="searchQuery && !isLoading && searchResults.length === 0"
                    class="text-center py-4">
                    <p class="text-gray-600">No songs found</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, watch, computed } from "vue";
    import { io } from "socket.io-client";
    import { SPOTIFY_CLIENT_ID } from "../../secrets.js";
    import { useRoute, useRouter } from "vue-router";

    const props = defineProps(["id"]);
    const route = useRoute();
    const router = useRouter();
    const error = ref("");
    const connectionStatus = ref("Disconnected");
    const socketId = ref(null);
    const spotifyToken = ref(null);
    const searchQuery = ref("");
    const searchResults = ref([]);
    const selectedSongs = ref([]);
    const isLoading = ref(false);
    const musicVolume = ref(50);
    const previousVolume = ref(50);

    const growthTime = ref("120");
    const songDistributions = ref({});
    const isDistributionValid = ref(false);

    let socket;
    let searchTimeout;

    // Computed properties
    const totalDistribution = computed(() => {
        return Object.values(songDistributions.value).reduce((sum, value) => sum + value, 0);
    });

    const canStart = computed(() => {
        return selectedSongs.value.length > 0 && selectedSongs.value.length <= 5 && (selectedSongs.value.length === 1 || isDistributionValid.value);
    });
    function getRedirectUri() {
        const protocol = "http://";
        const hostname = window.location.hostname;
        const port = "5173";
        return `${protocol}${hostname}:${port}/mobile/redirect`;
    }

    const SPOTIFY_REDIRECT_URI = getRedirectUri();
    const SPOTIFY_SCOPES = ["streaming", "user-read-email", "user-read-private"].join(" ");

    function initializeSocket() {
        const url = `http://${window.location.hostname}:3000`;
        // const url = "wss://us-central1-plants-in-space.cloudfunctions.net/app/";
        // const url = "https://plants-in-space-socket.onrender.com";
        connectionStatus.value = "Connecting";

        if (socket) {
            socket.disconnect();
        }

        socket = io(url, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            timeout: 20000,
        });

        socket.on("connect", () => {
            connectionStatus.value = "Connected";
            socketId.value = socket.id;
            socket.emit("join-room", props.id);
        });

        socket.on("connect_error", (err) => {
            error.value = `Connection error: ${err.message}`;
            connectionStatus.value = "Disconnected";
            socketId.value = null;
            resetState();
        });

        socket.on("disconnect", () => {
            connectionStatus.value = "Disconnected";
            socketId.value = null;
            resetState();
        });

        socket.on("error", (err) => {
            error.value = `Socket error: ${err.message}`;
        });

        socket.on("get-client-type", () => {
            socket.emit("client-type-response", "mobile");
        });

        socket.on("desktop-disconnected", () => {
            resetState();
            error.value = "Desktop client disconnected. Please wait for reconnection.";
        });

        return socket;
    }

    function reconnect() {
        error.value = "";
        resetState();
        socket = initializeSocket();
    }

    function loginToSpotify() {
        try {
            const state = Math.random().toString(36).substring(7);
            localStorage.setItem("spotify_auth_state", state);
            localStorage.setItem("spotify_room_id", props.id);

            const authUrlParams = new URLSearchParams({
                response_type: "token",
                client_id: SPOTIFY_CLIENT_ID,
                scope: SPOTIFY_SCOPES,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                state: state,
                show_dialog: true,
            });

            const authUrl = `https://accounts.spotify.com/authorize?${authUrlParams.toString()}`;
            window.location.href = authUrl;
        } catch (err) {
            console.error("Login error:", err);
            error.value = `Failed to initialize Spotify login: ${err.message}`;
        }
    }

    async function verifyToken(token) {
        try {
            const response = await fetch("https://api.spotify.com/v1/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Spotify user verified:", data.id);
        } catch (err) {
            console.error("Token verification failed:", err);
            error.value = "Failed to verify Spotify access";
            spotifyToken.value = null;
        }
    }

    async function searchSpotify() {
        if (!searchQuery.value || !spotifyToken.value) return;

        isLoading.value = true;
        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery.value)}&type=track&limit=10`, {
                headers: {
                    Authorization: `Bearer ${spotifyToken.value}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            searchResults.value = data.tracks.items;
        } catch (err) {
            console.error("Search error:", err);
            error.value = "Failed to search Spotify";
        } finally {
            isLoading.value = false;
        }
    }

    function debounceSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(searchSpotify, 300);
    }

    function updateDistributions(event, changedSongId) {
        validateDistribution();
    }

    function validateDistribution() {
        const total = totalDistribution.value;
        isDistributionValid.value = total === 100;
    }

    function selectSong(track) {
        if (selectedSongs.value.length < 5 && !isSelected(track.id)) {
            const newSelectedSongs = [...selectedSongs.value, track];
            selectedSongs.value = newSelectedSongs;

            // Set even distribution for all songs
            const evenShare = Math.floor(1000 / newSelectedSongs.length) / 10; // Using 1000 for one decimal precision
            songDistributions.value = newSelectedSongs.reduce((acc, song) => {
                acc[song.id] = evenShare;
                return acc;
            }, {});

            // Adjust for rounding errors
            const total = Object.values(songDistributions.value).reduce((sum, val) => sum + val, 0);
            if (Math.abs(total - 100) > 0.01) {
                const roundingError = (100 - total) / newSelectedSongs.length;
                songDistributions.value = newSelectedSongs.reduce((acc, song) => {
                    acc[song.id] = Math.round((evenShare + roundingError) * 10) / 10;
                    return acc;
                }, {});
            }

            validateDistribution();
        }
    }

    function removeSong(songId) {
        const remainingSongs = selectedSongs.value.filter((song) => song.id !== songId);
        selectedSongs.value = remainingSongs;

        if (remainingSongs.length > 1) {
            const evenShare = Math.floor(1000 / remainingSongs.length) / 10;
            songDistributions.value = remainingSongs.reduce((acc, song) => {
                acc[song.id] = evenShare;
                return acc;
            }, {});

            // Adjust for rounding errors
            const total = Object.values(songDistributions.value).reduce((sum, val) => sum + val, 0);
            if (Math.abs(total - 100) > 0.01) {
                const roundingError = (100 - total) / remainingSongs.length;
                songDistributions.value = remainingSongs.reduce((acc, song) => {
                    acc[song.id] = Math.round((evenShare + roundingError) * 10) / 10;
                    return acc;
                }, {});
            }
        } else if (remainingSongs.length === 1) {
            songDistributions.value = { [remainingSongs[0].id]: 100 };
        } else {
            songDistributions.value = {};
        }

        validateDistribution();
    }

    function isSelected(trackId) {
        return selectedSongs.value.some((song) => song.id === trackId);
    }

    function startGrowth() {
        if (socket && socket.connected) {
            socket.emit("start-growth", {
                roomId: props.id,
                songs: selectedSongs.value,
                growthTime: parseInt(growthTime.value),
                distributions: songDistributions.value,
            });
        } else {
            error.value = "Not connected to server. Please try reconnecting.";
        }
    }

    // Playback control functions
    function togglePlayback() {
        if (socket && socket.connected) {
            console.log("Toggling playback");
            socket.emit("toggle-playback", { roomId: props.id });
        }
    }

    function nextSong() {
        if (socket && socket.connected) {
            socket.emit("next-song", { roomId: props.id });
        }
    }

    function previousSong() {
        if (socket && socket.connected) {
            socket.emit("previous-song", { roomId: props.id });
        }
    }

    function toggleMute() {
        if (musicVolume.value > 0) {
            previousVolume.value = musicVolume.value;
            musicVolume.value = 0;
        } else {
            musicVolume.value = previousVolume.value;
        }
    }

    function resetState() {
        searchResults.value = [];
        searchQuery.value = "";
        error.value = "";
        spotifyToken.value = null;
        socketId.value = null;
        selectedSongs.value = [];
        musicVolume.value = 50;
        previousVolume.value = 50;
        growthTime.value = "120";
        songDistributions.value = {};
        isDistributionValid.value = false;
    }

    // Watchers for state changes
    watch(selectedSongs, (newSongs) => {
        if (socket && socket.connected) {
            socket.emit("update-songs", {
                roomId: props.id,
                songs: newSongs,
                distributions: songDistributions.value,
            });
        }

        // Reset distributions when songs change
        if (newSongs.length === 1) {
            songDistributions.value = { [newSongs[0].id]: 100 };
            isDistributionValid.value = true;
        } else if (newSongs.length > 1) {
            // Initialize even distribution
            const evenShare = Math.floor(100 / newSongs.length);
            const remainder = 100 - evenShare * newSongs.length;
            songDistributions.value = newSongs.reduce((acc, song, index) => {
                acc[song.id] = evenShare + (index === 0 ? remainder : 0);
                return acc;
            }, {});
            validateDistribution();
        } else {
            songDistributions.value = {};
            isDistributionValid.value = false;
        }
    });

    watch(musicVolume, (newVolume) => {
        if (socket && socket.connected) {
            socket.emit("update-volume", {
                roomId: props.id,
                volume: newVolume,
            });
        }
    });

    onMounted(() => {
        resetState();
        socket = initializeSocket();

        // Handle Spotify token from redirect
        const token = route.query.spotifyToken;
        if (token) {
            console.log("Received Spotify token from redirect");
            spotifyToken.value = token;
            socket.emit("spotify-token", { roomId: props.id, token });
            router.replace({ path: route.path });
            verifyToken(token);
        }
    });

    onUnmounted(() => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        resetState();
    });
</script>

<style scoped>
    input[type="range"] {
        @apply bg-gray-600;
        height: 4px;
        border-radius: 2px;
    }

    input[type="range"]::-webkit-slider-thumb {
        @apply bg-green-500;
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
    }

    input[type="range"]::-moz-range-thumb {
        @apply bg-green-500;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
    }

    /* Hide the arrows in number inputs for Chrome, Safari, Edge, and Opera */
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Hide the arrows in number inputs for Firefox */
    input[type="number"] {
        -moz-appearance: textfield;
    }
</style>
