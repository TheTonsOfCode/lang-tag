import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        include: ['tests/**/*.test.ts'],
        exclude: ['./dist'],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
});
