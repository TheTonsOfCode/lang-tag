import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { $LT_HideExportsInDtsFile } from '@/core/hide-compiled-exports/hide-exports';
import { $LT_RewriteHiddenExportConsumersInDtsFile } from '@/core/hide-compiled-exports/rewrite-consumers';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TMP_DIR = join(__dirname, 'tmp-hide-exports');

function writeDts(name: string, content: string): string {
    const filePath = join(TMP_DIR, name);
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

describe('$LT_HideExportsInDtsFile', () => {
    beforeEach(() => {
        if (existsSync(TMP_DIR)) {
            rmSync(TMP_DIR, { recursive: true, force: true });
        }
        mkdirSync(TMP_DIR, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(TMP_DIR)) {
            rmSync(TMP_DIR, { recursive: true, force: true });
        }
    });

    it('strips the value export and adds export type Name = typeof Name', () => {
        const filePath = writeDts(
            'tag.d.ts',
            'export declare const formLang: {};\nexport declare const helper: string;\n'
        );

        const result = $LT_HideExportsInDtsFile(
            filePath,
            new Set(['formLang'])
        );

        expect(result.hiddenNames).toEqual(['formLang']);
        expect(result.modifiedContent).not.toContain(
            'export declare const formLang'
        );
        expect(result.modifiedContent).toContain('declare const formLang');
        expect(result.modifiedContent).toContain(
            'export type formLang = typeof formLang'
        );
        expect(result.modifiedContent).toContain('export declare const helper');
    });

    it('does not rewrite a file with no matching exported names', () => {
        const original = 'export declare const helper: string;\n';
        const filePath = writeDts('other.d.ts', original);

        const result = $LT_HideExportsInDtsFile(
            filePath,
            new Set(['formLang'])
        );

        expect(result.hiddenCount).toBe(0);
        expect(result.modifiedContent).toBe(original);
    });
});

describe('$LT_RewriteHiddenExportConsumersInDtsFile', () => {
    beforeEach(() => {
        if (existsSync(TMP_DIR)) {
            rmSync(TMP_DIR, { recursive: true, force: true });
        }
        mkdirSync(TMP_DIR, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(TMP_DIR)) {
            rmSync(TMP_DIR, { recursive: true, force: true });
        }
    });

    it('converts value imports and typeof access of hidden names', () => {
        const filePath = writeDts(
            'inline-prop.d.ts',
            [
                "import { formLang as LANG } from './tag';",
                'export declare function takeProp(t: typeof LANG.TranslationsInput): void;',
                'export declare type Input = typeof LANG;',
                '',
            ].join('\n')
        );

        const result = $LT_RewriteHiddenExportConsumersInDtsFile(
            filePath,
            new Set(['formLang'])
        );

        expect(result.modified).toBe(true);
        expect(result.modifiedContent).toContain(
            'import type { formLang as LANG }'
        );
        expect(result.modifiedContent).toContain("LANG['TranslationsInput']");
        expect(result.modifiedContent).toContain(
            'export declare type Input = LANG'
        );
        expect(result.modifiedContent).not.toContain('typeof LANG');
    });

    it('uses an inline type modifier when the import is mixed', () => {
        const filePath = writeDts(
            'mixed.d.ts',
            [
                "import { formLang as LANG, helper } from './tag';",
                'export declare function Mixed(t: typeof LANG.TranslationsInput, h: typeof helper): void;',
                '',
            ].join('\n')
        );

        const result = $LT_RewriteHiddenExportConsumersInDtsFile(
            filePath,
            new Set(['formLang'])
        );

        expect(result.modifiedContent).toContain('type formLang as LANG');
        expect(result.modifiedContent).toContain('helper');
        expect(result.modifiedContent).not.toMatch(/import type \{/);
        expect(result.modifiedContent).toContain("LANG['TranslationsInput']");
        expect(result.modifiedContent).toContain('typeof helper');
    });
});
