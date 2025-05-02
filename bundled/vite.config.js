import { defineConfig } from 'vite';

export default defineConfig({
    base: '/nasa-tlx-input/',
    build: {
        outDir: 'docs',
        // target: 'esnext', // Ensures support for top-level await
        // minify: 'esbuild', // Enables minification using esbuild (default)
    },
});