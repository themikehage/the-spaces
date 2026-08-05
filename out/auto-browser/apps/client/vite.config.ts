import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/sessions": "http://localhost:3001",
      "/providers": "http://localhost:3001",
      "/health": "http://localhost:3001",
      "/browser-sessions": "http://localhost:3001",
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
      "/stream": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
