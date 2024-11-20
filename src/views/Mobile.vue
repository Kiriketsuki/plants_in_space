<template>
    <div class="min-h-screen bg-back p-4">
        <div class="max-w-md mx-auto bg-less rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold mb-4 text-white">Music Control (Room: {{ id }})</h2>

            <!-- Connection Status -->
            <div class="mb-4 space-y-2">
                <div class="p-3 bg-lesser rounded text-sm text-white">
                    <p>
                        Connection Status:
                        <span
                            :class="{
                                'text-green-400': connectionStatus === 'Connected',
                                'text-red-400': connectionStatus === 'Disconnected',
                                'text-yellow-400': connectionStatus === 'Connecting',
                            }"
                            >{{ connectionStatus }}</span
                        >
                    </p>
                    <p>Socket ID: {{ socketId || "Not connected" }}</p>
                    <p>Room ID: {{ id }}</p>
                </div>

                <div
                    v-if="error"
                    class="p-3 bg-red-900 text-red-300 rounded">
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

            <!-- File Upload Interface -->
            <div class="space-y-6">
                <!-- Search Box -->
                <div class="space-y-6 start-hide">
                    <div class="relative">
                        <label
                            for="search"
                            class="block text-sm font-medium text-gray-300 mb-1">
                            Search Songs
                        </label>
                        <input
                            id="search"
                            v-model="searchQuery"
                            @input="debouncedSearch"
                            type="text"
                            placeholder="Search songs on Spotify..."
                            class="w-full p-2 bg-lesser border border-gray-600 rounded-md text-gray-500 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500" />

                        <!-- Search Results Dropdown -->
                        <div
                            v-if="searchResults.length > 0"
                            class="absolute z-10 w-full mt-1 bg-back border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            <div
                                v-for="track in searchResults"
                                :key="track.id"
                                @click="selectTrack(track)"
                                class="p-2 hover:bg-gray-600 cursor-pointer flex items-center space-x-2">
                                <img
                                    :src="track.album.images[2]?.url"
                                    class="w-10 h-10 rounded"
                                    alt="Album art" />
                                <div class="flex-1">
                                    <div class="font-medium text-white">{{ track.name }}</div>
                                    <div class="text-sm text-gray-400">{{ track.artists[0].name }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Selected Songs -->
                <div v-if="selectedSongs.length > 0">
                    <h3 class="text-lg font-semibold mb-2 text-white">Selected Songs ({{ selectedSongs.length }}/5)</h3>
                    <div class="space-y-2">
                        <div
                            v-for="song in selectedSongs"
                            :key="song.id"
                            class="flex flex-col p-3 bg-lesser rounded border border-gray-600">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex-1">
                                    <!-- Song Name Input -->
                                    <input
                                        v-model="song.name"
                                        @input="debouncedGetTempo(song)"
                                        type="text"
                                        class="w-full p-2 bg-gray-600 border border-gray-500 rounded-md mb-2 text-white start-disable"
                                        placeholder="Song name" />
                                    <!-- Tempo Input -->
                                    <div class="flex items-center space-x-2">
                                        <label class="text-sm text-gray-300">Tempo:</label>
                                        <input
                                            v-model.number="song.tempo"
                                            type="number"
                                            min="1"
                                            max="300"
                                            class="w-20 p-2 bg-gray-600 border border-gray-500 rounded-md text-white start-disable"
                                            placeholder="100" />
                                    </div>
                                </div>
                                <button
                                    @click="removeSong(song.id)"
                                    class="start-hide ml-2 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                                    Remove
                                </button>
                            </div>

                            <!-- Distribution slider -->
                            <div
                                v-if="selectedSongs.length > 1"
                                class="mt-2 start-hide">
                                <div>
                                    <label class="text-sm text-gray-300">Distribution: </label>
                                    <input
                                        type="number"
                                        class="text-sm bg-gray-600 text-white text-center border border-gray-500 rounded"
                                        v-model.number="songDistributions[song.id]"
                                        min="0"
                                        max="100"
                                        step="1"
                                        @input="validateDistribution" />
                                    <label class="text-sm text-gray-300"> %</label>
                                </div>
                                <label class="text-sm text-gray-300">
                                    Total Duration:
                                    {{ Math.floor((songDistributions[song.id] * growthTime) / 100) }}s {{ (((songDistributions[song.id] * growthTime) % 100) * 10).toFixed(0) }}ms
                                </label>
                                <input
                                    type="range"
                                    :value="songDistributions[song.id]"
                                    @change="updateDistributions($event, song.id)"
                                    min="0"
                                    max="100"
                                    step="1"
                                    class="w-full bg-gray-600" />
                            </div>
                        </div>
                    </div>
                    <!-- Distribution Total Warning -->
                    <div
                        v-if="selectedSongs.length > 1"
                        class="mt-2 text-sm start-hide"
                        :class="{ 'text-red-400': !isDistributionValid, 'text-green-400': isDistributionValid }">
                        Total Distribution: {{ totalDistribution }}% (Must equal 100%)
                    </div>
                </div>

                <!-- Growth Time Selection -->
                <div class="mt-4 start-hide">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Select Plant Growth Time</label>
                    <select
                        v-model="growthTime"
                        class="w-full p-2 bg-lesser border border-gray-600 rounded-md text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="120">2 minutes</option>
                        <option value="150">2.5 minutes</option>
                        <option value="180">3 minutes</option>
                        <option value="210">3.5 minutes</option>
                        <option value="240">4 minutes</option>
                    </select>
                </div>

                <div class="mt-6 start-hide">
                    <button
                        @click="startGrowth"
                        :disabled="!canStart"
                        class="w-full py-3 bg-green-500 text-white rounded-lg font-semibold disabled:bg-lesser disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-green-600 transition-colors">
                        Start Plant Growth
                    </button>
                </div>

                <!-- Playback Controls -->
                <div
                    v-if="selectedSongs.length > 0"
                    class="mt-8 bg-lesser rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Playback Controls</h3>
                    <!-- Controls -->
                    <div class="flex flex-col space-y-4">
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
                        <!-- Gyroscope Toggle -->
                        <div
                            v-if="isDeviceOrientation"
                            class="flex items-center justify-between text-white text-sm mb-2">
                            <span>Use Gyroscope Control</span>
                            <button
                                @click="useGyroscope = !useGyroscope"
                                class="px-3 py-1 rounded"
                                :class="useGyroscope ? 'bg-green-500' : 'bg-gray-600'">
                                {{ useGyroscope ? "Enabled" : "Disabled" }}
                            </button>
                        </div>

                        <!-- Optional calibration message -->
                        <div
                            v-if="useGyroscope"
                            class="text-gray-400 text-xs mb-2">
                            Hold your device flat and tilt left or right to control the music direction
                        </div>

                        <!-- Direction Control -->
                        <div class="flex flex-col space-y-2">
                            <div class="flex justify-between text-white text-sm">
                                <span>Direction</span>
                                <div class="flex space-x-2">
                                    <span>L: {{ leftVolume }}%</span>
                                    <span>R: {{ rightVolume }}%</span>
                                </div>
                            </div>
                            <div class="flex items-center space-x-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    v-model="musicDirection"
                                    @input="updateMusicDirection"
                                    class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, watch, computed } from "vue";
    import { io } from "socket.io-client";
    import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "../../secrets";

    const props = defineProps(["id"]);
    const error = ref("");
    const connectionStatus = ref("Disconnected");
    const socketId = ref(null);
    const selectedSongs = ref([]);
    const musicVolume = ref(50);
    const previousVolume = ref(50);
    const fileInput = ref(null);

    const searchQuery = ref("");
    const searchResults = ref([]);
    let searchDebounceTimeout;
    let spotifyAccessToken = ref(null);

    const growthTime = ref("120");
    const songDistributions = ref({});
    const isDistributionValid = ref(false);

    const musicDirection = ref(50);
    const leftVolume = computed(() => 100 - musicDirection.value);
    const rightVolume = computed(() => musicDirection.value);

    const isDeviceOrientation = ref(false);
    const isGyroscopeEnabled = ref(false);
    const useGyroscope = ref(false);

    let debounceTimeout;

    const CHUNK_SIZE = 16384;

    let socket;

    // Computed properties
    const totalDistribution = computed(() => {
        return Object.values(songDistributions.value).reduce((sum, value) => sum + value, 0);
    });

    const canStart = computed(() => {
        return selectedSongs.value.length > 0 && selectedSongs.value.length <= 5 && (selectedSongs.value.length === 1 || isDistributionValid.value) && selectedSongs.value.every((song) => song.name && song.tempo);
    });

    // Socket Functions
    function initializeSocket() {
        const url = "https://plants-socket-24702956633.asia-southeast1.run.app";

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
            socket.emit("mobile-joined-room", props.id);
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

        socket.on("file-received", ({ songId }) => {
            const song = selectedSongs.value.find((s) => s.id === songId);
            if (song) {
                song.uploaded = true;
            }
        });

        socket.on("viewPlant", ({ plantId }) => {
            console.log("Viewing plant", plantId);
            window.location.href = `/hologram/${props.id}`;
        });

        return socket;
    }

    function reconnect() {
        window.location.reload();
    }

    // File Functions
    async function uploadSongFile(song) {
        return new Promise((resolve, reject) => {
            const file = song.file;
            let offset = 0;

            // Send file metadata first
            socket.emit("file-meta", {
                roomId: props.id,
                songId: song.id,
                filename: file.name,
                fileSize: file.size,
                fileType: file.type,
            });

            function readAndUploadChunk() {
                const reader = new FileReader();
                const chunk = file.slice(offset, offset + CHUNK_SIZE);

                reader.onload = function (e) {
                    const chunkData = e.target.result;

                    socket.emit("file-chunk", {
                        roomId: props.id,
                        songId: song.id,
                        data: chunkData,
                        offset: offset,
                        final: offset + chunk.size >= file.size,
                    });

                    offset += chunk.size;

                    if (offset < file.size) {
                        readAndUploadChunk();
                    } else {
                        song.uploaded = true;
                        resolve();
                    }
                };

                reader.onerror = function (err) {
                    reject(err);
                };

                reader.readAsArrayBuffer(chunk);
            }

            readAndUploadChunk();
        });
    }

    // Spotify Search and Download
    async function getSpotifyAccessToken() {
        try {
            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " + btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET),
                },
                body: "grant_type=client_credentials",
            });

            if (!response.ok) throw new Error("Failed to get access token");

            const data = await response.json();
            spotifyAccessToken.value = data.access_token;
            return data.access_token;
        } catch (error) {
            console.error("Error getting Spotify access token:", error);
            error.value = "Failed to connect to Spotify";
            return null;
        }
    }

    // Debounced search function
    function debouncedSearch() {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            if (searchQuery.value.length >= 2) {
                searchSpotify();
            } else {
                searchResults.value = [];
            }
        }, 300);
    }

    // Spotify search function
    async function searchSpotify() {
        try {
            if (!spotifyAccessToken.value) {
                await getSpotifyAccessToken();
            }

            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery.value)}&type=track&limit=5`, {
                headers: {
                    Authorization: `Bearer ${spotifyAccessToken.value}`,
                },
            });

            if (response.status === 401) {
                // Token expired, get new token and retry
                await getSpotifyAccessToken();
                return searchSpotify();
            }

            if (!response.ok) throw new Error("Search failed");

            const data = await response.json();
            searchResults.value = data.tracks.items;
        } catch (error) {
            console.error("Search error:", error);
            error.value = "Search failed";
            searchResults.value = [];
        }
    }

    // Function to handle track selection
    async function selectTrack(track) {
        // Create new song object
        const newSong = {
            id: Math.random().toString(36).substr(2, 9),
            name: track.name,
            tempo: 100, // We'll get this from audio features
            spotifyId: track.id,
            artist: track.artists[0].name,
            uploaded: false,
        };

        // Get audio features for tempo
        try {
            const response = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
                headers: {
                    Authorization: `Bearer ${spotifyAccessToken.value}`,
                },
            });

            if (response.ok) {
                const features = await response.json();
                newSong.tempo = features.tempo;
            }
        } catch (error) {
            console.error("Error getting audio features:", error);
        }

        // Add to selected songs
        selectedSongs.value = [...selectedSongs.value, newSong];

        // Initialize distributions after adding songs
        initializeDistributions(selectedSongs.value);

        // Emit the spotify track selection to the server
        socket.emit("spotify-track-selected", {
            roomId: props.id,
            songId: newSong.id,
            spotifyId: track.id,
            trackName: track.name,
            artistName: track.artists[0].name,
            tempo: newSong.tempo,
        });

        // Clear search
        searchQuery.value = "";
        searchResults.value = [];
    }

    // Song Meta Functions
    function initializeDistributions(songs) {
        if (songs.length === 0) {
            songDistributions.value = {};
            isDistributionValid.value = false;
        } else if (songs.length === 1) {
            songDistributions.value = { [songs[0].id]: 100 };
            isDistributionValid.value = true;
        } else {
            const evenShare = Math.floor(100 / songs.length);
            const remainder = 100 - evenShare * songs.length;

            // Reset distributions
            songDistributions.value = {};

            // Distribute evenly
            songs.forEach((song, index) => {
                songDistributions.value[song.id] = evenShare + (index === 0 ? remainder : 0);
            });

            validateDistribution();
        }
    }

    function updateDistributions(event, changedSongId) {
        const newValue = parseInt(event.target.value);
        const oldValue = songDistributions.value[changedSongId];
        const totalChange = newValue - oldValue;

        const newDistributions = { ...songDistributions.value };
        newDistributions[changedSongId] = newValue;

        const otherSongIds = Object.keys(songDistributions.value).filter((id) => id !== changedSongId);

        if (totalChange > 0) {
            // Handle increase
            let remainingChange = totalChange;
            while (remainingChange > 0) {
                let changeWasMade = false;
                for (const id of otherSongIds) {
                    if (newDistributions[id] > 0 && remainingChange > 0) {
                        newDistributions[id]--;
                        remainingChange--;
                        changeWasMade = true;
                    }
                }
                if (!changeWasMade) break;
            }
        } else if (totalChange < 0) {
            let remainingChange = Math.abs(totalChange);
            while (remainingChange > 0) {
                let changeWasMade = false;
                for (const id of otherSongIds) {
                    if (newDistributions[id] < 100 && remainingChange > 0) {
                        newDistributions[id]++;
                        remainingChange--;
                        changeWasMade = true;
                    }
                }
                if (!changeWasMade) break;
            }
        }

        songDistributions.value = newDistributions;
        validateDistribution();
    }

    function validateDistribution() {
        const total = totalDistribution.value;
        isDistributionValid.value = Math.abs(total - 100) < 0.01;
    }

    async function debouncedGetTempo(song) {
        let name = song.name;
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
            console.log("Getting tempo for:", name);
            getSongTempo(name).then((tempoData) => {
                console.log("Tempo data:", tempoData);
                song.tempo = tempoData.tempo;
                song.name = tempoData.trackName;
            });
        }, 500);
    }

    async function getSongTempo(songName) {
        try {
            const authResponse = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " + btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET),
                },
                body: "grant_type=client_credentials",
            });

            if (!authResponse.ok) {
                throw new Error("Failed to get access token");
            }

            const authData = await authResponse.json();
            const accessToken = authData.access_token;

            const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track&limit=1`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!searchResponse.ok) {
                throw new Error("Failed to search for the song");
            }

            const searchData = await searchResponse.json();

            if (!searchData.tracks.items.length) {
                throw new Error("No tracks found");
            }

            const trackId = searchData.tracks.items[0].id;

            const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!featuresResponse.ok) {
                throw new Error("Failed to get audio features");
            }

            const featuresData = await featuresResponse.json();

            return {
                tempo: featuresData.tempo,
                trackName: searchData.tracks.items[0].name,
            };
        } catch (error) {
            console.error("Error:", error.message);
            return { tempo: 100, trackName: songName };
        }
    }

    function removeSong(songId) {
        const remainingSongs = selectedSongs.value.filter((song) => song.id !== songId);
        selectedSongs.value = remainingSongs;
        initializeDistributions(remainingSongs);
    }

    async function startGrowth() {
        if (!socket || !socket.connected) {
            error.value = "Not connected to server. Please try reconnecting.";
            return;
        }

        validateDistribution();
        if (!isDistributionValid.value && selectedSongs.value.length > 1) {
            error.value = "Distribution must equal 100%";
            return;
        }

        try {
            const localFiles = selectedSongs.value.filter((song) => song.file);
            const spotifyTracks = selectedSongs.value.filter((song) => song.spotifyId);

            for (const song of localFiles) {
                if (!song.uploaded) {
                    await uploadSongFile(song);
                }
            }

            const songData = selectedSongs.value.map((song) => ({
                id: song.id,
                name: song.name,
                tempo: song.tempo,
                ...(song.spotifyId && {
                    spotifyTrack: {
                        spotifyId: song.spotifyId,
                        artistName: song.artist,
                    },
                }),
            }));

            const categorizedSongs = {
                localFiles: songData.filter((song) => !song.spotifyTrack),
                spotifyTracks: songData.filter((song) => song.spotifyTrack),
            };

            socket.emit("start-growth", {
                roomId: props.id,
                songs: categorizedSongs,
                growthTime: parseInt(growthTime.value),
                distributions: songDistributions.value,
            });

            document.querySelectorAll(".start-hide").forEach((el) => (el.style.display = "none"));
            document.querySelectorAll(".start-disable").forEach((el) => (el.disabled = true));
        } catch (err) {
            error.value = "Error preparing songs: " + err.message;
        }
    }

    // Playback control functions
    function toggleMute() {
        if (musicVolume.value > 0) {
            previousVolume.value = musicVolume.value;
            musicVolume.value = 0;
        } else {
            musicVolume.value = previousVolume.value;
        }
    }

    function updateMusicDirection() {
        socket.emit("music-direction-updated", {
            roomId: props.id,
            direction: musicDirection.value,
        });
    }

    // Gyroscope Functions
    function checkDeviceOrientation() {
        return new Promise((resolve) => {
            if (typeof DeviceOrientationEvent !== "undefined") {
                // Check if device orientation permission is needed (iOS 13+)
                if (typeof DeviceOrientationEvent.requestPermission === "function") {
                    isDeviceOrientation.value = true;
                    resolve(true);
                } else {
                    // Android and older iOS devices
                    window.addEventListener("deviceorientation", function handler(event) {
                        window.removeEventListener("deviceorientation", handler);
                        isDeviceOrientation.value = Boolean(event && event.gamma);
                        resolve(Boolean(event && event.gamma));
                    });
                }
            } else {
                isDeviceOrientation.value = false;
                resolve(false);
            }
        });
    }

    async function requestGyroscopePermission() {
        try {
            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                // iOS 13+ devices
                const permission = await DeviceOrientationEvent.requestPermission();
                isGyroscopeEnabled.value = permission === "granted";
                if (permission === "granted") {
                    initializeGyroscope();
                }
            } else {
                // Android and older iOS devices
                isGyroscopeEnabled.value = true;
                initializeGyroscope();
            }
        } catch (error) {
            console.error("Error requesting gyroscope permission:", error);
            isGyroscopeEnabled.value = false;
        }
    }

    function initializeGyroscope() {
        if (!isGyroscopeEnabled.value) return;

        window.addEventListener("deviceorientation", handleOrientation);
    }

    function handleOrientation(event) {
        if (!useGyroscope.value) return;

        // gamma is the left-to-right tilt in degrees
        // When phone is vertical and facing user:
        // - Neutral position: gamma ≈ 0
        // - Tilting left: gamma becomes negative (down to -90)
        // - Tilting right: gamma becomes positive (up to 90)
        const gamma = event.gamma;

        let normalizedValue;
        if (gamma < -90) {
            normalizedValue = 0;
        } else if (gamma > 90) {
            normalizedValue = 100;
        } else {
            normalizedValue = ((gamma + 90) / 180) * 100;
        }

        if (Math.abs(musicDirection.value - normalizedValue) > 1) {
            musicDirection.value = Math.round(normalizedValue);
            updateMusicDirection();
        }
    }

    function resetState() {
        selectedSongs.value = [];
        error.value = "";
        socketId.value = null;
        musicVolume.value = 50;
        previousVolume.value = 50;
        growthTime.value = "120";
        songDistributions.value = {};
        isDistributionValid.value = false;
        leftVolume.value = 50;
        rightVolume.value = 50;
    }

    watch(musicVolume, (newVolume) => {
        if (socket && socket.connected) {
            socket.emit("update-volume", {
                roomId: props.id,
                volume: newVolume,
            });
        }
    });

    onMounted(async () => {
        resetState();
        await getSpotifyAccessToken();
        socket = initializeSocket();

        // Check if device supports orientation
        const hasOrientation = await checkDeviceOrientation();
        if (hasOrientation) {
            await requestGyroscopePermission();
        }
    });

    onUnmounted(() => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        if (isGyroscopeEnabled.value) {
            window.removeEventListener("deviceorientation", handleOrientation);
        }
        clearTimeout(debounceTimeout);
        searchResults.value = [];
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

    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type="number"] {
        -moz-appearance: textfield;
    }
</style>
