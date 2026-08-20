import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['tests/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            'lang-tag': resolve(__dirname, '../core/src/index.ts'),
        },
    },
});
