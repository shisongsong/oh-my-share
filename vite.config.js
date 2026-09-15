import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'public',
    lib: {
      entry: 'src/ui/client.js',
      formats: ['es'],
      fileName: () => 'app.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
      },
    },
    minify: true,
    sourcemap: false,
  },
  server: {
    strictPort: true,
  },
  assetsInclude: ['**/*.raw.js'],
});
