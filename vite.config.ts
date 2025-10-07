import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'pathe';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: {
        'index': resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (format === 'es') {
          return `${entryName}.js`;
        }
        return `${entryName}.cjs`;
      }
    },
    target: 'node18',
    minify: true
  },
  plugins: [
    dts({
      include: ['src/index.ts']
    })
  ]
});