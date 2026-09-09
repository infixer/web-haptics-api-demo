import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    // Haptics need a secure context, and phones need to reach the dev server
    // over the LAN. `vite dev --host` alone serves plain HTTP, where
    // navigator.vibrate silently does nothing — tunnel it instead.
    host: true,
  },
});
