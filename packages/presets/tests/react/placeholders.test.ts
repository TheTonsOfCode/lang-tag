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
});
