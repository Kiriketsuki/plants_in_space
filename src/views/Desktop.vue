<template>
    <div class="max-h-screen overflow-x-hidden bg-gray-900 p-4">
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
                    <img
                        :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUrl)}`"
                        alt="QR Code"
                        class="w-48 h-48" />
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
                                Waiting for songs to be selected...
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
</template>

<script setup>
    import { ref, computed, onMounted, onUnmounted } from "vue";
    import { io } from "socket.io-client";

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

    const mobileUrl = `${window.location.origin}/mobile/${props.id}`;

    // Computed properties
    const allFilesLoaded = computed(() => {
        return selectedSongs.value.every((song) => songFiles.value.has(song.id));
    });

    // Utility functions
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    // Socket initialization
    function initializeSocket() {
        // const url = `http://${window.location.hostname}:3000`;
        const url = "https://plants-in-space-socket.onrender.com";
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
        socket.value.on("growth-started", ({ songs, growthTime: time, distributions }) => {
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
            selectedSongs.value = songs;
            growthTime.value = time;
            songDistributions.value = distributions || {};
            growthActive.value = true;
            audioStatus.value = "Ready to play";

            console.log("State initialized:", {
                songCount: selectedSongs.value.length,
                distributions: songDistributions.value,
                duration: growthTime.value,
            });
        });

        // Also add error logging to help debug
        socket.value.on("error", (err) => {
            console.error("Socket error:", err);
            error.value = `Socket error: ${err.message}`;
        });

        socket.value.on("volume-updated", ({ volume }) => {
            if (currentAudio.value) {
                currentAudio.value.gainNode.gain.value = volume / 100;
            }
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

    async function playAudioBuffer(audioBuffer, duration) {
        try {
            if (!audioContext.value) {
                audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
                await audioContext.value.resume();
            }

            const source = audioContext.value.createBufferSource();
            const gainNode = audioContext.value.createGain();

            source.buffer = audioBuffer;
            source.connect(gainNode);
            gainNode.connect(audioContext.value.destination);
            gainNode.gain.value = musicVolume.value / 100;

            source.loop = true;
            source.start(0);

            console.log("Audio playback started:", {
                bufferDuration: audioBuffer.duration,
                playbackDuration: duration,
            });

            return { source, gainNode };
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
        console.log("Stopping playback");
        isPlaying.value = false;
        audioStatus.value = "Stopped";

        if (currentAudio.value) {
            try {
                currentAudio.value.source.stop();
                currentAudio.value = null;
            } catch (err) {
                console.error("Error stopping audio:", err);
            }
        }

        if (playbackInterval.value) {
            clearInterval(playbackInterval.value);
            playbackInterval.value = null;
        }

        currentSong.value = 0;
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

        if (currentAudio.value) {
            currentAudio.value.source.stop();
            currentAudio.value = null;
        }

        if (playbackInterval.value) {
            clearInterval(playbackInterval.value);
            playbackInterval.value = null;
        }
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
</script>

<style scoped>
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
