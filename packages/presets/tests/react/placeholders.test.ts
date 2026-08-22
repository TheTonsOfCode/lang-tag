import { createElement, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { processPlaceholders } from '@/react/placeholders';

describe('processPlaceholders', () => {
    it('interpolates string placeholders', () => {
        expect(processPlaceholders('Hello {{name}}', { name: 'Paul' })).toBe(
            'Hello Paul'
        );
    });

    it('trims placeholder names and coerces numbers/booleans', () => {
        expect(
            processPlaceholders('{{ count }} items, active: {{active}}', {
                count: 3,
                active: true,
            })
        ).toBe('3 items, active: true');
    });

    it('renders missing / unsupported values as an empty string', () => {
        expect(processPlaceholders('a{{missing}}b')).toBe('ab');
        expect(processPlaceholders('a{{obj}}b', { obj: {} as never })).toBe(
            'ab'
        );
    });

    it('returns a plain string when no React nodes are involved', () => {
        const result = processPlaceholders('Hi {{name}}', { name: 'Ada' });
        expect(typeof result).toBe('string');
    });

    it('supports a built-in syntax by name (e.g. dollarBrace)', () => {
        expect(
            processPlaceholders(
                'Hello ${name}, ${count} left',
                { name: 'Ada', count: 2 },
                { syntax: 'dollarBrace' }
            )
        ).toBe('Hello Ada, 2 left');
        expect(
            processPlaceholders('Keep {{raw}}', {}, { syntax: 'dollarBrace' })
        ).toBe('Keep {{raw}}');
    });

    it('covers every core extractor syntax', () => {
        const params = {
            name: 'Ada',
            count: 2,
            user_id: 'u1',
            'order-id': 'o9',
        };

        expect(
            processPlaceholders('Hi {{ name }} ({{count}})', params, {
                syntax: 'doubleBrace',
            })
        ).toBe('Hi Ada (2)');
        expect(
            processPlaceholders('Hi ${ name } (${count})', params, {
                syntax: 'dollarBrace',
            })
        ).toBe('Hi Ada (2)');
        expect(
            processPlaceholders('Hi { name }, ignore {{raw}}', params, {
                syntax: 'singleBrace',
            })
        ).toBe('Hi Ada, ignore {{raw}}');
        expect(
            processPlaceholders('Hi %{ name } (%{count})', params, {
                syntax: 'percentBrace',
            })
        ).toBe('Hi Ada (2)');
        expect(
            processPlaceholders('Hi %name% (%count%)', params, {
                syntax: 'percentPercent',
            })
        ).toBe('Hi Ada (2)');
        expect(
            processPlaceholders('Hi :name / :user_id / :order-id', params, {
                syntax: 'colon',
            })
        ).toBe('Hi Ada / u1 / o9');
        expect(
            processPlaceholders('Hi $name and $user_id', params, {
                syntax: 'dollarIdent',
            })
        ).toBe('Hi Ada and u1');
        expect(
            processPlaceholders('Hi <name> (<count>)', params, {
                syntax: 'angleBracket',
            })
        ).toBe('Hi Ada (2)');
        expect(
            processPlaceholders('Hi [[ name ]] ([[count]])', params, {
                syntax: 'doubleSquare',
            })
        ).toBe('Hi Ada (2)');
        expect(
            processPlaceholders('Hi [ name ], ignore [[raw]]', params, {
                syntax: 'singleSquare',
            })
        ).toBe('Hi Ada, ignore [[raw]]');
    });

    it('keeps overlapping syntaxes from stealing each other', () => {
        expect(
            processPlaceholders(
                'Keep ${name} and :name',
                { name: 'Ada' },
                {
                    syntax: 'dollarIdent',
                }
            )
        ).toBe('Keep ${name} and :name');
        expect(
            processPlaceholders(
                'Keep %{name} literal',
                { name: 'Ada' },
                {
                    syntax: 'percentPercent',
                }
            )
        ).toBe('Keep %{name} literal');
        expect(
            processPlaceholders(
                'Keep :1abc and :name',
                { name: 'Ada' },
                {
                    syntax: 'colon',
                }
            )
        ).toBe('Keep :1abc and Ada');
        expect(
            processPlaceholders(
                'Keep </div> <foo bar> <a/b> <name>',
                {
                    name: 'Ada',
                },
                { syntax: 'angleBracket' }
            )
        ).toBe('Keep </div> <foo bar> <a/b> Ada');
    });

    it('supports a custom placeholder pattern (e.g. ${ ... })', () => {
        expect(
            processPlaceholders(
                'Hello ${name}, ${count} left',
                { name: 'Ada', count: 2 },
                { pattern: /\$\{(.*?)\}/g }
            )
        ).toBe('Hello Ada, 2 left');
        // The default `{{ }}` syntax is inert under the custom pattern.
        expect(
            processPlaceholders('Keep {{raw}}', {}, { pattern: /\$\{(.*?)\}/g })
        ).toBe('Keep {{raw}}');
    });

    it('adds the global flag to a custom pattern if missing', () => {
        expect(
            processPlaceholders(
                '${a} and ${b}',
                { a: '1', b: '2' },
                { pattern: /\$\{(.*?)\}/ }
            )
        ).toBe('1 and 2');
    });

    it('returns a React fragment tree when a placeholder is a React element', () => {
        const link = createElement('a', { href: '#' }, 'here');
        const result = processPlaceholders('Click {{cta}} now', {
            cta: link,
        }) as unknown;

        expect(Array.isArray(result)).toBe(true);
        const nodes = result as unknown[];
        expect(nodes).toHaveLength(3);
        expect(nodes.every((node) => isValidElement(node))).toBe(true);
    });

    it('keeps React nodes when using a built-in syntax', () => {
        const link = createElement('a', { href: '#' }, 'here');
        const result = processPlaceholders(
            'Click ${cta} now',
            { cta: link },
            { syntax: 'dollarBrace' }
        ) as unknown;

        expect(Array.isArray(result)).toBe(true);
        const nodes = result as unknown[];
        expect(nodes).toHaveLength(3);
        expect(nodes.every((node) => isValidElement(node))).toBe(true);
    });
});
