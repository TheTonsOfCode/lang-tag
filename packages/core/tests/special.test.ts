import { describe, expect, it } from 'vitest';

import { LangTagSpecial, isLangTagSpecial, markLangTagSpecial } from '@/index';

describe('lang-tag specials', () => {
    it('brands a function with a non-enumerable kind', () => {
        const fn = markLangTagSpecial((key: string) => key, 'dynamic-caller');

        expect(isLangTagSpecial(fn)).toBe(true);
        expect(fn[LangTagSpecial]).toBe('dynamic-caller');
        expect(Object.keys(fn)).not.toContain(String(LangTagSpecial));
        expect(fn('x')).toBe('x');
    });

    it('does not treat a plain function as a special', () => {
        expect(isLangTagSpecial(() => 'x')).toBe(false);
        expect(isLangTagSpecial({ label: 'x' })).toBe(false);
    });
});
