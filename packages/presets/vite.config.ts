import { readdirSync } from 'node:fs';
import { extname } from 'node:path';

import { resolve } from 'pathe';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const srcDir = resolve(__dirname, 'src');

// Compile every *.ts file on its own (no barrel / no bundling): each source
// file maps 1:1 to an output file, preserving the directory structure so
// consumers can import specific presets, e.g.
//   import { withDynamicCaller } from '@lang-tag/presets/dynamic-caller';
function collectEntries(): Record<string, string> {
    const entries: Record<string, string> = {};
    for (const relPath of readdirSync(srcDir, {
        recursive: true,
    }) as string[]) {
        if (extname(relPath) !== '.ts' || relPath.endsWith('.d.ts')) continue;
        const name = relPath.slice(0, -'.ts'.length).split('\\').join('/');
        entries[name] = resolve(srcDir, relPath);
    }
    return entries;
}

// Emit ESM (.js) and CJS (.cjs) in two passes so each format keeps correct
// relative import extensions. build.sh drives both passes via BUILD_FORMAT.
const format = process.env.BUILD_FORMAT === 'cjs' ? 'cjs' : 'es';

export default defineConfig({
    resolve: {
        alias: {
            '@': srcDir,
        },
    },
    build: {
        target: 'node18',
        minify: false,
        sourcemap: false,
        outDir: 'dist',
        // build.sh clears dist/ once up-front; keep both passes' output.
        emptyOutDir: false,
        lib: {
            entry: collectEntries(),
            formats: [format],
        },
        rollupOptions: {
            external: [/^lang-tag(\/.*)?$/, /^node:/],
            output: {
                preserveModules: true,
                preserveModulesRoot: 'src',
                entryFileNames: format === 'cjs' ? '[name].cjs' : '[name].js',
                ...(format === 'cjs' ? { exports: 'named' } : {}),
            },
        },
    },
    plugins:
        format === 'es'
            ? [
                  dts({
                      entryRoot: srcDir,
                      include: ['src/**/*.ts'],
                      tsconfigPath: resolve(__dirname, 'tsconfig.dts.json'),
                      rollupTypes: false,
                      // `lang-tag` is resolved locally (monorepo) via the
                      // tsconfig path alias only for type-checking; keep the
                      // bare specifier in the emitted .d.ts for consumers.
                      aliasesExclude: [/^lang-tag$/],
                  }),
              ]
            : [],
});
