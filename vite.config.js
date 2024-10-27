import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    server: {
        host: "0.0.0.0",
        port: 5173,
        proxy: {
            "/socket.io": {
                target: "http://localhost:3000",
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
