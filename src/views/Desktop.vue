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
                            <!-- Music Direction Slider -->
                            <div class="bg-gray-700 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-white mb-2">Music Direction</h3>
                                <div class="flex items-center space-x-4">
                                    <span class="text-gray-300">Left</span>
                                    <input
                                        type="range"
                                        v-model="musicDirection"
                                        min="0"
                                        max="100"
                                        class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                        @input="updateChannelVolumes" />
                                    <span class="text-gray-300">Right</span>
                                </div>
                                <div class="flex justify-between text-gray-400 mt-1">
                                    <span>L: {{ leftVolume }}%</span>
                                    <span>R: {{ rightVolume }}%</span>
                                </div>
                            </div>
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

                    <div class="bg-gray-800/90 rounded-lg p-4 max-w-full text-white">
                        <h2 class="text-xl font-bold mb-2">Detected Notes</h2>
                        <div class="space-y-2">
                            <div
                                v-if="detectedNotes.length"
                                class="flex flex-row w-full h-[22vh] overflow-hidden flex-wrap justify-between">
                                <div
                                    v-for="note in detectedNotes"
                                    :key="note.name"
                                    class="bg-gray-700 w-1/6 h-[10vh] rounded p-2 flex justify-between items-center m-2">
                                    <span class="font-medium">{{ note.name }}</span>
                                    <div class="text-sm text-gray-300">
                                        <span>{{ note.frequency }}</span>
                                    </div>
                                </div>
                            </div>
                            <div
                                v-else
                                class="text-gray-400 text-sm">
                                No notes detected
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

    // Add new audio control refs
    const musicDirection = ref(50);
    const leftVolume = computed(() => 100 - musicDirection.value);
    const rightVolume = computed(() => musicDirection.value);
    const leftGainNode = ref(null);
    const rightGainNode = ref(null);

    const mobileUrl = `${window.location.origin}/mobile/${props.id}`;

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

            function findSignificantFrequencies(spectrum) {
                const AMPLITUDE_THRESHOLD = 200; // Adjusted threshold
                let frequencies = [];
                let bandStart = -1;
                let bandEnd = -1;

                for (let i = 0; i < spectrum.length; i++) {
                    if (spectrum[i] > AMPLITUDE_THRESHOLD) {
                        if (bandStart === -1) bandStart = i;
                        bandEnd = i;
                    } else if (bandEnd !== -1) {
                        let centerBin = (bandStart + bandEnd) / 2;
                        let frequency = (centerBin * audioContext.value.sampleRate) / analyzer.fftSize;
                        frequencies.push(frequency);
                        bandStart = -1;
                        bandEnd = -1;
                    }
                }

                if (bandStart !== -1 && bandEnd !== -1) {
                    let centerBin = (bandStart + bandEnd) / 2;
                    let frequency = (centerBin * audioContext.value.sampleRate) / analyzer.fftSize;
                    frequencies.push(frequency);
                }

                return frequencies;
            }

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

                // Find significant frequencies
                const significantFreqs = findSignificantFrequencies(dataArray);

                // Convert frequencies to notes
                const detected = significantFreqs
                    .map((freq) => findNearestNote(freq))
                    .filter((note, index, self) => index === self.findIndex((n) => n.name === note.name))
                    .sort((a, b) => a.freq - b.freq)
                    .map((note) => ({
                        name: note.name,
                        noteName: note.name.slice(0, -1),
                        octave: parseInt(note.name.slice(-1)),
                        frequency: `${note.freq.toFixed(2)} Hz`,
                    }));

                // Update the reactive ref
                detectedNotes.value = detected;

                // Still keep the console log if desired
                if (Date.now() % 500 < 50 && detected.length > 0) {
                    console.log("Detected Notes:", {
                        notes: detected,
                        timestamp: new Date().toISOString(),
                    });
                }

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

    function updateChannelVolumes() {
        if (leftGainNode.value && rightGainNode.value) {
            const leftGain = (leftVolume.value / 100) * (musicVolume.value / 100) * 2;
            const rightGain = (rightVolume.value / 100) * (musicVolume.value / 100) * 2;

            leftGainNode.value.gain.value = leftGain;
            rightGainNode.value.gain.value = rightGain;

            // console.log("Updated channel volumes:", { leftGain, rightGain });
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
