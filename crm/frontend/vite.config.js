import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': backendTarget,
      '/ai': backendTarget,
      '/config': backendTarget,
      '/system': backendTarget,
      '/messages': backendTarget,
      '/send-message': backendTarget,
      '/send-media': backendTarget,
      '/chats': backendTarget,
      '/conversations': backendTarget,
      '/session': backendTarget,
      '/sessions': backendTarget,
      '/health': backendTarget,
      '/diagnostics': backendTarget,
      '/socket.io': {
        target: backendTarget,
        ws: true,
      },
    },
  },
});
