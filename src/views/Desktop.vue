<template>
    <div class="min-h-screen bg-gray-900 p-4">
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

                    <div class="space-y-6">
                        <div
                            v-for="(song, index) in selectedSongs"
                            :key="song.id"
                            class="bg-gray-700 rounded-lg overflow-hidden">
                            <!-- Song Info -->
                            <div class="p-4 flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <img
                                        :src="song.album.images[0].url"
                                        class="w-16 h-16 rounded"
                                        alt="Album art" />
                                    <div>
                                        <h3 class="text-white font-bold">{{ song.name }}</h3>
                                        <p class="text-gray-400">{{ song.artists.map((a) => a.name).join(", ") }}</p>
                                    </div>
                                </div>
                                <button
                                    v-if="player && deviceId"
                                    @click="playSong(song.uri)"
                                    class="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600">
                                    Play
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Player Controls -->
                    <div
                        v-if="player && selectedSongs.length > 0"
                        class="mt-6 flex justify-center space-x-4">
                        <button
                            @click="previousTrack"
                            class="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600">
                            Previous
                        </button>
                        <button
                            @click="togglePlay"
                            class="p-2 bg-green-500 rounded-full text-white hover:bg-green-600">
                            {{ isPlaying ? "Pause" : "Play" }}
                        </button>
                        <button
                            @click="nextTrack"
                            class="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted } from "vue";
    import { io } from "socket.io-client";

    const props = defineProps(["id"]);
    const error = ref("");
    const connectionStatus = ref("Disconnected");
    const spotifyToken = ref(null);
    const selectedSongs = ref([]);
    const player = ref(null);
    const playerStatus = ref("Not initialized");
    const isPlaying = ref(false);
    const deviceId = ref(null);

    let socket;
    const mobileUrl = `${window.location.origin}/mobile/${props.id}`;

    function resetState() {
        error.value = "";
        connectionStatus.value = "Disconnected";
        spotifyToken.value = null;
        selectedSongs.value = [];
        player.value = null;
        playerStatus.value = "Not initialized";
        isPlaying.value = false;
        deviceId.value = null;
    }

    function initializeSocket() {
        const url = `http://${window.location.hostname}:3000`;
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

        socket.on("spotify-token-updated", async ({ token }) => {
            console.log("Received Spotify token");
            spotifyToken.value = token;
            await initializePlayer(token);
        });

        socket.on("songs-updated", ({ songs }) => {
            selectedSongs.value = songs;
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

        socket.on("playback-update", async ({ command, data }) => {
            if (!player.value || !deviceId.value) return;

            try {
                console.log("Received playback command:", command, data);

                // Preserve current track information
                const currentTrack = data.currentTrack || (await getCurrentTrackInfo());

                switch (command) {
                    case "play":
                        if (data.uris) {
                            await playTracks(data.uris);
                        } else {
                            await resumePlayback();
                        }
                        break;

                    case "pause":
                        await pausePlayback();
                        break;

                    case "next":
                        await nextTrack();
                        break;

                    case "previous":
                        await previousTrack();
                        break;

                    case "volume":
                        await player.value.setVolume(data.volume / 100);
                        break;
                }

                // Update status with preserved track information
                await updatePlaybackStatus({
                    paused: command === "pause",
                    track_window: {
                        current_track: currentTrack,
                    },
                    device: {
                        volume_percent: data.volume || (await player.value.getVolume()) * 100,
                    },
                });
            } catch (err) {
                error.value = `Playback command error: ${err.message}`;
            }
        });

        return socket;
    }

    async function initializePlayer(token) {
        if (!token) return;

        if (!document.getElementById("spotify-player")) {
            const script = document.createElement("script");
            script.id = "spotify-player";
            script.src = "https://sdk.scdn.co/spotify-player.js";
            document.body.appendChild(script);
        }

        window.onSpotifyWebPlaybackSDKReady = () => {
            const spotifyPlayer = new window.Spotify.Player({
                name: "Plant Music Player",
                getOAuthToken: (cb) => {
                    cb(token);
                },
            });

            // Error handling
            spotifyPlayer.addListener("initialization_error", ({ message }) => {
                error.value = `Player Init Error: ${message}`;
            });

            spotifyPlayer.addListener("authentication_error", ({ message }) => {
                error.value = `Player Auth Error: ${message}`;
            });

            spotifyPlayer.addListener("account_error", ({ message }) => {
                error.value = `Premium Account Required: ${message}`;
            });

            spotifyPlayer.addListener("playback_error", ({ message }) => {
                error.value = `Playback Error: ${message}`;
            });

            // Playback status updates
            spotifyPlayer.addListener("player_state_changed", (state) => {
                if (state) {
                    isPlaying.value = !state.paused;
                    updatePlaybackStatus(state);

                    // Log the state for debugging
                    console.log("Player state changed:", {
                        track: state.track_window?.current_track?.name,
                        artists: state.track_window?.current_track?.artists?.map((a) => a.name).join(", "),
                        isPlaying: !state.paused,
                    });
                }
            });

            // Ready
            spotifyPlayer.addListener("ready", async ({ device_id }) => {
                playerStatus.value = "Ready";
                player.value = spotifyPlayer;
                deviceId.value = device_id;

                try {
                    await transferPlayback(device_id);
                    playerStatus.value = "Active";
                } catch (err) {
                    error.value = `Failed to transfer playback: ${err.message}`;
                }
            });

            // Not Ready
            spotifyPlayer.addListener("not_ready", ({ device_id }) => {
                playerStatus.value = "Not Ready";
                deviceId.value = null;
            });

            spotifyPlayer.connect();
        };
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

    async function playTracks(uris) {
        if (!deviceId.value) return;

        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${spotifyToken.value}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris }),
        });

        if (!response.ok && response.status !== 204) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        isPlaying.value = true;
    }

    async function playSong(uri) {
        if (!player.value || !deviceId.value) return;

        try {
            await playTracks([uri]);
            // Get the current state after playing
            const state = await player.value.getCurrentState();
            updatePlaybackStatus(state);
        } catch (err) {
            error.value = `Playback error: ${err.message}`;
        }
    }

    async function resumePlayback() {
        if (!deviceId.value) return;

        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${spotifyToken.value}`,
            },
        });

        if (!response.ok && response.status !== 204) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        isPlaying.value = true;
    }

    async function pausePlayback() {
        if (!deviceId.value) return;

        const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId.value}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${spotifyToken.value}`,
            },
        });

        if (!response.ok && response.status !== 204) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        isPlaying.value = false;
    }

    async function nextTrack() {
        if (!deviceId.value) return;

        await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId.value}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${spotifyToken.value}`,
            },
        });
    }

    async function previousTrack() {
        if (!deviceId.value) return;

        await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId.value}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${spotifyToken.value}`,
            },
        });
    }

    function togglePlay() {
        if (isPlaying.value) {
            pausePlayback();
        } else {
            resumePlayback();
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

    // Update the updatePlaybackStatus function:
    function updatePlaybackStatus(state = null) {
        if (!socket) return;

        let statusData;
        if (state) {
            statusData = {
                isPlaying: !state.paused,
                currentTrack: state.track_window?.current_track || null,
                volume: state.device?.volume_percent || 50,
            };
        } else {
            getCurrentTrackInfo().then((trackInfo) => {
                statusData = {
                    isPlaying: isPlaying.value,
                    currentTrack: trackInfo,
                    volume: player.value?.getVolume() * 100 || 50,
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

    onMounted(() => {
        resetState();
        socket = initializeSocket();
    });

    onUnmounted(() => {
        if (socket) {
            socket.disconnect();
        }
        if (player.value) {
            player.value.disconnect();
        }
        resetState();
    });
</script>
