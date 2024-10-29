<template>
    <div class="max-h-screen overflow-x-hidden bg-gray-900 p-4">
        <!-- Connection Status -->
        <div class="absolute top-4 right-4 z-50">
            <div class="p-3 bg-gray-800 rounded text-sm text-white">
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
                <p>Player Status: {{ playerStatus }}</p>
                <p v-if="deviceId">Device ID: {{ deviceId }}</p>
                <p
                    v-if="error"
                    class="text-red-400 mt-1">
                    {{ error }}
                </p>
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex flex-col items-center justify-center min-h-screen">
            <!-- Waiting State -->
            <div
                v-if="!spotifyToken"
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
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-2xl font-bold mb-6 text-white">Selected Songs</h2>

                    <div
                        v-if="selectedSongs.length === 0"
                        class="text-gray-400 text-center py-8">
                        No songs selected yet
                    </div>

                    <!-- Song List -->
                    <div class="space-y-6">
                        <div
                            v-for="(song, index) in selectedSongs"
                            :key="song.id"
                            class="bg-gray-700 rounded-lg overflow-x-hidden"
                            :class="{ 'border-2 border-green-500': currentSong === index }">
                            <div class="p-4 flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <img
                                        :src="song.album.images[0].url"
                                        class="w-16 h-16 rounded"
                                        alt="Album art" />
                                    <div>
                                        <h3 class="text-white font-bold">{{ song.name }}</h3>
                                        <p class="text-gray-400">
                                            {{ song.artists.map((a) => a.name).join(", ") }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Growth Information -->
                    <div
                        v-if="growthActive && spotifyToken"
                        class="mt-6 bg-gray-800 rounded-lg p-6">
                        <h2 class="text-2xl font-bold mb-6 text-white">Growth Settings</h2>

                        <div class="space-y-4">
                            <div class="bg-gray-700 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-white mb-2">Total Growth Time</h3>
                                <p class="text-gray-300">{{ growthTime }} seconds ({{ totalGrowthTimeMs.toLocaleString() }}ms)</p>
                            </div>

                            <div class="bg-gray-700 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-white mb-2">Song Playlist</h3>
                                <div class="space-y-3">
                                    <div
                                        v-for="(item, index) in songPlaylist"
                                        :key="item.song.id"
                                        class="bg-gray-600 rounded-lg p-3">
                                        <div class="flex justify-between items-center">
                                            <div class="text-white">
                                                <p class="font-medium">{{ item.song.name }}</p>
                                                <p class="text-sm text-gray-300">by {{ item.song.artists.map((a) => a.name).join(", ") }}</p>
                                            </div>
                                            <div class="text-right">
                                                <p class="text-green-400 font-medium">{{ item.distribution }}%</p>
                                                <p class="text-sm text-gray-300">{{ (item.duration / 1000).toFixed(1) }}s</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Total Verification -->
                            <div class="bg-gray-700 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-white mb-2">Verification</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <p class="text-gray-300">Total Distribution:</p>
                                        <p class="text-white font-medium">{{ songPlaylist.reduce((sum, item) => sum + item.distribution, 0) }}%</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-300">Total Duration:</p>
                                        <p class="text-white font-medium">{{ (songPlaylist.reduce((sum, item) => sum + item.duration, 0) / 1000).toFixed(1) }}s</p>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-gray-700 rounded-lg p-4 mt-4">
                                <h3 class="text-lg font-semibold text-white mb-2">Playlist Status</h3>
                                <div class="flex items-center space-x-2">
                                    <div
                                        class="w-3 h-3 rounded-full"
                                        :class="{
                                            'bg-green-500 animate-pulse': playlistActive,
                                            'bg-gray-500': !playlistActive,
                                        }"></div>
                                    <p class="text-white">
                                        {{ playlistActive ? "Playing" : "Stopped" }}
                                    </p>
                                </div>
                                <div
                                    v-if="playlistActive && currentSong !== null"
                                    class="mt-2">
                                    <p class="text-gray-300">
                                        Currently playing:
                                        <span class="text-white">
                                            {{ songPlaylist[currentSong]?.song.name }}
                                        </span>
                                    </p>
                                    <p class="text-gray-400 text-sm">Duration: {{ (songPlaylist[currentSong]?.duration / 1000).toFixed(1) }}s</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="showPermissionDialog"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md">
                <h3 class="text-xl font-bold text-white mb-4">Enable Audio Playback</h3>
                <p class="text-gray-300 mb-6">To play music, we need your permission to enable audio playback. Please click the button below to enable playback.</p>
                <button
                    @click="
                        async () => {
                            await requestAutoplayPermission();
                            if (hasAutoplayPermission.value) {
                                showPermissionDialog.value = false;
                            }
                        }
                    "
                    class="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors">
                    Enable Audio
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, onBeforeUnmount } from "vue";
    import { io } from "socket.io-client";

    const props = defineProps(["id"]);
    const error = ref("");
    const connectionStatus = ref("Disconnected");
    const selectedSongs = ref([]);

    // music player
    const player = ref(null);
    const playerStatus = ref("Not initialized");
    const isPlaying = ref(false);
    const deviceId = ref(null);
    const currentSong = ref(0);
    const musicVolume = ref(50);

    // connection to spotify
    const spotifyToken = ref(null);
    const initializationAttempts = ref(0);
    const MAX_INITIALIZATION_ATTEMPTS = 5;
    const RETRY_DELAY = 3000; // 3 seconds

    // growth settings
    const growthTime = ref(null);
    const distributions = ref({});
    const growthActive = ref(false);
    const totalGrowthTimeMs = ref(0);

    // playlist controls
    const songPlaylist = ref([]);
    const playlistActive = ref(false);
    const playlistStartTime = ref(null);
    const playlistInterval = ref(null);

    let initializationTimer = null;

    // for autoplay
    const hasAutoplayPermission = ref(false);
    const showPermissionDialog = ref(false);

    // Add this function to request permission
    async function requestAutoplayPermission() {
        showPermissionDialog.value = true;
        return new Promise((resolve) => {
            // Create a valid silent audio context instead of using an audio element
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Set the gain to 0 (silent)
            gainNode.gain.value = 0;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Start and immediately stop to test autoplay
            try {
                oscillator.start(0);
                oscillator.stop(0.001);
                hasAutoplayPermission.value = true;
                showPermissionDialog.value = false;
                resolve(true);
            } catch (error) {
                console.log("Autoplay not allowed:", error);
                hasAutoplayPermission.value = false;
                resolve(false);
            }

            // Cleanup
            setTimeout(() => {
                audioContext.close();
            }, 1000);
        });
    }

    let socket;
    const mobileUrl = `${window.location.origin}/mobile/${props.id}`;

    function retryInitialization(token) {
        console.log(`Retry attempt ${initializationAttempts.value + 1} of ${MAX_INITIALIZATION_ATTEMPTS}`);
        initializationAttempts.value++;

        if (initializationAttempts.value < MAX_INITIALIZATION_ATTEMPTS) {
            console.log(`Retrying initialization in ${RETRY_DELAY / 1000} seconds...`);
            clearTimeout(initializationTimer);
            initializationTimer = setTimeout(() => {
                initializePlayer(token);
            }, RETRY_DELAY);
        }
    }

    function initializeSocket() {
        const url = `http://${window.location.hostname}:3000`;
        // const url = "wss://us-central1-plants-in-space.cloudfunctions.net/app/";
        // const url = "https://plants-in-space-socket.onrender.com";
        connectionStatus.value = "Connecting";
        resetState();

        socket = io(url, {
            transports: ["websocket", "polling"],
            reconnection: true,
        });

        socket.on("connect", () => {
            console.log("Connected to server");
            connectionStatus.value = "Connected";
            socket.emit("join-room", props.id);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from server");
            connectionStatus.value = "Disconnected";
            resetState();
        });

        socket.on("get-client-type", () => {
            socket.emit("client-type-response", "desktop");
        });

        socket.on("mobile-disconnected", () => {
            error.value = "Mobile client disconnected";
            resetState();
        });

        socket.on("spotify-token-updated", async ({ token }) => {
            console.log("Received Spotify token");
            spotifyToken.value = token;
            connectionStatus.value = "Connected";
            await initializePlayer(token);
        });

        socket.on("songs-updated", async ({ songs }) => {
            if (isPlaying.value) {
                await pausePlayback();
            }
            resetPlaybackState();
            selectedSongs.value = songs;
        });

        socket.on("growth-started", async ({ songs, growthTime: time, distributions: dist }) => {
            console.log("Received growth start signal");
            growthTime.value = time;
            distributions.value = dist;
            growthActive.value = true;

            // Clean up any existing playlist
            cleanupPlaylist();

            // Update selected songs if they've changed
            selectedSongs.value = songs;

            // Calculate the song playlist with durations
            songPlaylist.value = calculateSongPlaylist(songs, time, dist);

            // Log the calculated playlist
            console.log(
                "Starting playlist playback:",
                songPlaylist.value.map((item) => ({
                    songName: item.song.name,
                    durationMs: item.duration,
                    distribution: item.distribution,
                })),
            );

            // Start playlist playback
            await playPlaylist();
        });

        socket.on("volume-updated", ({ volume }) => {
            musicVolume.value = volume;
            if (player.value) {
                player.value.setVolume(volume / 100);
            }
        });

        socket.on("toggle-playback", async () => {
            if (!hasAutoplayPermission.value) {
                const granted = await requestAutoplayPermission();
                if (!granted) {
                    error.value = "Please enable audio playback to play music";
                    return;
                }
            }

            try {
                const state = await player.value.getCurrentState();
                const currentSpotifyTrack = state?.track_window?.current_track;
                const desiredTrack = selectedSongs.value[currentSong.value];

                // Check if we need to start a new song
                const needsNewSong = !currentSpotifyTrack || currentSpotifyTrack.uri !== desiredTrack.uri;

                if (needsNewSong) {
                    // Wrong song or no song playing, start the correct one
                    await playCurrentSong();
                } else if (state.paused) {
                    // Correct song is loaded but paused, resume playback
                    await player.value.resume();
                    isPlaying.value = true;
                    updatePlaybackStatus();
                } else {
                    // Correct song is playing, pause it
                    await player.value.pause();
                    isPlaying.value = false;
                    updatePlaybackStatus();
                }
            } catch (err) {
                error.value = `Playback control error: ${err.message}`;
                console.error("Playback control error:", err);
            }
        });

        // Update the next song handler
        socket.on("next-song", async () => {
            if (selectedSongs.value.length === 0) return;

            try {
                if (isPlaying.value) {
                    await stopPlayback();
                }

                // Loop to the beginning if at the end
                if (currentSong.value >= selectedSongs.value.length - 1) {
                    currentSong.value = 0;
                } else {
                    currentSong.value++;
                }
                updatePlaybackStatus();

                // Play the next song
                await playCurrentSong();
            } catch (err) {
                error.value = `Error switching to next track: ${err.message}`;
            }
        });

        // Update the previous song handler
        socket.on("previous-song", async () => {
            if (selectedSongs.value.length === 0) return;

            try {
                if (isPlaying.value) {
                    await stopPlayback();
                }

                // Loop to the end if at the beginning
                if (currentSong.value <= 0) {
                    currentSong.value = selectedSongs.value.length - 1;
                } else {
                    currentSong.value--;
                }
                updatePlaybackStatus();

                // Play the previous song
                await playCurrentSong();
            } catch (err) {
                error.value = `Error switching to previous track: ${err.message}`;
            }
        });

        socket.on("initial-state", async (state) => {
            if (state.spotifyToken) {
                spotifyToken.value = state.spotifyToken;
                await initializePlayer(state.spotifyToken);
            }
            if (state.selectedSongs) {
                selectedSongs.value = state.selectedSongs;
            }
        });

        return socket;
    }

    async function initializePlayer(token) {
        if (!token) return;

        if (playerStatus.value === "Active") {
            console.log("Player already active, skipping initialization");
            clearTimeout(initializationTimer);
            return;
        }

        clearTimeout(initializationTimer);

        if (initializationAttempts.value >= MAX_INITIALIZATION_ATTEMPTS) {
            error.value = "Failed to initialize Spotify player after multiple attempts";
            playerStatus.value = "Failed";
            return;
        }

        try {
            playerStatus.value = "Initializing";

            if (!document.getElementById("spotify-player")) {
                const script = document.createElement("script");
                script.id = "spotify-player";
                script.src = "https://sdk.scdn.co/spotify-player.js";
                document.body.appendChild(script);
            } else {
                // delete and re-add the script to re-trigger the load
                const script = document.getElementById("spotify-player");
                script.remove();
                const newScript = document.createElement("script");
                newScript.id = "spotify-player";
                newScript.src = "https://sdk.scdn.co/spotify-player.js";
                document.body.appendChild(newScript);
            }

            window.onSpotifyWebPlaybackSDKReady = () => {
                playerStatus.value = "SDK Ready";
                const spotifyPlayer = new window.Spotify.Player({
                    name: "Plant Music Player",
                    getOAuthToken: (cb) => {
                        cb(token);
                    },
                    volume: musicVolume.value / 100,
                });

                // Error handling
                spotifyPlayer.addListener("initialization_error", ({ message }) => {
                    error.value = `Player Init Error: ${message}`;
                    playerStatus.value = "Initialization Error";
                    retryInitialization(token);
                });

                spotifyPlayer.addListener("authentication_error", ({ message }) => {
                    error.value = `Player Auth Error: ${message}`;
                    playerStatus.value = "Authentication Error";
                    retryInitialization(token);
                });

                spotifyPlayer.addListener("account_error", ({ message }) => {
                    error.value = `Premium Account Required: ${message}`;
                    playerStatus.value = "Account Error";
                    // Don't retry for account errors as they're likely permanent
                });

                spotifyPlayer.addListener("playback_error", ({ message }) => {
                    error.value = `Playback Error: ${message}`;
                    if (!player.value || playerStatus.value !== "Active") {
                        playerStatus.value = "Playback Error";
                        retryInitialization(token);
                    }
                });

                // Playback status updates
                spotifyPlayer.addListener("player_state_changed", async (state) => {
                    if (state) {
                        isPlaying.value = !state.paused;

                        // Verify the current track whenever the state changes
                        const isCorrectTrack = await verifyCurrentTrack();
                        if (!isCorrectTrack && isPlaying.value) {
                            // If wrong track is playing, switch to the correct one
                            await playCurrentSong();
                        }

                        updatePlaybackStatus(state);
                    }
                });

                // Ready
                spotifyPlayer.addListener("ready", async ({ device_id }) => {
                    console.log("Spotify player ready");
                    playerStatus.value = "Ready";
                    player.value = spotifyPlayer;
                    deviceId.value = device_id;
                    initializationAttempts.value = 0;

                    try {
                        // Request permission when device is ready
                        if (!hasAutoplayPermission.value) {
                            await requestAutoplayPermission();
                        }

                        playerStatus.value = "Transferring Playback";
                        await transferPlayback(device_id);
                        playerStatus.value = "Active";
                        console.log("Player is now active");
                    } catch (err) {
                        error.value = `Failed to transfer playback: ${err.message}`;
                        playerStatus.value = "Transfer Failed";
                        retryInitialization(token);
                    }
                });

                // Not Ready
                spotifyPlayer.addListener("not_ready", ({ device_id }) => {
                    console.log("Spotify player not ready");
                    playerStatus.value = "Not Ready";
                    deviceId.value = null;
                    retryInitialization(token);
                });

                console.log("Attempting to connect Spotify player");
                playerStatus.value = "Connecting";
                spotifyPlayer
                    .connect()
                    .then((success) => {
                        if (!success) {
                            console.log("Failed to connect to Spotify");
                            playerStatus.value = "Connection Failed";
                            retryInitialization(token);
                        }
                    })
                    .catch((error) => {
                        console.error("Error connecting to Spotify:", error);
                        playerStatus.value = "Connection Error";
                        retryInitialization(token);
                    });
            };
        } catch (err) {
            console.error("Error in initializePlayer:", err);
            playerStatus.value = "Initialization Error";
            retryInitialization(token);
        }
    }

    async function transferPlayback(device_id) {
        try {
            const response = await fetch("https://api.spotify.com/v1/me/player", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${spotifyToken.value}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    device_ids: [device_id],
                    play: false,
                }),
            });

            if (!response.ok && response.status !== 204) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (err) {
            throw new Error(`Transfer failed: ${err.message}`);
        }
    }

    async function verifyCurrentTrack() {
        const state = await player.value.getCurrentState();
        if (!state) return false;

        const currentSpotifyTrack = state.track_window?.current_track;
        const desiredTrack = selectedSongs.value[currentSong.value];

        return currentSpotifyTrack && desiredTrack && currentSpotifyTrack.uri === desiredTrack.uri;
    }

    function calculateSongPlaylist(songs, growthTimeSeconds, distributions) {
        const totalMs = growthTimeSeconds * 1000;
        totalGrowthTimeMs.value = totalMs;

        return songs.map((song) => {
            const distribution = distributions[song.id] || 0;
            const durationMs = Math.round((distribution / 100) * totalMs);

            return {
                song: song,
                duration: durationMs,
                distribution: distribution,
            };
        });
    }

    // Add the playPlaylist function
    async function playPlaylist() {
        if (!player.value || !songPlaylist.value.length) return;

        try {
            playlistActive.value = true;
            playlistStartTime.value = Date.now();
            currentSong.value = 0;

            // Start with the first song
            console.log(`Starting playlist with: ${songPlaylist.value[0].song.name}`);
            await playCurrentPlaylistSong(0);

            // Clear any existing interval
            if (playlistInterval.value) {
                clearInterval(playlistInterval.value);
            }

            // Start the interval to check time and manage songs
            playlistInterval.value = setInterval(async () => {
                const currentTime = Date.now();
                const elapsedTime = currentTime - playlistStartTime.value;
                let accumulatedDuration = 0;

                // Find which song should be playing
                for (let i = 0; i < songPlaylist.value.length; i++) {
                    const songDuration = songPlaylist.value[i].duration;

                    if (elapsedTime >= accumulatedDuration && elapsedTime < accumulatedDuration + songDuration) {
                        // We're in the correct song's timeframe
                        if (currentSong.value !== i) {
                            // Need to switch to this song
                            console.log(`Switching to song: ${songPlaylist.value[i].song.name}`);
                            currentSong.value = i;
                            await playCurrentPlaylistSong(i);
                        }
                        break;
                    }

                    accumulatedDuration += songDuration;
                }

                // Check if playlist should end
                const totalDuration = songPlaylist.value.reduce((sum, item) => sum + item.duration, 0);
                if (elapsedTime >= totalDuration) {
                    console.log("Playlist completed, stopping playback");
                    await stopPlayback();
                    cleanupPlaylist();
                    socket.emit("playlist-completed", { roomId: props.id });
                }
            }, 1000); // Check every second
        } catch (error) {
            console.error("Error in playPlaylist:", error);
            error.value = `Playlist playback error: ${error.message}`;
            await stopPlayback();
            cleanupPlaylist();
        }
    }

    async function playCurrentPlaylistSong(index) {
        if (!songPlaylist.value[index]) return;

        try {
            const playlistItem = songPlaylist.value[index];
            await player.value.setVolume(musicVolume.value / 100);

            console.log(`Playing ${playlistItem.song.name} for ${playlistItem.duration}ms`);

            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${spotifyToken.value}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uris: [playlistItem.song.uri],
                    position_ms: 0,
                }),
            });

            isPlaying.value = true;
            currentSong.value = index;
            updatePlaybackStatus();
        } catch (err) {
            console.error(`Failed to play song ${index}:`, err);
            throw new Error(`Failed to play song ${index}: ${err.message}`);
        }
    }

    function cleanupPlaylist() {
        if (playlistInterval.value) {
            clearInterval(playlistInterval.value);
            playlistInterval.value = null;
        }
        playlistStartTime.value = null;
        playlistActive.value = false;
        isPlaying.value = false;
    }

    async function playCurrentSong() {
        if (!selectedSongs.value[currentSong.value] || !player.value) return;

        if (!hasAutoplayPermission.value) {
            const granted = await requestAutoplayPermission();
            if (!granted) {
                error.value = "Please enable audio playback to play music";
                return;
            }
        }

        try {
            await player.value.setVolume(musicVolume.value / 100);
            const songToPlay = selectedSongs.value[currentSong.value];

            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${spotifyToken.value}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uris: [songToPlay.uri],
                    position_ms: 0,
                }),
            });

            isPlaying.value = true;
            updatePlaybackStatus();
        } catch (err) {
            error.value = `Playback error: ${err.message}`;
            console.error("Playback error details:", err);
        }
    }

    async function stopPlayback() {
        if (!deviceId.value || !player.value) return;

        try {
            await player.value.pause();
            await fetch(`https://api.spotify.com/v1/me/player/seek?device_id=${deviceId.value}&position_ms=0`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${spotifyToken.value}`,
                },
            });

            isPlaying.value = false;
            updatePlaybackStatus();
        } catch (err) {
            throw new Error(`Stop failed: ${err.message}`);
        }
    }

    async function getCurrentTrackInfo() {
        try {
            const state = await player.value.getCurrentState();
            if (state && state.track_window?.current_track) {
                return {
                    name: state.track_window.current_track.name,
                    artists: state.track_window.current_track.artists,
                    album: state.track_window.current_track.album,
                    uri: state.track_window.current_track.uri,
                };
            }
            return null;
        } catch (err) {
            console.error("Error getting current track:", err);
            return null;
        }
    }

    function updatePlaybackStatus(state = null) {
        if (!socket) return;

        let statusData;
        if (state) {
            statusData = {
                isPlaying: !state.paused,
                currentTrack: state.track_window?.current_track || null,
                volume: state.device?.volume_percent || musicVolume.value,
                currentSong: currentSong.value,
            };
        } else {
            getCurrentTrackInfo().then((trackInfo) => {
                statusData = {
                    isPlaying: isPlaying.value,
                    currentTrack: trackInfo,
                    volume: musicVolume.value,
                    currentSong: currentSong.value,
                };

                socket.emit("playback-command", {
                    roomId: props.id,
                    command: "status",
                    data: statusData,
                });
            });
            return;
        }

        socket.emit("playback-command", {
            roomId: props.id,
            command: "status",
            data: statusData,
        });
    }

    function resetState(fullReset = true) {
        if (fullReset) {
            clearAllStorageAndTokens();
        } else {
            error.value = "";
            spotifyToken.value = null;
            selectedSongs.value = [];
            player.value = null;
            playerStatus.value = "Not initialized";
            isPlaying.value = false;
            deviceId.value = null;
            currentSong.value = 0;
            initializationAttempts.value = 0;
            growthTime.value = null;
            distributions.value = {};
            growthActive.value = false;
            songPlaylist.value = [];
            totalGrowthTimeMs.value = 0;
            clearTimeout(initializationTimer);
            cleanupPlaylist();
            songPlaylist.value = [];
            totalGrowthTimeMs.value = 0;
        }
    }

    // Add this function near the top of your script
    function clearAllStorageAndTokens() {
        // Clear any local storage items if you're using them
        localStorage.removeItem("spotify_token");
        localStorage.removeItem("device_id");
        sessionStorage.clear();

        // Clear all refs
        spotifyToken.value = null;
        player.value = null;
        deviceId.value = null;
        selectedSongs.value = [];
        currentSong.value = 0;
        isPlaying.value = false;
        musicVolume.value = 50;
        error.value = "";
        playerStatus.value = "Not initialized";
        connectionStatus.value = "Disconnected";
        initializationAttempts.value = 0;
        growthTime.value = null;
        distributions.value = {};
        growthActive.value = false;
        songPlaylist.value = [];
        totalGrowthTimeMs.value = 0;
        cleanupPlaylist();
        songPlaylist.value = [];
        totalGrowthTimeMs.value = 0;
        playlistActive.value = false;

        // Clear any pending timers
        clearTimeout(initializationTimer);
    }

    function resetPlaybackState() {
        if (isPlaying.value) {
            pausePlayback();
        }
        currentSong.value = 0;
        isPlaying.value = false;
    }

    onMounted(() => {
        resetState();
        socket = initializeSocket();
        window.addEventListener("beforeunload", clearAllStorageAndTokens);
    });

    onBeforeUnmount(() => {
        window.removeEventListener("beforeunload", clearAllStorageAndTokens);
    });

    onUnmounted(() => {
        if (socket) {
            socket.disconnect();
        }
        if (player.value) {
            player.value.disconnect();
        }
        cleanupPlaylist();
        resetState();
    });
</script>

<style scoped>
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
