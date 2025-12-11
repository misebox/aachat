import { defineConfig } from "vite";
import solid from 'vite-plugin-solid';
import tailwindcss from "@tailwindcss/vite";
import path from 'path';


export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    allowedHosts: true,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
});
