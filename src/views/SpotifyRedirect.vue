<template>
    <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Processing Spotify Login...</h2>
            <p
                v-if="error"
                class="text-red-500">
                {{ error }}
            </p>
        </div>
    </div>
</template>

<script setup>
    import { onMounted } from "vue";
    import { useRouter } from "vue-router";

    const router = useRouter();

    onMounted(() => {
        try {
            const hash = window.location.hash;
            if (!hash) {
                throw new Error("No authentication data received");
            }

            const params = new URLSearchParams(hash.substring(1));
            const token = params.get("access_token");
            const state = params.get("state");

            if (!token || !state) {
                throw new Error("Missing required authentication parameters");
            }

            const originalRoomId = localStorage.getItem("spotify_room_id");
            const storedState = localStorage.getItem("spotify_auth_state");

            if (!originalRoomId) {
                throw new Error("No room ID found");
            }

            if (state !== storedState) {
                throw new Error("State mismatch in authentication");
            }

            // Redirect back to the original room with the token
            const redirectUrl = `/mobile/${originalRoomId}`;

            // Clear storage
            localStorage.removeItem("spotify_room_id");
            localStorage.removeItem("spotify_auth_state");

            // Navigate back to the original room with the auth data
            router.replace({
                path: redirectUrl,
                query: {
                    spotifyToken: token,
                    state: state,
                },
            });
        } catch (err) {
            console.error("Redirect error:", err);
            error.value = err.message;
        }
    });
</script>
