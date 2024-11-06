<template>
    <div class="h-screen w-screen absolute top-0 left-0 overflow-x-hidden overflow-y-hidden bg-gray-900 p-4 main z-10">
        <!-- Connection Status -->
        <div class="absolute top-4 right-4 z-50">
            <div class="p-3 bg-gray-800 rounded text-sm text-white space-y-1">
                <p>
                    Status:
                    <span
                        :class="{
                            'text-green-400': connectionStatus === 'Connected',
                            'text-red-400': connectionStatus === 'Disconnected',
                            'text-yellow-400': connectionStatus === 'Connecting',
                        }"
                        >{{ connectionStatus }}</span
                    >
                </p>
                <p>Audio Status: {{ audioStatus }}</p>
                <p
                    v-if="error"
                    class="text-red-400">
                    {{ error }}
                </p>
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex flex-col items-center justify-center min-h-screen">
            <!-- Loading State -->
            <div
                v-if="!mobileJoined"
                class="text-center text-white">
                <h2 class="text-3xl font-bold mb-4">Waiting for Connection...</h2>
                <p class="text-xl text-gray-400">Connect from mobile device using room ID: {{ id }}</p>

                <!-- QR Code -->
                <div class="mt-8 p-8 bg-white rounded-lg">
                    <QRCode
                        :data="mobileUrl"
                        :size="192"
                        class="cursor-pointer"
                        @click="openInNewTab" />
                    <p class="mt-4 text-sm text-gray-600">Scan to connect</p>
                </div>
            </div>

            <!-- Connected State -->
            <div
                v-else
                class="w-full max-w-4xl">
                <div class="bg-gray-800 rounded-lg p-6 space-y-6">
                    <!-- Songs List -->
                    <div>
                        <h2 class="text-2xl font-bold mb-4 text-white">Selected Songs</h2>
                        <div class="space-y-4">
                            <div
                                v-if="!selectedSongs.length"
                                class="text-gray-400 text-center py-4">
                                <template v-if="pendingSpotifyDownloads.length">
                                    <h3 class="text-lg font-medium mb-4">Downloading Tracks...</h3>
                                    <div class="space-y-4 w-full">
                                        <div
                                            v-for="track in pendingSpotifyDownloads"
                                            :key="track.spotifyId"
                                            class="bg-gray-700 rounded-lg p-4 w-full">
                                            <div class="flex w-full justify-between items-start">
                                                <div>
                                                    <h3 class="text-white font-bold m-0 text-start">{{ track.name }}</h3>
                                                    <p class="text-gray-400 m-0">
                                                        {{ track.artist }}
                                                        <span
                                                            class="ml-2"
                                                            :class="{
                                                                'text-green-400': track.status === 'complete',
                                                                'text-yellow-400': track.status === 'downloading',
                                                            }">
                                                            {{ track.status === "downloading" ? "○ Downloading..." : "● Complete" }}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div class="text-gray-400">
                                                    {{ track.status === "downloading" ? "Processing..." : "Ready" }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                                <template v-else> Waiting for songs to be selected... </template>
                            </div>
                            <div
                                v-for="(song, index) in selectedSongs"
                                :key="song.id"
                                class="bg-gray-700 rounded-lg p-4"
                                :class="{ 'border-2 border-green-500': currentSong === index }">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <h3 class="text-white font-bold">{{ song.name }}</h3>
                                        <p class="text-gray-400">
                                            Tempo: {{ song.tempo }} BPM
                                            <span
                                                class="ml-2"
                                                :class="{ 'text-green-400': songFiles.has(song.id) }">
                                                {{ songFiles.has(song.id) ? "● File Loaded" : "○ Loading..." }}
                                            </span>
                                        </p>
                                    </div>
                                    <div class="text-gray-400">Distribution: {{ songDistributions[song.id] }}%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Growth Settings -->
                    <div
                        v-if="growthActive"
                        class="space-y-4">
                        <div class="bg-gray-700 rounded-lg p-4">
                            <h3 class="text-lg font-semibold text-white mb-2">Growth Settings</h3>
                            <p class="text-gray-300">Total Duration: {{ growthTime }} seconds</p>
                        </div>

                        <!-- Playback Controls -->
                        <div class="space-y-4">
                            <button
                                @click="togglePlayback"
                                :disabled="!allFilesLoaded"
                                class="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {{ isPlaying ? "Pause" : "Play" }}
                            </button>

                            <!-- Progress Bar -->
                            <div
                                v-if="isPlaying"
                                class="bg-gray-700 rounded-lg p-4">
                                <div class="flex justify-between text-gray-300 mb-2">
                                    <span> Now Playing: {{ currentSong !== null ? selectedSongs[currentSong].name : "None" }} </span>
                                    <span>{{ formatTime(currentTime) }} / {{ formatTime(growthTime) }}</span>
                                </div>
                                <div class="w-full bg-gray-600 rounded-full h-2">
                                    <div
                                        class="bg-green-500 h-2 rounded-full transition-all duration-500"
                                        :style="{ width: `${(currentTime / growthTime) * 100}%` }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="h-screen w-screen bg-gray-900 absolute top-0 left-0 z-0">
        <canvas
            ref="canvas"
            class="w-full h-full">
        </canvas>
    </div>

    <div
        v-if="isCompleted"
        class="absolute top-[10vh] left-[10vh] z-10 space-y-4">
        <!-- Save Button -->
        <button
            v-if="!uploadComplete"
            @click="onSaveClick"
            :disabled="isUploading"
            class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <template v-if="isUploading">
                <svg
                    class="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"></circle>
                    <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Plant...
            </template>
            <template v-else> Save Plant </template>
        </button>

        <!-- View Button -->
        <button
            v-else
            @click="onViewClick"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200">
            View Plant
        </button>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, onUnmounted } from "vue";
    import { io } from "socket.io-client";
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
    import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
    import GUI from "lil-gui";
    import gsap from "gsap";

    import { ref as storageRef, uploadBytes, getStorage } from "firebase/storage";
    import { initializeApp } from "firebase/app";
    import { firebaseConfig } from "../../secrets";
    import { getFirestore, collection, doc, setDoc, getDoc, runTransaction } from "firebase/firestore";

    import QRCode from "../components/QRCode.vue";

    class Node {
        constructor(x, y, z, type, parent = null) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.targetX = x;
            this.targetY = y;
            this.targetZ = z;
            this.type = type;
            this.parent = parent;
            this.children = [];
            this.moveSpeed = 1;
            this.depth = this.calculateDepth();
            this.height = this.calculateHeight();
            this.leafCount = 0;
            this.mesh = null;
            this.modelScale = { y: 0 };
            this.parentPos = null;
            this.directionVector = new THREE.Vector3();
            this.currentBranchAngle = null;
        }

        calculateDepth() {
            switch (this.type) {
                case "seed":
                    return 0;

                case "stalk":
                    return 0;

                case "branch": {
                    let depth = 0;
                    let currentNode = this;

                    // Traverse up until we find a stalk or reach the root
                    while (currentNode.parent && currentNode.parent.type !== "stalk") {
                        depth++;
                        currentNode = currentNode.parent;
                    }

                    return depth;
                }

                case "root": {
                    let depth = 0;
                    let currentNode = this;

                    // Traverse up until we find a seed or reach the top
                    while (currentNode.parent && currentNode.parent.type === "root") {
                        depth++;
                        currentNode = currentNode.parent;
                    }

                    return depth;
                }

                case "leaf": {
                    // For leaves, maintain existing behavior
                    return this.parent ? this.parent.depth + 1 : 0;
                }

                default:
                    return 0;
            }
        }

        calculateHeight() {
            if (this.type === "seed") return 0;
            if (this.type === "leaf") return this.parent ? this.parent.height : 0;
            if (this.type === "stalk") {
                let height = 0;
                let current = this;
                while (current.parent) {
                    if (current.parent.type === "stalk" || current.parent.type === "seed") {
                        height++;
                    }
                    current = current.parent;
                }
                return height;
            }
            if (this.type === "branch") {
                let current = this;
                while (current.parent) {
                    if (current.parent.type === "stalk") {
                        return current.parent.height;
                    }
                    current = current.parent;
                }
            }
            return 0;
        }

        addChild(child) {
            this.children.push(child);
        }

        toString() {
            return `Node(${this.x}, ${this.y}, ${this.z}, type=${this.type}, depth=${this.depth}, children=${this.children.length})`;
        }
    }

    const props = defineProps(["id"]);

    // Refs for state management
    const socket = ref(null);
    const error = ref("");
    const connectionStatus = ref("Disconnected");
    const mobileJoined = ref(false);
    const audioStatus = ref("Ready");

    // Audio state
    const selectedSongs = ref([]);
    const songFiles = ref(new Map());
    const songDistributions = ref({});
    const currentSong = ref(null);
    const isPlaying = ref(false);
    const growthActive = ref(false);
    const growthTime = ref(0);
    const currentTime = ref(0);
    const audioContext = ref(null);
    const currentAudio = ref(null);
    const playbackStartTime = ref(null);
    const playbackInterval = ref(null);
    const musicVolume = ref(50);
    const currBPM = ref(100);

    const pendingSpotifyDownloads = ref([]);

    // Add new audio control refs
    const musicDirection = ref(50);
    const leftVolume = computed(() => 100 - musicDirection.value);
    const rightVolume = computed(() => musicDirection.value);
    const leftGainNode = ref(null);
    const rightGainNode = ref(null);

    // Three.js refs
    const canvas = ref(null);
    let controls = null;
    let scene = null;
    let camera = null;
    let renderer = null;
    let animationFrameId = null;
    const MS_PER_MINUTE = 60000;
    let MS_PER_BEAT = MS_PER_MINUTE / currBPM;
    let MS_PER_QUARTER_BEAT = MS_PER_BEAT;
    let nextGrowthTime = null;
    let startTime = null;
    let lastTime = null;
    let audioTime = 0;
    let currentGrowthStartTime = null;
    let animationStartTime = null;
    let currentIndex = 0;
    let elapsedTime = 0;
    let lastStalkHeight = 0;
    let currentNode = null;
    let nodeObjects = [];
    let latestNodePosition = null;

    let leafMeshes = [];
    let stalkMesh = null;
    let rootMesh = null;
    let branchMesh = null;
    let flowerMesh = null;

    let isCompleted = false;

    // Firebase
    const isUploading = ref(false);
    const uploadComplete = ref(false);

    const mobileUrl = `${window.location.origin}/controls/${props.id}`;

    function openInNewTab() {
        window.open(mobileUrl, "_blank");
    }

    // Analysis
    const detectedNotes = ref([]);
    const notes = [
        { name: "C0", freq: 16.35 },
        { name: "C#0", freq: 17.32 },
        { name: "D0", freq: 18.35 },
        { name: "D#0", freq: 19.45 },
        { name: "E0", freq: 20.6 },
        { name: "F0", freq: 21.83 },
        { name: "F#0", freq: 23.12 },
        { name: "G0", freq: 24.5 },
        { name: "G#0", freq: 25.96 },
        { name: "A0", freq: 27.5 },
        { name: "A#0", freq: 29.14 },
        { name: "B0", freq: 30.87 },

        { name: "C1", freq: 32.7 },
        { name: "C#1", freq: 34.65 },
        { name: "D1", freq: 36.71 },
        { name: "D#1", freq: 38.89 },
        { name: "E1", freq: 41.2 },
        { name: "F1", freq: 43.65 },
        { name: "F#1", freq: 46.25 },
        { name: "G1", freq: 49.0 },
        { name: "G#1", freq: 51.91 },
        { name: "A1", freq: 55.0 },
        { name: "A#1", freq: 58.27 },
        { name: "B1", freq: 61.74 },

        { name: "C2", freq: 65.41 },
        { name: "C#2", freq: 69.3 },
        { name: "D2", freq: 73.42 },
        { name: "D#2", freq: 77.78 },
        { name: "E2", freq: 82.41 },
        { name: "F2", freq: 87.31 },
        { name: "F#2", freq: 92.5 },
        { name: "G2", freq: 98.0 },
        { name: "G#2", freq: 103.83 },
        { name: "A2", freq: 110.0 },
        { name: "A#2", freq: 116.54 },
        { name: "B2", freq: 123.47 },

        { name: "C3", freq: 130.81 },
        { name: "C#3", freq: 138.59 },
        { name: "D3", freq: 146.83 },
        { name: "D#3", freq: 155.56 },
        { name: "E3", freq: 164.81 },
        { name: "F3", freq: 174.61 },
        { name: "F#3", freq: 185.0 },
        { name: "G3", freq: 196.0 },
        { name: "G#3", freq: 207.65 },
        { name: "A3", freq: 220.0 },
        { name: "A#3", freq: 233.08 },
        { name: "B3", freq: 246.94 },

        { name: "C4", freq: 261.63 },
        { name: "C#4", freq: 277.18 },
        { name: "D4", freq: 293.66 },
        { name: "D#4", freq: 311.13 },
        { name: "E4", freq: 329.63 },
        { name: "F4", freq: 349.23 },
        { name: "F#4", freq: 369.99 },
        { name: "G4", freq: 392.0 },
        { name: "G#4", freq: 415.3 },
        { name: "A4", freq: 440.0 },
        { name: "A#4", freq: 466.16 },
        { name: "B4", freq: 493.88 },

        { name: "C5", freq: 523.25 },
        { name: "C#5", freq: 554.37 },
        { name: "D5", freq: 587.33 },
        { name: "D#5", freq: 622.25 },
        { name: "E5", freq: 659.25 },
        { name: "F5", freq: 698.46 },
        { name: "F#5", freq: 739.99 },
        { name: "G5", freq: 783.99 },
        { name: "G#5", freq: 830.61 },
        { name: "A5", freq: 880.0 },
        { name: "A#5", freq: 932.33 },
        { name: "B5", freq: 987.77 },

        { name: "C6", freq: 1046.5 },
        { name: "C#6", freq: 1108.73 },
        { name: "D6", freq: 1174.66 },
        { name: "D#6", freq: 1244.51 },
        { name: "E6", freq: 1318.51 },
        { name: "F6", freq: 1396.91 },
        { name: "F#6", freq: 1479.98 },
        { name: "G6", freq: 1567.98 },
        { name: "G#6", freq: 1661.22 },
        { name: "A6", freq: 1760.0 },
        { name: "A#6", freq: 1864.66 },
        { name: "B6", freq: 1975.53 },

        { name: "C7", freq: 2093.0 },
        { name: "C#7", freq: 2217.46 },
        { name: "D7", freq: 2349.32 },
        { name: "D#7", freq: 2489.02 },
        { name: "E7", freq: 2637.02 },
        { name: "F7", freq: 2793.83 },
        { name: "F#7", freq: 2959.96 },
        { name: "G7", freq: 3135.96 },
    ];

    const leafNoteMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, side: THREE.DoubleSide });
    const branchNoteMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const stalkNoteMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const rootNoteMat = new THREE.MeshStandardMaterial({ color: 0x4b2b15 });

    // Computed properties
    const allFilesLoaded = computed(() => {
        return selectedSongs.value.every((song) => songFiles.value.has(song.id)) && selectedSongs.value.length > 0;
    });

    // Utility functions
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    // Spotify Download
    async function downloadSpotifyTrack(spotifyId) {
        try {
            // Request download from spotify-dl service
            const response = await fetch(`https://spotify-dl-service-24702956633.asia-southeast1.run.app/download/${spotifyId}`);
            // const response = await fetch(`http://localhost:5000/download/${spotifyId}`);
            if (!response.ok) {
                throw new Error(`Failed to get download URL: ${response.statusText}`);
            }

            const data = await response.json();

            // Download the file from Firebase Storage
            const audioResponse = await fetch(data.url);
            if (!audioResponse.ok) {
                throw new Error("Failed to download audio file");
            }

            const arrayBuffer = await audioResponse.arrayBuffer();

            // Create AudioBuffer from downloaded file
            if (!audioContext.value) {
                audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
            }

            const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error("Error downloading Spotify track:", error);
            throw error;
        }
    }

    async function processSong(song, type) {
        try {
            if (type === "spotify") {
                pendingSpotifyDownloads.value.push({
                    spotifyId: song.spotifyTrack.spotifyId,
                    name: song.name,
                    artist: song.spotifyTrack.artistName,
                    status: "downloading",
                });

                const audioBuffer = await downloadSpotifyTrack(song.spotifyTrack.spotifyId);
                songFiles.value.set(song.id, {
                    audioBuffer,
                    complete: true,
                });
            }
            // Local files are handled by existing file transfer logic
        } catch (error) {
            console.error(`Error processing ${type} song:`, error);
            error.value = `Error processing song: ${error.message}`;

            // Update status to error
            const downloadIndex = pendingSpotifyDownloads.value.findIndex((t) => t.spotifyId === song.spotifyTrack?.spotifyId);
            if (downloadIndex >= 0) {
                pendingSpotifyDownloads.value[downloadIndex].status = "error";
            }
        }
    }

    // Socket initialization
    function initializeSocket() {
        // const url = `http://${window.location.hostname}:3000`;
        const url = "https://plants-socket-24702956633.asia-southeast1.run.app";
        // const url = "https://plants-in-space-socket.onrender.com";
        connectionStatus.value = "Connecting";

        socket.value = io(url, {
            transports: ["websocket", "polling"],
            reconnection: true,
        });

        // Connection events
        socket.value.on("connect", () => {
            connectionStatus.value = "Connected";
            socket.value.emit("join-room", props.id);
        });

        socket.value.on("disconnect", () => {
            connectionStatus.value = "Disconnected";
            resetState();
        });

        // Room management events
        socket.value.on("get-client-type", () => {
            socket.value.emit("client-type-response", "desktop");
        });

        socket.value.on("mobile-joined-room", () => {
            mobileJoined.value = true;
            console.log("Mobile device joined the room");
        });

        socket.value.on("mobile-disconnected", () => {
            error.value = "Mobile client disconnected";
            resetState();
        });

        socket.value.on("initial-state", (state) => {
            if (state.selectedSongs) {
                selectedSongs.value = state.selectedSongs;
            }
        });

        // File transfer events
        socket.value.on("file-meta", async ({ songId, filename, fileSize }) => {
            console.log(`Receiving file metadata for ${filename}`);
            songFiles.value.set(songId, {
                chunks: [],
                size: fileSize,
                received: 0,
                complete: false,
            });
        });

        socket.value.on("file-chunk", async ({ songId, data, offset, final }) => {
            console.log(`Receiving chunk for song ${songId}, final: ${final}`);

            const fileData = songFiles.value.get(songId);
            if (fileData) {
                try {
                    // Store chunk
                    fileData.chunks.push({ data, offset });
                    fileData.received += data.byteLength || 0;

                    if (final) {
                        console.log("Processing final chunk, creating audio buffer...");
                        // Combine chunks
                        const totalSize = fileData.chunks.reduce((size, chunk) => size + chunk.data.byteLength, 0);
                        const fullBuffer = new Uint8Array(totalSize);
                        let currentOffset = 0;

                        fileData.chunks.forEach((chunk) => {
                            const view = new Uint8Array(chunk.data);
                            fullBuffer.set(view, currentOffset);
                            currentOffset += chunk.data.byteLength;
                        });

                        // Create audio context if needed
                        if (!audioContext.value) {
                            audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
                        }

                        try {
                            const audioBuffer = await audioContext.value.decodeAudioData(fullBuffer.buffer);
                            fileData.audioBuffer = audioBuffer;
                            fileData.complete = true;
                            console.log(`File ${songId} loaded successfully:`, {
                                duration: audioBuffer.duration,
                                numberOfChannels: audioBuffer.numberOfChannels,
                                sampleRate: audioBuffer.sampleRate,
                            });
                            Math.random.seed = songId;
                        } catch (decodeErr) {
                            console.error("Error decoding audio data:", decodeErr);
                            error.value = `Error decoding audio: ${decodeErr.message}`;
                        }
                    }
                } catch (err) {
                    console.error("Error processing chunk:", err);
                    error.value = `Error processing chunk: ${err.message}`;
                }
            }
        });

        // Modify the growth-started handler
        socket.value.on("growth-started", async ({ songs, growthTime: time, distributions }) => {
            console.log("Growth started with:", { songs, time, distributions });

            // Reset playback state
            if (currentAudio.value) {
                currentAudio.value.source.stop();
                currentAudio.value = null;
            }

            stopPlayback();
            currentSong.value = null;
            currentTime.value = 0;
            isPlaying.value = false;

            // Set new state
            growthTime.value = time;
            songDistributions.value = distributions || {};
            growthActive.value = true;
            audioStatus.value = "Processing songs...";

            try {
                // Process all songs in parallel
                const processPromises = [];

                // Handle Spotify tracks
                if (songs.spotifyTracks) {
                    songs.spotifyTracks.forEach((song) => {
                        processPromises.push(processSong(song, "spotify"));
                    });
                }

                // Set local files to selectedSongs for existing file transfer logic
                if (songs.localFiles) {
                    selectedSongs.value = songs.localFiles;
                }

                // Wait for all Spotify downloads to complete
                await Promise.all(processPromises);

                // Combine processed songs in correct order
                selectedSongs.value = [];
                if (songs.localFiles) selectedSongs.value.push(...songs.localFiles);
                if (songs.spotifyTracks) selectedSongs.value.push(...songs.spotifyTracks);

                audioStatus.value = "Ready to play";

                console.log("All songs processed:", {
                    songCount: selectedSongs.value.length,
                    distributions: songDistributions.value,
                    duration: growthTime.value,
                });
            } catch (err) {
                console.error("Error processing songs:", err);
                error.value = `Error processing songs: ${err.message}`;
                audioStatus.value = "Error";
            }
        });

        // Also add error logging to help debug
        socket.value.on("error", (err) => {
            console.error("Socket error:", err);
            error.value = `Socket error: ${err.message}`;
        });

        socket.value.on("volume-updated", ({ volume }) => {
            musicVolume.value = volume;
            updateChannelVolumes();
        });

        socket.value.on("music-direction-updated", ({ direction }) => {
            musicDirection.value = direction;
            updateChannelVolumes();
        });

        socket.value.on("toggle-playback", async () => {
            await togglePlayback();
        });

        socket.value.on("next-song", async () => {
            if (selectedSongs.value.length === 0) return;

            try {
                if (isPlaying.value) {
                    await stopPlayback();
                }

                if (currentSong.value >= selectedSongs.value.length - 1) {
                    currentSong.value = 0;
                } else {
                    currentSong.value++;
                }

                if (isPlaying.value) {
                    await playCurrentSegment();
                }
            } catch (err) {
                error.value = `Error switching to next track: ${err.message}`;
            }
        });

        socket.value.on("previous-song", async () => {
            if (selectedSongs.value.length === 0) return;

            try {
                if (isPlaying.value) {
                    await stopPlayback();
                }

                if (currentSong.value <= 0) {
                    currentSong.value = selectedSongs.value.length - 1;
                } else {
                    currentSong.value--;
                }

                if (isPlaying.value) {
                    await playCurrentSegment();
                }
            } catch (err) {
                error.value = `Error switching to previous track: ${err.message}`;
            }
        });

        socket.value.on("error", (err) => {
            error.value = `Socket error: ${err.message}`;
        });

        return socket.value;
    }

    function checkFileLoadStatus(songId) {
        const fileData = songFiles.value.get(songId);
        console.log("Checking file status:", {
            songId,
            hasFileData: !!fileData,
            hasAudioBuffer: !!fileData?.audioBuffer,
            complete: fileData?.complete,
        });
        return fileData?.complete && fileData?.audioBuffer;
    }

    // Audio playback functions

    async function togglePlayback() {
        if (isPlaying.value) {
            await stopPlayback();
        } else {
            await startPlayback();
        }

        document.querySelector(".main").style.display = "none";
        initThreeJs();
    }

    async function startPlayback() {
        if (!selectedSongs.value.length) {
            error.value = "No songs selected";
            return;
        }

        // Check if all files are properly loaded
        const unloadedSongs = selectedSongs.value.filter((song) => !checkFileLoadStatus(song.id));
        if (unloadedSongs.length > 0) {
            error.value = `Some songs are not fully loaded: ${unloadedSongs.map((s) => s.name).join(", ")}`;
            return;
        }

        try {
            currentTime.value = 0;
            currentSong.value = 0;
            playbackStartTime.value = Date.now();
            isPlaying.value = true;
            audioStatus.value = "Starting playback";

            startTime = null;
            nextGrowthTime = null;
            currentGrowthStartTime = null;
            animationStartTime = null;
            currentIndex = 0;

            // Start the timer with song transition logic
            playbackInterval.value = setInterval(async () => {
                const elapsed = (Date.now() - playbackStartTime.value) / 1000;
                currentTime.value = Math.min(elapsed, growthTime.value);

                // Calculate which song should be playing
                let accumulatedTime = 0;
                let shouldTransition = false;
                let nextSongIndex = currentSong.value;

                for (let i = 0; i < selectedSongs.value.length; i++) {
                    const song = selectedSongs.value[i];
                    const distribution = songDistributions.value[song.id];
                    const segmentDuration = (distribution / 100) * growthTime.value;

                    if (currentTime.value >= accumulatedTime && currentTime.value < accumulatedTime + segmentDuration) {
                        if (currentSong.value !== i) {
                            nextSongIndex = i;
                            shouldTransition = true;
                        }
                        break;
                    }
                    accumulatedTime += segmentDuration;
                }

                // Handle song transition if needed
                if (shouldTransition) {
                    console.log(`Transitioning to song ${nextSongIndex}`);
                    if (currentAudio.value) {
                        currentAudio.value.source.stop();
                        currentAudio.value = null;
                    }
                    currentSong.value = nextSongIndex;
                    await playCurrentSegment();
                }

                // Stop playback if we've reached the end
                if (currentTime.value >= growthTime.value) {
                    await stopPlayback();
                }
            }, 100);

            await playCurrentSegment();
        } catch (err) {
            console.error("Error starting playback:", err);
            error.value = `Playback error: ${err.message}`;
            isPlaying.value = false;
            audioStatus.value = "Error";
        }
    }

    async function playCurrentSegment() {
        if (!selectedSongs.value.length || currentSong.value === null) {
            console.error("Invalid playback state");
            return;
        }

        const song = selectedSongs.value[currentSong.value];
        currBPM.value = song.tempo || 100;
        // Immediately update timing constants
        MS_PER_BEAT = MS_PER_MINUTE / currBPM.value;
        MS_PER_QUARTER_BEAT = MS_PER_BEAT;

        console.log(currBPM.value);

        // Reset growth timing when BPM changes
        nextGrowthTime = Date.now() - playbackStartTime.value;

        const fileData = songFiles.value.get(song.id);

        if (!fileData?.audioBuffer) {
            throw new Error(`Audio not loaded for song: ${song.name}`);
        }

        const distribution = songDistributions.value[song.id];
        const totalSegmentDuration = (distribution / 100) * growthTime.value;

        // Calculate remaining duration for this segment
        let accumulatedTime = 0;
        for (let i = 0; i < currentSong.value; i++) {
            const prevSong = selectedSongs.value[i];
            accumulatedTime += (songDistributions.value[prevSong.id] / 100) * growthTime.value;
        }

        const elapsed = currentTime.value - accumulatedTime;
        const remainingDuration = totalSegmentDuration - elapsed;

        console.log("Playing segment:", {
            songName: song.name,
            distribution,
            totalDuration: totalSegmentDuration,
            remainingDuration,
            currentTime: currentTime.value,
        });

        currentAudio.value = await playAudioBuffer(fileData.audioBuffer, remainingDuration);
        audioStatus.value = "Playing";
    }
    const getNoteMaterial = (noteName, materialType) => {
        noteName = noteName.charAt(0).toUpperCase();
        const noteMap = {
            A: 0,
            B: 1,
            C: 2,
            D: 3,
            E: 4,
            F: 5,
            G: 6,
        };

        switch (materialType) {
            case "branch":
                return branchNoteMat;
            case "stalk":
                return stalkNoteMat;
            case "root":
                return rootNoteMat;
            case "leaf":
                return leafMaterials[noteMap[noteName]];
            default:
                return leafMaterials[0];
        }
    };

    const getNoteMesh = (noteName, nodeType) => {
        noteName = noteName.charAt(0).toUpperCase();
        const noteMap = {
            A: 0,
            B: 1,
            C: 2,
            D: 3,
            E: 4,
            F: 5,
            G: 6,
        };

        switch (nodeType) {
            case "branch":
                return branchMesh;
            case "stalk":
                return stalkMesh;
            case "root":
                return rootMesh;
            case "leaf":
                return leafMeshes[noteMap[noteName]];
            case "flower":
                return flowerMesh;
            default:
                return leafMeshes[0];
        }
    };

    async function playAudioBuffer(audioBuffer, duration) {
        try {
            if (!audioContext.value) {
                audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
                await audioContext.value.resume();
            }

            const source = audioContext.value.createBufferSource();
            const splitter = audioContext.value.createChannelSplitter(2);
            const merger = audioContext.value.createChannelMerger(2);

            // Create analyzer node
            const analyzer = audioContext.value.createAnalyser();
            analyzer.fftSize = 2048;
            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // Create gain nodes
            leftGainNode.value = audioContext.value.createGain();
            rightGainNode.value = audioContext.value.createGain();

            // Modified audio routing to fix connection error
            source.buffer = audioBuffer;

            // Connect source to analyzer first
            source.connect(analyzer);

            // Connect analyzer to splitter
            analyzer.connect(splitter);

            // Connect split channels to respective gain nodes
            splitter.connect(leftGainNode.value, 0);
            splitter.connect(rightGainNode.value, 1);

            // Connect gain nodes to merger
            leftGainNode.value.connect(merger, 0, 0);
            rightGainNode.value.connect(merger, 0, 1);

            // Connect merger to destination
            merger.connect(audioContext.value.destination);

            function findNearestNote(frequency) {
                let closestNote = notes[0];
                let minDiff = Math.abs(frequency - closestNote.freq);

                for (let note of notes) {
                    let diff = Math.abs(frequency - note.freq);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestNote = note;
                    }
                }

                return closestNote;
            }

            function analyzeAudio() {
                if (!isPlaying.value) return;

                analyzer.getByteFrequencyData(dataArray);

                // Find significant frequencies with energy levels
                const frequencyResolution = audioContext.value.sampleRate / analyzer.fftSize;
                const significantFreqs = [];

                for (let i = 0; i < dataArray.length; i++) {
                    if (dataArray[i] > 200) {
                        // Threshold
                        significantFreqs.push({
                            frequency: i * frequencyResolution,
                            energy: dataArray[i],
                        });
                    }
                }

                // Convert frequencies to notes with energy
                const detected = significantFreqs
                    .map(({ frequency, energy }) => {
                        const note = findNearestNote(frequency);
                        return {
                            name: note.name,
                            noteName: note.name.slice(0, -1),
                            octave: parseInt(note.name.slice(-1)),
                            frequency: `${frequency.toFixed(2)} Hz`,
                            energy: energy,
                        };
                    })
                    .filter((note, index, self) => index === self.findIndex((n) => n.name === note.name))
                    .sort((a, b) => b.energy - a.energy); // Sort by energy (highest first)

                // Update the reactive ref
                detectedNotes.value = detected;

                requestAnimationFrame(analyzeAudio);
            }

            analyzeAudio();

            // Set initial volumes
            updateChannelVolumes();

            source.loop = true;
            source.start(0);

            return {
                source,
                leftGainNode: leftGainNode.value,
                rightGainNode: rightGainNode.value,
                analyzer,
            };
        } catch (err) {
            console.error("Error in playAudioBuffer:", err);
            audioStatus.value = `Playback Error: ${err.message}`;
            throw err;
        }
    }

    async function stopPlayback() {
        if (!isPlaying.value) {
            return;
        }
        console.log("Transitioning to ambient mode");
        isPlaying.value = false;
        isCompleted = true;
        audioStatus.value = "Ambient";

        // Clear the playback interval since we don't need to track growth time anymore
        if (playbackInterval.value) {
            clearInterval(playbackInterval.value);
            playbackInterval.value = null;
        }

        nodeObjects.traverse((object) => {
            if (object.userData.isFlower) {
                gsap.to(object.scale, {
                    x: 0.2,
                    y: 0.2,
                    z: 0.2,
                    duration: 2,
                    ease: "elastic.out(1, 0.3)",
                    delay: Math.random() * 0.5, // Stagger the animations slightly
                });
            }
        });

        // If there's current audio playing, adjust its volume
        if (currentAudio.value) {
            try {
                // Store the original volume settings
                const originalLeftGain = leftGainNode.value.gain.value;
                const originalRightGain = rightGainNode.value.gain.value;
                const maxGain = Math.max(originalLeftGain, originalRightGain);

                leftGainNode.value.gain.value = maxGain;
                rightGainNode.value.gain.value = maxGain;

                // Create volume objects for GSAP to animate
                const leftVolume = { gain: maxGain };
                const rightVolume = { gain: maxGain };

                // Use GSAP to animate the volume reduction
                gsap.to(leftVolume, {
                    gain: maxGain * 0.01,
                    duration: 5,
                    ease: "power1.out",
                    onUpdate: () => {
                        leftGainNode.value.gain.value = leftVolume.gain;
                    },
                });

                gsap.to(rightVolume, {
                    gain: maxGain * 0.01,
                    duration: 5,
                    ease: "power1.out",
                    onUpdate: () => {
                        rightGainNode.value.gain.value = rightVolume.gain;
                    },
                });

                gsap.to(musicEmitter.scale, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 5,
                    ease: "power1.out",
                });

                // Enable looping if not already set
                currentAudio.value.source.loop = true;
            } catch (err) {
                console.error("Error adjusting audio:", err);
            }
        } else {
            // If no audio is playing, start the last track at ambient volume
            currentSong.value = selectedSongs.value.length - 1;
            const song = selectedSongs.value[currentSong.value];
            const fileData = songFiles.value.get(song.id);

            if (fileData?.audioBuffer) {
                try {
                    currentAudio.value = await playAudioBuffer(fileData.audioBuffer);

                    // Set initial volume and animate down
                    const initialVolume = { gain: leftGainNode.value.gain.value };

                    gsap.to(initialVolume, {
                        gain: initialVolume.gain * 0.01,
                        duration: 5,
                        ease: "power1.out",
                        onUpdate: () => {
                            leftGainNode.value.gain.value = initialVolume.gain;
                            rightGainNode.value.gain.value = initialVolume.gain;
                        },
                    });

                    // Enable looping
                    currentAudio.value.source.loop = true;
                } catch (err) {
                    console.error("Error starting ambient audio:", err);
                }
            }
        }
    }

    function updateChannelVolumes() {
        if (leftGainNode.value && rightGainNode.value && isPlaying.value) {
            const leftGain = (leftVolume.value / 100) * (musicVolume.value / 100) * 2;
            const rightGain = (rightVolume.value / 100) * (musicVolume.value / 100) * 2;

            leftGainNode.value.gain.value = leftGain;
            rightGainNode.value.gain.value = rightGain;

            updateMusicEmitterPosition();
        }
    }

    function resetState() {
        selectedSongs.value = [];
        songFiles.value = new Map();
        songDistributions.value = {};
        currentSong.value = null;
        isPlaying.value = false;
        growthActive.value = false;
        growthTime.value = 0;
        currentTime.value = 0;
        error.value = "";
        audioStatus.value = "Ready";
        mobileJoined.value = false;
        pendingSpotifyDownloads.value = [];

        if (currentAudio.value) {
            currentAudio.value.source.stop();
            currentAudio.value = null;
        }

        if (playbackInterval.value) {
            clearInterval(playbackInterval.value);
            playbackInterval.value = null;
        }

        if (leftGainNode.value) {
            leftGainNode.value.disconnect();
            leftGainNode.value = null;
        }
        if (rightGainNode.value) {
            rightGainNode.value.disconnect();
            rightGainNode.value = null;
        }
    }

    // Music emitter animation properties
    const musicEmitterRadius = 7.5;
    let musicEmitterAngle = 0;
    let emitterInfluence = 0.5;
    let musicEmitter = null;
    let currentBranchAngle = 0;

    function updateMusicEmitterPosition() {
        if (!musicEmitter) return;

        // Convert 0-100 position to radians relative to current branch angle
        // Flip the normalization for correct left/right orientation
        const normalizedPosition = (50 - musicDirection.value) / 50; // Convert to -1 to 1 range, flipped

        if (Math.abs(normalizedPosition) <= 0.1) {
            emitterInfluence = 0;
        } else {
            // Scale influence from 0 to 1 between 0.1 and 1.0
            // Using (x - 0.1) / 0.9 to normalize the range 0.1 to 1.0 into 0 to 1
            emitterInfluence = (Math.abs(normalizedPosition) - 0.1) / 0.9;
            // Optional: Add easing for smoother transition
            emitterInfluence = Math.pow(emitterInfluence, 2); // Square for more gradual initial increase
        }

        // Calculate final angle by adding offset to current branch angle
        // Use ±90 degrees (±π/2) as the maximum deviation from branch angle
        const offsetAngle = normalizedPosition * (Math.PI / 2);
        musicEmitterAngle = currentBranchAngle + offsetAngle;

        // Update emitter position
        musicEmitter.position.x = Math.cos(musicEmitterAngle) * musicEmitterRadius;
        musicEmitter.position.z = Math.sin(musicEmitterAngle) * musicEmitterRadius;
    }

    const initThreeJs = () => {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0); // Set clear color to transparent

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        // controls.enablePan = false;

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const sceneLight = new THREE.AmbientLight(0xffffff, 0.125);
        scene.add(sceneLight);

        // Enable shadow mapping in the renderer
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Configure directional light for shadows
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.bias = -0.001;
        directionalLight.position.set(10, 15, 10);

        // Create the water surface
        const waterGeometry = new THREE.PlaneGeometry(20, 20, 100, 100);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#4097e3"),
            transparent: true,
            opacity: 0.2,
            roughness: 1.0,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });

        // Initialize clicks array for ripple effect
        const clicksData = new Float32Array(40); // 10 clicks * 4 components
        for (let i = 0; i < 40; i += 4) {
            clicksData[i] = 0; // time
            clicksData[i + 1] = 0; // isAlive
            clicksData[i + 2] = 0; // unused
            clicksData[i + 3] = 0; // unused
        }

        waterMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.time = { value: 0 };
            shader.uniforms.clicks = { value: clicksData };
            shader.uniforms.frequency = { value: 3.0 };
            shader.uniforms.amplitude = { value: 0.2 }; // Increased from 0.1 to 0.3
            shader.uniforms.speed = { value: 30.0 }; // Increased from 15.0 to 30.0
            shader.uniforms.decay = { value: 2.5 };

            // Add custom vertex shader code
            shader.vertexShader =
                `
        uniform float time;
        uniform float frequency;
        uniform float amplitude;
        uniform float speed;
        uniform float decay;
        uniform vec4 clicks[10];

        float getWave(float dist, float clickTime, float isAlive) {
            if (isAlive < 0.5) return 0.0;

            float timeSince = time - clickTime;
            float phase = dist * frequency - timeSince * speed;

            // Decay based on time
            float envelope = exp(-timeSince * decay);

            // Spatial decay (waves get smaller as they move out)
            float spatialDecay = 1.0 / (1.0 + dist * 0.5);

            return sin(phase) * amplitude * envelope * spatialDecay;
        }
    ` + shader.vertexShader;

            // Replace the begin_vertex chunk
            const token = "#include <begin_vertex>";
            const customTransform = `
        vec3 transformed = vec3(position);

        float dx = position.x;
        float dy = position.y;
        float dist = sqrt(dx*dx + dy*dy);

        float totalDisplacement = 0.0;
        vec3 totalNormal = vec3(0.0, 0.0, 1.0);

        for(int i = 0; i < 10; i++) {
            float clickTime = clicks[i].x;
            float isAlive = clicks[i].y;

            float displacement = getWave(dist, clickTime, isAlive);
            totalDisplacement += displacement;

            if (isAlive > 0.5) {
                float dzdx = displacement * dx/dist;
                float dzdy = displacement * dy/dist;
                totalNormal += vec3(-dzdx, -dzdy, 0.0);
            }
        }

        transformed.z += totalDisplacement;
        objectNormal = normalize(totalNormal);
        vNormal = normalMatrix * objectNormal;
    `;

            shader.vertexShader = shader.vertexShader.replace(token, customTransform);
            window.waterShader = shader; // Store shader reference for updates
        };

        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.receiveShadow = true;
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0;
        scene.add(water);

        const updateWater = (time) => {
            if (window.waterShader) {
                window.waterShader.uniforms.time.value = time / 1000;

                // Update wave states
                for (let i = 0; i < 40; i += 4) {
                    if (clicksData[i + 1] > 0) {
                        // if wave is alive
                        const timeSince = time / 1000 - clicksData[i];
                        if (timeSince > 5) {
                            clicksData[i + 1] = 0; // deactivate wave
                        }
                    }
                }
            }
        };

        // camera setup
        const cameraTarget = new THREE.Vector3(0, 0, 0);
        let currentRadius = 8; // Start with 15 units radius

        // Set initial camera position
        camera.position.x = currentRadius;
        camera.position.z = 0;
        camera.position.y = 3.5;
        camera.lookAt(cameraTarget);

        function animateCameraForStalk() {
            const nextRadius = currentRadius + 0.1;
            const nextHeight = camera.position.y + 1;

            gsap.to(camera.position, {
                y: nextHeight,
                duration: 1,
                ease: "power2.inOut",
            });

            gsap.to(cameraTarget, {
                y: nextHeight,
                duration: 1,
                ease: "power2.inOut",
            });

            gsap.to(
                { value: currentRadius },
                {
                    value: nextRadius,
                    duration: 1,
                    ease: "power2.inOut",
                    onUpdate: function () {
                        currentRadius = this.targets()[0].value;
                    },
                },
            );

            gsap.to(musicEmitter.position, {
                y: nextHeight - 0.5,
                duration: 1,
                ease: "power2.inOut",
            });
        }

        function animateCameraForBranch(parentNode) {
            // Only adjust camera for branches directly from stalks
            if (parentNode.type === "stalk") {
                const branchIndex = parentNode.children.length - 1; // Get index of newest branch
                const anglePerBranch = 360 / MAX_STALK_BRANCHES;
                const heightRotation = parentNode.height * 30;
                const startAngle = heightRotation * (Math.PI / 180);
                const baseAngle = branchIndex * anglePerBranch * (Math.PI / 180) + startAngle;

                // Calculate target camera position
                const targetX = Math.cos(baseAngle) * currentRadius;
                const targetZ = Math.sin(baseAngle) * currentRadius;

                // Animate camera position
                gsap.to(camera.position, {
                    x: targetX,
                    z: targetZ,
                    duration: MS_PER_QUARTER_BEAT / 250,
                    ease: "power2.inOut",
                });

                gsap.to(cameraTarget, {
                    x: parentNode.x,
                    y: parentNode.y,
                    z: parentNode.z,
                    duration: MS_PER_QUARTER_BEAT / 250,
                    ease: "power2.inOut",
                });

                currentBranchAngle = baseAngle;
                updateMusicEmitterPosition();
            }
        }

        // const leafGeometry = new THREE.CircleGeometry(0.15, 32);
        const nodeGeometry = new THREE.SphereGeometry(0.025);

        const nodeColors = {
            seed: 0x8b4513,
            root: 0x4b2b15,
            stalk: 0x8b4513,
            branch: 0x228b22,
            leaf: 0x2e8b57,
        };

        const nodes = {
            seed: [],
            root: [],
            stalk: [],
            branch: [],
            leaf: [],
        };

        nodeObjects = new THREE.Group();
        const connectionObjects = new THREE.Group();
        scene.add(nodeObjects);
        scene.add(connectionObjects);

        const MAX_ROOT_DEPTH = 5;
        const MAX_BRANCH_LENGTH = 4;
        const MAX_CHILDREN = 2;
        const MAX_STALK_BRANCHES = 3;
        const X_VARIANCE = 1;
        const Z_VARIANCE = 1;

        const growthConfig = {
            25: "root",
            10000: "leaf",
        };

        let firstFork = -1;
        let lastUsedForkIndex = 0;

        // First, create a loading manager to track when the model is ready
        const loadingManager = new THREE.LoadingManager();
        const loader = new GLTFLoader(loadingManager);

        let isStalkLoaded = false;
        let isRootLoaded = false;
        let isBranchLoaded = false;
        let isFlowerLoaded = false;

        loader.load(
            "../assets/stalk.glb",
            (gltf) => {
                gltf.scene.traverse((child) => {
                    if (child.isMesh && !stalkMesh) {
                        console.log("Found stalk geometry:", child.geometry);
                        stalkMesh = child.clone();
                        stalkMesh.scale.set(1, 1, 1);
                        isStalkLoaded = true;
                    }
                });
            },
            undefined,
            (error) => {
                console.error("Error loading model:", error);
            },
        );

        loader.load("../assets/roots.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh && !rootMesh) {
                    console.log("Found root geometry:", child.geometry);
                    rootMesh = child.clone();
                    rootMesh.scale.set(1, 1, 1);
                    isRootLoaded = true;
                }
            });
        });

        loader.load(
            "../assets/branch_test.glb",
            (gltf) => {
                gltf.scene.traverse((child) => {
                    if (child.isMesh && !branchMesh) {
                        console.log("Found branch geometry:", child.geometry);
                        branchMesh = child.clone();
                        branchMesh.scale.set(1, 1, 1);
                        isBranchLoaded = true;
                    }
                });
            },
            undefined,
            (error) => {
                console.error("Error loading branch model:", error);
            },
        );

        loader.load("../assets/flower_c1.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh && !flowerMesh) {
                    console.log("Found flower geometry:", child.geometry);
                    flowerMesh = child.clone();
                    flowerMesh.scale.set(0.5, 0.5, 0.5);
                    isFlowerLoaded = true;
                }
            });
        });

        function adjustLeafMesh(mesh) {
            mesh.scale.set(0.35, 0.5, 0.35);
            mesh.geometry.rotateY(Math.PI / 2);
            mesh.material.roughness = 1.0;
            mesh.material.metalness = 0.0;
            mesh.material.envMapIntensity = 0.0;
        }

        loader.load("../assets/leaf_c1.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    let mesh = child.clone();
                    adjustLeafMesh(mesh);
                    leafMeshes.push(mesh);
                }
            });
        });

        loader.load("../assets/leaf_c2.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    let mesh = child.clone();
                    adjustLeafMesh(mesh);
                    leafMeshes.push(mesh);
                }
            });
        });

        loader.load("../assets/leaf_c3.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    let mesh = child.clone();
                    adjustLeafMesh(mesh);
                    leafMeshes.push(mesh);
                }
            });
        });

        loader.load("../assets/leaf_c4.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    let mesh = child.clone();
                    adjustLeafMesh(mesh);
                    leafMeshes.push(mesh);
                }
            });
        });

        loader.load("../assets/leaf_c5.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    let mesh = child.clone();
                    adjustLeafMesh(mesh);
                    leafMeshes.push(mesh);
                }
            });
        });

        loader.load("../assets/leaf_c6.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    let mesh = child.clone();
                    adjustLeafMesh(mesh);
                    leafMeshes.push(mesh);
                }
            });
        });

        loader.load("../assets/leaf_c7.glb", (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    let mesh = child.clone();
                    adjustLeafMesh(mesh);
                    leafMeshes.push(mesh);
                }
            });
        });

        // Create music emitter
        musicEmitter = new THREE.Group();

        // Create outer sphere
        const outerSphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const outerSphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            wireframe: true,
        });
        const outerSphere = new THREE.Mesh(outerSphereGeometry, outerSphereMaterial);

        // Create inner sphere
        const innerSphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        const innerSphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true,
        });
        const innerSphere = new THREE.Mesh(innerSphereGeometry, innerSphereMaterial);

        // Add both spheres to group
        musicEmitter.add(outerSphere);
        musicEmitter.add(innerSphere);
        scene.add(musicEmitter);

        // Start the music emitter animation
        musicEmitter.position.set(musicEmitterRadius, 0, 0);

        let noteGeometry = null;
        loader.load(
            "../assets/note.glb",
            (gltf) => {
                gltf.scene.traverse((child) => {
                    if (child.isMesh && !noteGeometry) {
                        noteGeometry = child.geometry.clone();
                        noteGeometry.scale(1, 1, 1);
                    }
                });
            },
            undefined,
            (error) => {
                console.error("Error loading note model:", error);
            },
        );

        const notesGroup = new THREE.Group();
        scene.add(notesGroup);

        const activeNotes = [];
        let lastPulseScale = 0;

        function updateInnerSpherePulse(currentTime) {
            const beatDuration = MS_PER_MINUTE / currBPM.value;
            const pulseProgress = ((currentTime - animationStartTime) % beatDuration) / beatDuration;

            // Sine wave for smooth pulsing
            const pulseScale = Math.sin(pulseProgress * Math.PI) * 1.0;
            innerSphere.scale.setScalar(pulseScale);

            // Check if we just hit peak scale (approximately 1.0)
            if (pulseScale > 0.99 && lastPulseScale <= 0.99) {
                emitNote();
            }
            lastPulseScale = pulseScale;
        }

        function emitNote() {
            if (!noteGeometry) return;

            const noteMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1,
            });
            const noteMesh = new THREE.Mesh(noteGeometry, noteMaterial);
            noteMesh.castShadow = true;
            noteMesh.position.copy(musicEmitter.position);
            noteMesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
            notesGroup.add(noteMesh);

            const noteData = {
                mesh: noteMesh,
                startTime: Date.now(),
                duration: MS_PER_BEAT,
                startPosition: noteMesh.position.clone(),
                targetPosition: latestNodePosition,
                startOpacity: 1,
            };
            activeNotes.push(noteData);

            // Water ripple code remains the same
            if (window.waterShader) {
                let slotIndex = 0;
                for (let i = 0; i < 40; i += 4) {
                    if (clicksData[i + 1] === 0) {
                        slotIndex = i;
                        break;
                    }
                }
                if (clicksData[slotIndex + 1] !== 0) {
                    slotIndex = 0;
                }
                clicksData[slotIndex] = performance.now() / 1000;
                clicksData[slotIndex + 1] = 1;
                clicksData[slotIndex + 2] = 0;
                clicksData[slotIndex + 3] = 0;
                window.waterShader.uniforms.clicks.value = clicksData;
            }
        }

        function updateNotes() {
            const currentTime = Date.now();
            for (let i = activeNotes.length - 1; i >= 0; i--) {
                const note = activeNotes[i];
                const elapsed = currentTime - note.startTime;
                const progress = Math.min(elapsed / note.duration, 1);

                // Use easeInOut for smoother movement
                const easedProgress = easeInOutCubic(progress);

                // Move towards target
                note.mesh.position.lerpVectors(note.startPosition, note.targetPosition, easedProgress);

                // Fade out near the end of travel
                const fadeStartProgress = 0.8; // Start fading at 80% of journey
                if (progress > fadeStartProgress) {
                    const fadeProgress = (progress - fadeStartProgress) / (1 - fadeStartProgress);
                    note.mesh.material.opacity = note.startOpacity * (1 - fadeProgress);
                }

                // Scale follows the same pattern as opacity
                if (progress > fadeStartProgress) {
                    const fadeProgress = (progress - fadeStartProgress) / (1 - fadeStartProgress);
                    const scale = 1 - fadeProgress * 0.5;
                    note.mesh.scale.setScalar(scale);
                }

                // Remove when journey is complete
                if (progress >= 1) {
                    notesGroup.remove(note.mesh);
                    note.mesh.geometry.dispose();
                    note.mesh.material.dispose();
                    activeNotes.splice(i, 1);
                }
            }
        }

        // Add this easing function
        function easeInOutCubic(x) {
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        }

        function calculateStalkTransform(parent, current, growthProgress = 1) {
            // Calculate direction vector from parent to current
            const direction = new THREE.Vector3(current.x - parent.x, current.y - parent.y, current.z - parent.z);

            // Calculate the final distance between points - this will be our target scale
            const distance = direction.length();

            // Position stays at parent point
            const position = new THREE.Vector3(parent.x, parent.y, parent.z);

            // Calculate rotation to align with direction
            const quaternion = new THREE.Quaternion();
            const up = new THREE.Vector3(0, 1, 0);
            direction.normalize();
            quaternion.setFromUnitVectors(up, direction);

            // Scale:
            // - X and Z scale remain constant at 0.2
            // - Y scale (length) grows based on progress and final distance
            // - Since mesh is 1 unit long at scale 1, we multiply distance directly
            return {
                position: position,
                rotation: quaternion,
                scale: new THREE.Vector3(1, distance * growthProgress, 1),
            };
        }

        function calculateRootTransform(parent, current, growthProgress = 1) {
            const direction = new THREE.Vector3(current.x - parent.x, current.y - parent.y, current.z - parent.z);
            const distance = direction.length();
            const position = new THREE.Vector3(parent.x, parent.y, parent.z);

            // Calculate rotation to align with direction
            const quaternion = new THREE.Quaternion();
            const up = new THREE.Vector3(0, 1, 0);
            direction.normalize();
            quaternion.setFromUnitVectors(up, direction);

            return {
                position: position,
                rotation: quaternion,
                scale: new THREE.Vector3(1, distance * growthProgress, 1),
            };
        }

        function calculateBranchTransform(parent, current, growthProgress = 1) {
            const direction = new THREE.Vector3(current.x - parent.x, current.y - parent.y, current.z - parent.z);
            const distance = direction.length();
            const position = new THREE.Vector3(parent.x, parent.y, parent.z);
            const quaternion = new THREE.Quaternion();
            const up = new THREE.Vector3(0, 1, 0);
            direction.normalize();
            quaternion.setFromUnitVectors(up, direction);

            return {
                position: position,
                rotation: quaternion,
                scale: new THREE.Vector3(1, distance * growthProgress, 1),
            };
        }

        function calculateLeafTransform(current, growthProgress = 1) {
            const position = new THREE.Vector3(current.x, current.y, current.z);
            const quaternion = new THREE.Quaternion();

            // Since the model is along X axis, we start with a vector pointing along X
            const modelDirection = new THREE.Vector3(1, 0, 0);

            // Get the horizontal component of the growth direction
            const horizontalDirection = new THREE.Vector3(
                current.directionVector.x,
                // 0, // Zero out the Y component to keep leaves level
                Math.random() * 0.5 - 0.25, // Add slight random variation to Y,
                current.directionVector.z,
            ).normalize();

            // If horizontal direction is zero (perfectly vertical growth), use a default direction
            if (horizontalDirection.lengthSq() < 0.001) {
                horizontalDirection.set(1, 0, 0);
            }

            // Calculate rotation to align with horizontal direction
            quaternion.setFromUnitVectors(modelDirection, horizontalDirection);

            // Add alternating rotation based on leaf count
            // Rotate around the world Y axis for left/right alternation
            const upVector = new THREE.Vector3(0, 1, 0);
            const alternatingRotation = new THREE.Quaternion();

            // Base rotation angle (90 degrees left or right)
            let rotation = current.parent.leafCount % 2 === 0 ? Math.PI : 2 * Math.PI;

            // Add some random variation (-0.2 to 0.2 radians, about ±11.5 degrees)
            rotation += (Math.random() - 0.5) * 0.4;

            alternatingRotation.setFromAxisAngle(upVector, rotation);

            // Apply both rotations
            quaternion.multiply(alternatingRotation);

            // Apply scale
            const scale = new THREE.Vector3(growthProgress, growthProgress, growthProgress);

            return {
                position: position,
                rotation: quaternion,
                scale: scale,
            };
        }

        function calculateFlowerTransform(node) {
            const position = new THREE.Vector3(node.targetX, node.targetY, node.targetZ);
            const quaternion = new THREE.Quaternion();

            // Use parent's direction vector to determine flower orientation
            // Since flower model faces up (Y-axis), start with up vector
            const modelDirection = new THREE.Vector3(0, 1, 0);

            // Get parent's growth direction
            const parentDirection = node.directionVector.clone();

            // Calculate rotation to align flower with parent's direction
            quaternion.setFromUnitVectors(modelDirection, parentDirection);

            // Add slight random rotation around the growth direction for variety
            const randomRotation = new THREE.Quaternion();
            randomRotation.setFromAxisAngle(parentDirection, (Math.random() * Math.PI * 1) / 8);
            quaternion.multiply(randomRotation);

            // Add slight random tilt (up to 7.5 degrees)
            const tiltAxis = new THREE.Vector3(1, 0, 0);
            tiltAxis.applyQuaternion(quaternion); // Rotate tilt axis to local space
            const tiltRotation = new THREE.Quaternion();
            tiltRotation.setFromAxisAngle(tiltAxis, (Math.random() - 0.125) * 0.05125);
            quaternion.multiply(tiltRotation);

            return {
                position: position,
                rotation: quaternion,
                scale: new THREE.Vector3(0.2, 0.2, 0.2), // Adjust scale as needed
            };
        }

        function calculateTargetPosition(parentNode, type) {
            let targetX, targetY, targetZ;

            // Get emitter influence direction for all types
            const emitterDirX = musicEmitter.position.x - parentNode.x;
            const emitterDirZ = musicEmitter.position.z - parentNode.z;
            const emitterAngle = Math.atan2(emitterDirZ, emitterDirX);

            switch (type) {
                case "leaf": {
                    // Use the parent's direction vector to determine leaf position
                    const growthDistance = 0.5; // Distance from parent to leaf tip

                    // Calculate target position along the growth direction
                    targetX = parentNode.x + parentNode.directionVector.x * growthDistance;
                    targetY = parentNode.y + parentNode.directionVector.y * growthDistance;
                    targetZ = parentNode.z + parentNode.directionVector.z * growthDistance;

                    // Add slight random variation
                    const variance = 0.1;
                    targetX += (Math.random() - 0.5) * variance;
                    targetY += (Math.random() - 0.5) * variance;
                    targetZ += (Math.random() - 0.5) * variance;
                    break;
                }
                case "root": {
                    const randomAngle = Math.random() * 2 * Math.PI;
                    const varianceScale = 1 - emitterInfluence;
                    const baseVariance = ((Math.random() * 2 * 360) / MAX_STALK_BRANCHES - 360 / MAX_STALK_BRANCHES) * (Math.PI / 180);
                    const variance = baseVariance * varianceScale;

                    const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence + variance;

                    targetY = parentNode.y - 1;
                    targetX = parentNode.x + Math.cos(blendedAngle) * X_VARIANCE;
                    targetZ = parentNode.z + Math.sin(blendedAngle) * Z_VARIANCE;
                    break;
                }
                case "stalk": {
                    targetY = parentNode.y + 2;

                    if (parentNode.height === 3) {
                        const forkDirection = firstFork;
                        firstFork = firstFork * -1;

                        // Blend the forking direction with emitter influence
                        const forkAngle = Math.atan2(forkDirection, -forkDirection);

                        targetX = parentNode.x + Math.cos(forkAngle);
                        targetZ = parentNode.z + Math.sin(forkAngle);
                    } else {
                        const randomAngle = Math.random() * 2 * Math.PI;
                        const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;
                        const variance = X_VARIANCE * 0.5;

                        targetX = parentNode.x + Math.cos(blendedAngle) * variance;
                        targetZ = parentNode.z + Math.sin(blendedAngle) * variance;
                    }
                    break;
                }
                case "branch": {
                    if (parentNode.type === "stalk") {
                        const branchIndex = parentNode.children.length;
                        const anglePerBranch = 360 / MAX_STALK_BRANCHES;
                        const heightRotation = parentNode.height * 30;
                        const startAngle = heightRotation * (Math.PI / 180);
                        const baseAngle = branchIndex * anglePerBranch * (Math.PI / 180) + startAngle;

                        const baseRadius = 1.0 + 0.5;
                        const heightScale = 0.95;
                        const radius = Math.pow(heightScale, parentNode.height) * baseRadius;

                        targetX = parentNode.x + radius * Math.cos(baseAngle);
                        targetZ = parentNode.z + radius * Math.sin(baseAngle);
                        targetY = parentNode.y + (Math.random() * 2 - 1) * 0.125;
                    } else {
                        const stalkParent = findStalkParent(parentNode);
                        if (stalkParent) {
                            const dirX = parentNode.x - stalkParent.x;
                            const dirZ = parentNode.z - stalkParent.z;
                            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

                            if (length > 0) {
                                let currentAngle = Math.atan2(dirZ, dirX);
                                const varianceScale = 1 - emitterInfluence;
                                const baseVariance = ((Math.random() * 2 * 360) / MAX_STALK_BRANCHES - 360 / MAX_STALK_BRANCHES) * (Math.PI / 180);
                                const variance = baseVariance * varianceScale;

                                const blendedAngle = currentAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence + variance;

                                const baseLength = 1.0;
                                const heightScale = 0.95;
                                const growthLength = Math.pow(heightScale, stalkParent.height) * baseLength;

                                targetX = parentNode.x + Math.cos(blendedAngle) * growthLength;
                                targetZ = parentNode.z + Math.sin(blendedAngle) * growthLength;
                            } else {
                                const randomAngle = Math.random() * 2 * Math.PI;
                                const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;
                                targetX = parentNode.x + Math.cos(blendedAngle);
                                targetZ = parentNode.z + Math.sin(blendedAngle);
                            }
                        } else {
                            const randomAngle = Math.random() * 2 * Math.PI;
                            const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;
                            targetX = parentNode.x + Math.cos(blendedAngle) * 0.5;
                            targetZ = parentNode.z + Math.sin(blendedAngle) * 0.5;
                        }
                        targetY = parentNode.y + (Math.random() * 2 - 1) * 0.25;
                    }
                    break;
                }
                default:
                    targetY = parentNode.y;
                    targetX = parentNode.x;
                    targetZ = parentNode.z;
            }

            return { x: targetX, y: targetY, z: targetZ };
        }

        function findStalkParent(node) {
            let current = node;
            while (current.parent) {
                if (current.parent.type === "stalk") {
                    return current.parent;
                }
                current = current.parent;
            }
            return null;
        }

        function countChildrenOfType(node, types) {
            return node.children.filter((child) => types.includes(child.type)).length;
        }

        function findAvailableRootParent() {
            // Only include root nodes and seed node as potential parents
            const eligibleNodes = [...nodes.root];
            if (nodes.seed.length > 0) eligibleNodes.push(...nodes.seed);

            // Group nodes by their type
            const categorizedNodes = eligibleNodes.reduce((acc, node) => {
                const category = node.type === "root" ? "root" : "seed";
                if (!acc[category]) acc[category] = [];
                acc[category].push(node);
                return acc;
            }, {});

            // Check root nodes first
            if (categorizedNodes.root) {
                // Sort root nodes by depth (highest first) and number of children
                categorizedNodes.root.sort((a, b) => {
                    if (a.depth !== b.depth) return b.depth - a.depth;
                    return countChildrenOfType(a, ["root"]) - countChildrenOfType(b, ["root"]);
                });

                // Find first eligible root node
                for (const node of categorizedNodes.root) {
                    const potentialChildDepth = node.depth + 1;
                    if (potentialChildDepth <= MAX_ROOT_DEPTH && countChildrenOfType(node, ["root"]) < MAX_CHILDREN) {
                        return node;
                    }
                }
            }

            // If no suitable root nodes, return seed if available and eligible
            if (categorizedNodes.seed && categorizedNodes.seed.length > 0) {
                const seedNode = categorizedNodes.seed[0];
                if (countChildrenOfType(seedNode, ["root"]) < MAX_CHILDREN) {
                    return seedNode;
                }
            }

            return nodes.seed[0];
        }

        function findAvailableLeafParent() {
            const eligibleBranches = nodes.branch.filter((branch) => branch.leafCount < 2);

            if (eligibleBranches.length === 0) return null;

            eligibleBranches.sort((a, b) => {
                const aLeafCount = countChildrenOfType(a, ["leaf"]);
                const bLeafCount = countChildrenOfType(b, ["leaf"]);
                return aLeafCount - bLeafCount;
            });

            return eligibleBranches[0];
        }

        function getBranchInfo(node) {
            let length = 0;
            let current = node;
            let isEndpoint = true;
            while (current && current.type === "branch") {
                if (countChildrenOfType(current, ["branch"]) >= MAX_CHILDREN) {
                    isEndpoint = false;
                }
                length++;
                current = current.parent;
            }
            return { length, isEndpoint };
        }

        function findAvailableBranchParent() {
            const eligibleNodes = [...nodes.branch];
            if (nodes.stalk.length > 0) eligibleNodes.push(...nodes.stalk);

            const categorizedNodes = eligibleNodes.reduce((acc, node) => {
                const category = node.type === "branch" ? "branch" : "stalk";
                if (!acc[category]) acc[category] = [];
                acc[category].push(node);
                return acc;
            }, {});

            if (categorizedNodes.branch) {
                categorizedNodes.branch.sort((a, b) => {
                    const aInfo = getBranchInfo(a);
                    const bInfo = getBranchInfo(b);

                    if (aInfo.isEndpoint !== bInfo.isEndpoint) {
                        return aInfo.isEndpoint ? -1 : 1;
                    }
                    if (aInfo.length !== bInfo.length) {
                        return bInfo.length - aInfo.length;
                    }
                    return countChildrenOfType(a, ["branch"]) - countChildrenOfType(b, ["branch"]);
                });

                for (const node of categorizedNodes.branch) {
                    const branchInfo = getBranchInfo(node);
                    if (branchInfo.length < MAX_BRANCH_LENGTH && countChildrenOfType(node, ["branch"]) < MAX_CHILDREN) {
                        return node;
                    }
                }
            }

            if (categorizedNodes.stalk) {
                const sortedStalks = categorizedNodes.stalk
                    .filter((node) => countChildrenOfType(node, ["branch"]) < MAX_STALK_BRANCHES)
                    .sort((a, b) => {
                        const aHasBranches = countChildrenOfType(a, ["branch"]) > 0;
                        const bHasBranches = countChildrenOfType(b, ["branch"]) > 0;

                        if (aHasBranches !== bHasBranches) {
                            return bHasBranches ? 1 : -1;
                        }

                        return countChildrenOfType(b, ["branch"]) - countChildrenOfType(a, ["branch"]);
                    });

                if (sortedStalks.length > 0) {
                    return sortedStalks[0];
                }
            }

            const lastStalk = nodes.stalk[nodes.stalk.length - 1];
            return lastStalk && countChildrenOfType(lastStalk, ["branch"]) < MAX_STALK_BRANCHES ? lastStalk : null;
        }

        function hasAvailableParent(type) {
            switch (type) {
                case "root":
                    const rootParent = findAvailableRootParent();
                    return rootParent && countChildrenOfType(rootParent, ["root"]) < MAX_CHILDREN;

                case "stalk":
                    const stalkParent = nodes.stalk[nodes.stalk.length - 1] || nodes.seed[0];
                    return stalkParent != null;

                case "branch":
                    const availableStalk = nodes.stalk.some((node) => countChildrenOfType(node, ["branch"]) < MAX_STALK_BRANCHES);
                    if (availableStalk) return true;

                    return nodes.branch.some((node) => {
                        const branchInfo = getBranchInfo(node);
                        return branchInfo.length < MAX_BRANCH_LENGTH && countChildrenOfType(node, ["branch"]) < MAX_CHILDREN;
                    });

                case "leaf":
                    return nodes.branch.some((branch) => branch.leafCount < 2);

                default:
                    return false;
            }
        }

        function findParentNode(type) {
            switch (type) {
                case "root":
                    return findAvailableRootParent();

                case "stalk": {
                    const currentStalks = nodes.stalk;
                    const height3Stalks = currentStalks.filter((node) => node.height === 3 && countChildrenOfType(node, ["stalk"]) < 2);

                    if (height3Stalks.length > 0) {
                        return height3Stalks[0];
                    }

                    const leafStalks = currentStalks.filter((node) => countChildrenOfType(node, ["stalk"]) === 0);

                    if (leafStalks.length > 0) {
                        leafStalks.sort((a, b) => currentStalks.indexOf(a) - currentStalks.indexOf(b));
                        lastUsedForkIndex = (lastUsedForkIndex + 1) % leafStalks.length;
                        return leafStalks[lastUsedForkIndex];
                    }

                    return nodes.stalk[nodes.stalk.length - 1] || nodes.seed[0];
                }

                case "branch":
                    return findAvailableBranchParent();

                case "leaf":
                    return findAvailableLeafParent();

                default:
                    return null;
            }
        }

        function determineNodeType(index) {
            if (index === 0) return "seed";

            const sortedRanges = Object.entries(growthConfig)
                .map(([key, value]) => [parseInt(key), value])
                .sort((a, b) => a[0] - b[0]);

            let defaultType;
            for (const [maxIndex, type] of sortedRanges) {
                if (index <= maxIndex) {
                    defaultType = type;
                    break;
                }
            }
            if (!defaultType) {
                defaultType = sortedRanges[sortedRanges.length - 1][1];
            }

            if (defaultType === "leaf") {
                if (hasAvailableParent("leaf")) {
                    return "leaf";
                }
                defaultType = "branch";
            }

            if (hasAvailableParent(defaultType)) {
                return defaultType;
            }

            if (Math.random() < 0.3) {
                if (hasAvailableParent("root")) return "root";
                if (hasAvailableParent("stalk")) return "stalk";
            } else {
                if (hasAvailableParent("stalk")) return "stalk";
                if (hasAvailableParent("root")) return "root";
            }

            return "stalk";
        }

        function addNode(x, y, z, type, parent = null, targetPos = null) {
            const node = new Node(x, y, z, type, parent);
            nodes[type].push(node);

            if (parent) {
                parent.addChild(node);
                if (type === "leaf") {
                    parent.leafCount++;
                }
                node.parentPos = new THREE.Vector3(parent.x, parent.y, parent.z);
                node.directionVector = new THREE.Vector3(targetPos.x - parent.x, targetPos.y - parent.y, targetPos.z - parent.z).normalize();
            }

            if (targetPos) {
                node.targetX = targetPos.x;
                node.targetY = targetPos.y;
                node.targetZ = targetPos.z;
            }

            // Get the current dominant note, default to 'C' if no notes detected
            const currentNote = detectedNotes.value.length > 0 ? detectedNotes.value[0].name : "C4";

            let nodeMesh;
            if (type === "leaf") {
                // Use getNoteMaterial for leaf material
                // let leafMaterial = getNoteMaterial(currentNote, "leaf").clone();
                // nodeMesh = new THREE.Mesh(leafGeometry, leafMaterial);
                nodeMesh = getNoteMesh(currentNote, "leaf").clone();
                nodeMesh.castShadow = true;
                nodeMesh.receiveShadow = true;
                nodeMesh.scale.set(0, 0, 0);
                node.targetScale = 1;

                const transform = calculateLeafTransform(node, 0);
                nodeMesh.position.copy(transform.position);
                nodeMesh.quaternion.copy(transform.rotation);
            } else {
                // For non-leaf nodes, use regular geometry but with note-based material
                // nodeMesh = new THREE.Mesh(nodeGeometry, getNoteMaterial(currentNote, type).clone());
                nodeMesh = new THREE.Mesh(nodeGeometry, new THREE.MeshStandardMaterial({ color: 0x000000 }));
            }

            nodeMesh.position.set(x, y, z);
            nodeObjects.add(nodeMesh);
            node.mesh = nodeMesh;

            if (parent && type !== "leaf") {
                if (type === "stalk" && isStalkLoaded) {
                    // let stalkMaterial = getNoteMaterial(currentNote, "stalk").clone();
                    // const stalkMesh = new THREE.Mesh(stalkGeometry, stalkMaterial);
                    const stalkMesh = getNoteMesh(currentNote, "stalk").clone();
                    const transform = calculateStalkTransform(node.parentPos, { x, y, z }, 0);
                    stalkMesh.position.copy(transform.position);
                    stalkMesh.quaternion.copy(transform.rotation);
                    stalkMesh.scale.copy(transform.scale);
                    stalkMesh.castShadow = true;
                    stalkMesh.receiveShadow = true;
                    nodeObjects.add(stalkMesh);
                    node.connectionMesh = stalkMesh;
                    node.connectionLine = null;
                } else if (type === "branch" && isBranchLoaded) {
                    // let branchMaterial = getNoteMaterial(currentNote, "branch").clone();
                    // const branchMesh = new THREE.Mesh(branchGeometry, branchMaterial);
                    const branchMesh = getNoteMesh(currentNote, "branch").clone();
                    const transform = calculateBranchTransform(node.parentPos, { x, y, z }, 0);
                    branchMesh.position.copy(transform.position);
                    branchMesh.quaternion.copy(transform.rotation);
                    branchMesh.scale.copy(transform.scale);
                    branchMesh.castShadow = true;
                    branchMesh.receiveShadow = true;
                    nodeObjects.add(branchMesh);
                    node.connectionMesh = branchMesh;
                    node.connectionLine = null;

                    let depth = node.depth;
                    if (depth === MAX_BRANCH_LENGTH - 1) {
                        // const flowerMesh = new THREE.Mesh(flowerGeometry, flowerMaterial);
                        const flowerMesh = getNoteMesh(currentNote, "flower").clone();
                        const transform = calculateFlowerTransform(node);
                        flowerMesh.position.copy(transform.position);
                        flowerMesh.quaternion.copy(transform.rotation);
                        flowerMesh.scale.set(0, 0, 0);
                        flowerMesh.castShadow = true;
                        flowerMesh.receiveShadow = true;
                        flowerMesh.userData.isFlower = true;
                        nodeObjects.add(flowerMesh);
                    }
                } else if (type === "root" && isRootLoaded) {
                    // let rootMaterial = getNoteMaterial(currentNote, "root").clone();
                    // const rootMesh = new THREE.Mesh(rootGeometry, rootMaterial);
                    const rootMesh = getNoteMesh(currentNote, "root").clone();
                    const transform = calculateRootTransform(node.parentPos, { x, y, z }, 0);
                    rootMesh.position.copy(transform.position);
                    rootMesh.quaternion.copy(transform.rotation);
                    rootMesh.scale.copy(transform.scale);
                    rootMesh.castShadow = true;
                    rootMesh.receiveShadow = true;
                    nodeObjects.add(rootMesh);
                    node.connectionMesh = rootMesh;
                    node.connectionLine = null;
                } else {
                    const connectionGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(parent.x, parent.y, parent.z), new THREE.Vector3(x, y, z)]);
                    let fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                    const connectionLine = new THREE.Line(connectionGeometry, fallbackMaterial);
                    connectionObjects.add(connectionLine);
                    node.connectionLine = connectionLine;
                    node.connectionMesh = null;
                }
            }

            return node;
        }

        const animate = (currentTime) => {
            animationFrameId = requestAnimationFrame(animate);

            // Initialize start time on first frame
            if (startTime === null) {
                startTime = currentTime;
                nextGrowthTime = currentTime;
                currentGrowthStartTime = currentTime;
                animationStartTime = currentTime;
            }

            // Sync timing with audio playback
            audioTime = isPlaying.value ? Date.now() - playbackStartTime.value : 0;
            elapsedTime = audioTime;

            // Update water
            updateWater(currentTime);

            // Update music emitter
            updateMusicEmitterPosition();

            // Only proceed if models are loaded
            if (isPlaying.value && isStalkLoaded && isBranchLoaded) {
                animatePlantWithBPM(audioTime);
                updateInnerSpherePulse(audioTime);
                updateNotes();
            } else if (activeNotes.length > 0) {
                updateNotes();
            }

            if (!isCompleted) {
                camera.lookAt(cameraTarget);
            } else {
                // if (!controls.enablePan) {
                //     controls.enablePan = true;
                // }
                controls.update();
            }
            renderer.render(scene, camera);
            lastTime = currentTime;
        };

        function animatePlantWithBPM(currentTime) {
            const maxIndex = Math.max(...Object.keys(growthConfig).map(Number));
            const currentBeatDuration = MS_PER_MINUTE / currBPM.value;
            const currentQuarterBeatDuration = currentBeatDuration / 4;

            // Check if it's time for the next growth
            if (currentTime >= nextGrowthTime && !currentNode && currentIndex <= maxIndex) {
                const type = determineNodeType(currentIndex);

                if (type === null) {
                    currentIndex++;
                    nextGrowthTime = currentTime + MS_PER_QUARTER_BEAT;
                    return;
                }

                // Create new node
                if (currentIndex === 0) {
                    currentNode = addNode(0, 0, 0, type, null, { x: 0, y: 0, z: 0 });
                } else {
                    const parent = findParentNode(type);
                    if (!parent) {
                        currentIndex++;
                        nextGrowthTime = currentTime + MS_PER_QUARTER_BEAT;
                        return;
                    }
                    const targetPos = calculateTargetPosition(parent, type);
                    currentNode = addNode(parent.x, parent.y, parent.z, type, parent, targetPos);

                    if (type === "stalk" && currentNode.height > lastStalkHeight) {
                        lastStalkHeight = currentNode.height;
                        animateCameraForStalk();
                    } else if (type === "branch" && parent.type === "stalk") {
                        animateCameraForBranch(parent);
                    }
                }

                // Set the start time for this growth animation
                currentGrowthStartTime = audioTime;
                nextGrowthTime = audioTime + currentQuarterBeatDuration;
            }

            // If we have a current node, animate it
            if (currentNode) {
                latestNodePosition = { x: currentNode.x, y: currentNode.y, z: currentNode.z };
                // Calculate progress for this growth animation
                const growthProgress = Math.min(1, (audioTime - currentGrowthStartTime) / currentQuarterBeatDuration);

                if (currentNode.type === "leaf") {
                    // Animate leaf scaling
                    const newScale = currentNode.targetScale * growthProgress;
                    currentNode.mesh.scale.set(newScale, newScale, newScale);
                } else {
                    // Animate node movement
                    const startX = currentNode.parent ? currentNode.parent.x : currentNode.x;
                    const startY = currentNode.parent ? currentNode.parent.y : currentNode.y;
                    const startZ = currentNode.parent ? currentNode.parent.z : currentNode.z;

                    currentNode.x = startX + (currentNode.targetX - startX) * growthProgress;
                    currentNode.y = startY + (currentNode.targetY - startY) * growthProgress;
                    currentNode.z = startZ + (currentNode.targetZ - startZ) * growthProgress;

                    // Update mesh position
                    currentNode.mesh.position.set(currentNode.x, currentNode.y, currentNode.z);

                    // Update connection visualization
                    if (currentNode.connectionMesh && currentNode.parentPos) {
                        const currentPos = {
                            x: currentNode.x,
                            y: currentNode.y,
                            z: currentNode.z,
                        };

                        let transform;
                        if (currentNode.type === "branch") {
                            transform = calculateBranchTransform(currentNode.parentPos, currentPos, growthProgress);
                        } else if (currentNode.type === "stalk") {
                            transform = calculateStalkTransform(currentNode.parentPos, currentPos, growthProgress);
                        } else if (currentNode.type === "root") {
                            transform = calculateRootTransform(currentNode.parentPos, currentPos, growthProgress);
                        }

                        if (transform) {
                            currentNode.connectionMesh.position.copy(transform.position);
                            currentNode.connectionMesh.quaternion.copy(transform.rotation);
                            currentNode.connectionMesh.scale.copy(transform.scale);
                        }
                    }
                }

                // If growth is complete, prepare for next node
                if (growthProgress >= 1) {
                    // Ensure final position is set
                    if (currentNode.type === "leaf") {
                        currentNode.mesh.scale.set(currentNode.targetScale, currentNode.targetScale, currentNode.targetScale);
                    } else {
                        currentNode.x = currentNode.targetX;
                        currentNode.y = currentNode.targetY;
                        currentNode.z = currentNode.targetZ;
                        currentNode.mesh.position.set(currentNode.x, currentNode.y, currentNode.z);

                        if (currentNode.connectionMesh && currentNode.parentPos) {
                            let finalTransform;
                            if (currentNode.type === "branch") {
                                finalTransform = calculateBranchTransform(currentNode.parentPos, currentNode, 1);
                            } else if (currentNode.type === "stalk") {
                                finalTransform = calculateStalkTransform(currentNode.parentPos, currentNode, 1);
                            } else if (currentNode.type === "root") {
                                finalTransform = calculateRootTransform(currentNode.parentPos, currentNode, 1);
                            }

                            if (finalTransform) {
                                currentNode.connectionMesh.position.copy(finalTransform.position);
                                currentNode.connectionMesh.quaternion.copy(finalTransform.rotation);
                                currentNode.connectionMesh.scale.copy(finalTransform.scale);
                            }
                        }
                    }

                    currentNode = null;
                    currentIndex++;
                }
            }
        }
        animate(0);
    };

    function saveArrayBuffer(buffer, filename) {
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || "scene.glb";
        link.click();
        URL.revokeObjectURL(url);
    }

    function ensureTRSCompatible(object) {
        object.traverse((node) => {
            if (node.isObject3D) {
                // Decompose the current matrix
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();

                // Get the world matrix
                const matrix = node.matrix.clone();

                // Try to decompose
                if (!matrix.decompose(position, quaternion, scale)) {
                    // If decomposition fails, reset to identity transformation
                    node.position.set(0, 0, 0);
                    node.quaternion.identity();
                    node.scale.set(1, 1, 1);
                } else {
                    // Apply decomposed transformation
                    node.position.copy(position);
                    node.quaternion.copy(quaternion);
                    node.scale.copy(scale);
                }

                // Ensure matrix is not directly set
                node.matrixAutoUpdate = true;
                node.updateMatrix();
            }
        });
    }

    function optimizeMaterials(scene) {
        const materialMap = new Map();

        scene.traverse((node) => {
            if (node.isMesh && node.material) {
                // Create a key based on material properties
                const key = JSON.stringify({
                    color: node.material.color ? node.material.color.getHex() : null,
                    type: node.material.type,
                    transparent: node.material.transparent,
                    opacity: node.material.opacity,
                });

                if (!materialMap.has(key)) {
                    materialMap.set(key, node.material.clone());
                }

                // Reuse existing material
                node.material = materialMap.get(key);
            }
        });
    }

    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    const db = getFirestore(app);

    // Function to get and increment counter
    async function getNextId() {
        const counterRef = doc(db, "counters", "plants");

        try {
            const newId = await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);

                if (!counterDoc.exists()) {
                    // Initialize counter if it doesn't exist
                    transaction.set(counterRef, { value: 1 });
                    return 0;
                }

                const newValue = counterDoc.data().value;
                transaction.update(counterRef, { value: newValue + 1 });
                return newValue;
            });

            return newId;
        } catch (error) {
            console.error("Error getting next ID:", error);
            throw error;
        }
    }

    // Function to upload file and store reference
    async function uploadPlantToCloud(buffer, filename) {
        try {
            // 1. Get next ID
            const plantId = await getNextId();

            // 2. Upload file to storage
            const fileRef = storageRef(storage, `plants/${filename}`);
            const blob = new Blob([buffer], { type: "application/octet-stream" });
            const snapshot = await uploadBytes(fileRef, blob);

            // 3. Store reference in Firestore
            const plantRef = doc(db, "plants", plantId.toString());
            await setDoc(plantRef, {
                id: plantId,
                storageLink: snapshot.ref.fullPath,
                createdAt: new Date().toISOString(),
            });

            return {
                success: true,
                id: plantId,
                url: snapshot.ref.fullPath,
                message: "Plant uploaded and stored successfully",
            };
        } catch (error) {
            console.error("Error in upload process:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Modified save function
    async function savePlantToCloud(scene, fileName) {
        if (!scene) {
            console.error("Scene not initialized");
            return;
        }

        const exportScene = scene.clone(true);

        // Remove UI elements and helpers
        exportScene.traverse((object) => {
            if (object.userData.isUI || object.isHelper || (object.type === "Line" && object.userData.isHelper)) {
                object.removeFromParent();
            }
        });

        ensureTRSCompatible(exportScene);
        optimizeMaterials(exportScene);

        const options = {
            binary: true,
            maxTextureSize: 4096,
            animations: [],
            includeCustomExtensions: false,
            onlyVisible: true,
            trs: true,
        };

        const exporter = new GLTFExporter();

        return new Promise((resolve, reject) => {
            exporter.parse(
                exportScene,
                async (result) => {
                    try {
                        const uploadResult = await uploadPlantToCloud(result, fileName);

                        // Clean up
                        exportScene.traverse((object) => {
                            if (object.geometry) {
                                object.geometry.dispose();
                            }
                            if (object.material) {
                                object.material.dispose();
                            }
                        });

                        resolve(uploadResult);
                    } catch (error) {
                        reject(error);
                    }
                },
                (error) => {
                    reject(error);
                },
                options,
            );
        });
    }

    async function onSaveClick() {
        if (!scene) {
            console.error("Scene not initialized");
            return;
        }

        try {
            isUploading.value = true;
            const fileName = `${props.id}.glb`;
            const result = await savePlantToCloud(scene, fileName);

            if (result.success) {
                console.log("File uploaded successfully:", result);
                uploadComplete.value = true;
            } else {
                console.error("Upload failed:", result.error);
            }
        } catch (error) {
            console.error("Error saving plant:", error);
        } finally {
            isUploading.value = false;
        }
    }

    function onViewClick() {
        // Open display page in new tab
        window.open(`/display/${props.id}`, "_blank");
        // Redirect current page to home
        window.location.href = "/";
    }

    // Lifecycle hooks
    onMounted(() => {
        resetState();
        socket.value = initializeSocket();
    });

    onUnmounted(() => {
        if (socket.value) {
            socket.value.disconnect();
        }
        resetState();
        if (audioContext.value) {
            audioContext.value.close();
        }
    });

    window.addEventListener("resize", onWindowResize, false);
    function onWindowResize() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
</script>

<style scoped>
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
