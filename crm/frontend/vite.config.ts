import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api': 'http://localhost:4000',
      '/conversations': 'http://localhost:4000',
      '/messages': 'http://localhost:4000',
      '/sessions': 'http://localhost:4000',
      '/session': 'http://localhost:4000',
      '/config': 'http://localhost:4000',
      '/queue': 'http://localhost:4000',
      '/system': 'http://localhost:4000',
      '/ai': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
});
