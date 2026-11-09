// Vite build settings for the React front end.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React plugin handles JSX and fast refresh while developing.
export default defineConfig({
  plugins: [react()],
  server: {
    // Sends API calls to the local Django server during development.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
