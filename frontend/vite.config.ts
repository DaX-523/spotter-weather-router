import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the browser sees one origin: /api is forwarded to Django, so no CORS.
const BACKEND_URL = "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  server: { proxy: { "/api": BACKEND_URL } },
});
