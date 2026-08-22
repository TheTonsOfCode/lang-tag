import { describe, expect, it } from 'vitest';

import {
    PLACEHOLDER_PATTERNS,
    type PlaceholderSyntax,
    resolvePlaceholderPattern,
} from '@/placeholder-patterns';

const ALL_SYNTAX: PlaceholderSyntax[] = [
    'doubleBrace',
    'dollarBrace',
    'singleBrace',
    'percentBrace',
    'percentPercent',
    'colon',
    'dollarIdent',
    'angleBracket',
    'doubleSquare',
    'singleSquare',
];

/** Fresh regex — exported patterns are global and carry `lastIndex`. */
function capturedNames(syntax: PlaceholderSyntax, text: string): string[] {
    const source = PLACEHOLDER_PATTERNS[syntax];
    const pattern = new RegExp(source.source, source.flags);
    return [...text.matchAll(pattern)].map((match) => match[1].trim());
}

describe('PLACEHOLDER_PATTERNS', () => {
    it('covers every built-in syntax once', () => {
        expect(Object.keys(PLACEHOLDER_PATTERNS).sort()).toEqual(
            [...ALL_SYNTAX].sort()
        );
    });

    it('puts the placeholder name in the first capture group', () => {
        for (const syntax of ALL_SYNTAX) {
            expect(PLACEHOLDER_PATTERNS[syntax].global).toBe(true);
            expect(PLACEHOLDER_PATTERNS[syntax].source.includes('(')).toBe(
                true
            );
        }
    });
});

describe('resolvePlaceholderPattern', () => {
    it('defaults to doubleBrace', () => {
        expect(resolvePlaceholderPattern()).toBe(
            PLACEHOLDER_PATTERNS.doubleBrace
        );
        expect(resolvePlaceholderPattern(undefined)).toBe(
            PLACEHOLDER_PATTERNS.doubleBrace
        );
    });

    it('returns the regex for each syntax name', () => {
        for (const syntax of ALL_SYNTAX) {
            expect(resolvePlaceholderPattern(syntax)).toBe(
                PLACEHOLDER_PATTERNS[syntax]
            );
        }
    });
});

describe('built-in syntax captures (mirrors core extractors)', () => {
    it('doubleBrace — {{ name }}', () => {
        expect(capturedNames('doubleBrace', 'plain text')).toEqual([]);
        expect(capturedNames('doubleBrace', 'Hello {{name}}')).toEqual([
            'name',
        ]);
        expect(
            capturedNames('doubleBrace', 'Test {{ name}} from {{sender}}')
        ).toEqual(['name', 'sender']);
    });

    it('dollarBrace — ${ name }', () => {
        expect(
            capturedNames('dollarBrace', 'Hello ${name} and ${ other }')
        ).toEqual(['name', 'other']);
        expect(capturedNames('dollarBrace', 'Keep {{raw}} $name')).toEqual([]);
    });

    it('singleBrace — { name }, skips {{ … }}', () => {
        expect(
            capturedNames('singleBrace', 'Hi {name}, ignore {{raw}}')
        ).toEqual(['name']);
        expect(capturedNames('singleBrace', '{{only}}')).toEqual([]);
    });

    it('percentBrace — %{ name }', () => {
        expect(capturedNames('percentBrace', 'Hello %{name}')).toEqual([
            'name',
        ]);
        expect(capturedNames('percentBrace', 'Keep %name%')).toEqual([]);
    });

    it('percentPercent — %name%, skips %{…}', () => {
        expect(capturedNames('percentPercent', 'Hello %name%')).toEqual([
            'name',
        ]);
        expect(capturedNames('percentPercent', 'Keep %{name}')).toEqual([]);
        expect(capturedNames('percentPercent', 'Keep %{name}%')).toEqual([]);
    });

    it('colon — :name (ASCII ident)', () => {
        expect(capturedNames('colon', 'Hello :name!')).toEqual(['name']);
        expect(capturedNames('colon', 'Hi :user_id / :order-id')).toEqual([
            'user_id',
            'order-id',
        ]);
        expect(capturedNames('colon', 'x :1abc y')).toEqual([]);
        expect(capturedNames('colon', ':_private')).toEqual(['_private']);
    });

    it('dollarIdent — $name, skips ${…}', () => {
        expect(capturedNames('dollarIdent', 'Hi $name and ${ignored}')).toEqual(
            ['name']
        );
        expect(capturedNames('dollarIdent', 'Hi $user_id!')).toEqual([
            'user_id',
        ]);
        expect(capturedNames('dollarIdent', '$1abc')).toEqual([]);
    });

    it('angleBracket — <name>, skips HTML-like tags', () => {
        expect(capturedNames('angleBracket', 'Hello <name>')).toEqual(['name']);
        expect(
            capturedNames('angleBracket', '</div> <foo bar> <a/b> <name>')
        ).toEqual(['name']);
    });

    it('doubleSquare — [[ name ]]', () => {
        expect(capturedNames('doubleSquare', 'Hello [[name]]')).toEqual([
            'name',
        ]);
        expect(capturedNames('doubleSquare', 'Keep [raw]')).toEqual([]);
    });

    it('singleSquare — [ name ], skips [[ … ]]', () => {
        expect(
            capturedNames('singleSquare', 'Hi [name], ignore [[raw]]')
        ).toEqual(['name']);
        expect(capturedNames('singleSquare', '[[only]]')).toEqual([]);
    });
});
