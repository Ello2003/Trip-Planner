import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use subpath base for GitHub Pages builds, but root base for local / AI Studio preview
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGithubPages ? '/Trip-Planner/' : '/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@vis.gl/react-google-maps', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
