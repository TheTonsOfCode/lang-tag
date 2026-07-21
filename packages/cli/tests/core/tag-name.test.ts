import { describe, expect, it } from 'vitest';

import {
    applyLibraryTagPrefixToConfig,
    buildTagNameAlternation,
    getPrimaryTagName,
    isReservedTagName,
    normalizeTagNames,
} from '@/core/tag-name';

describe('tag-name helpers', () => {
    it('normalizes string and array tag names', () => {
        expect(normalizeTagNames('lang')).toEqual(['lang']);
        expect(normalizeTagNames(['lang', 't'])).toEqual(['lang', 't']);
        expect(normalizeTagNames(['lang', '', 't'])).toEqual(['lang', 't']);
        expect(normalizeTagNames(undefined)).toEqual([]);
    });

    it('returns the primary (first) tag name', () => {
        expect(getPrimaryTagName('t')).toBe('t');
        expect(getPrimaryTagName(['lang', 't'])).toBe('lang');
        expect(getPrimaryTagName([])).toBe('lang');
    });

    it('builds alternation with longer names first', () => {
        expect(buildTagNameAlternation(['lang', 'language'])).toBe(
            'language|lang'
        );
        expect(buildTagNameAlternation('t')).toBe('t');
        expect(buildTagNameAlternation(['a.b', 't'])).toBe('a\\.b|t');
    });

    it('applies library underscore prefix to string or list', () => {
        expect(applyLibraryTagPrefixToConfig('lang')).toBe('_lang');
        expect(applyLibraryTagPrefixToConfig('_lang')).toBe('_lang');
        expect(applyLibraryTagPrefixToConfig(['lang', 't'])).toEqual([
            '_lang',
            '_t',
        ]);
    });

    it('detects reserved tag names', () => {
        expect(isReservedTagName('lang-tag')).toBe(true);
        expect(isReservedTagName('langtag')).toBe(true);
        expect(isReservedTagName('lang')).toBe(false);
    });
});
