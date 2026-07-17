import { describe, expect, it } from 'vitest';

import { withDynamicCaller } from '@/dynamic-caller';

const makeBase = () => ({
    greeting: (params?: { name?: string }) =>
        `Hello ${params?.name ?? 'stranger'}`,
    farewell: () => 'Goodbye',
    user: {
        name: () => 'Ada',
    },
});

describe('withDynamicCaller', () => {
    it('adds a default "$" caller that invokes a translation by key', () => {
        const t = withDynamicCaller(makeBase());
        expect(t.farewell()).toBe('Goodbye');
        expect(t.$('farewell')).toBe('Goodbye');
    });

    it('forwards extra arguments to the resolved translation', () => {
        const t = withDynamicCaller(makeBase());
        expect(t.$('greeting', { name: 'Paul' })).toBe('Hello Paul');
    });

    it('returns the default missing marker for unknown keys', () => {
        // typedKeys: false so we can pass a deliberately unknown key at compile time
        const t = withDynamicCaller(makeBase(), { typedKeys: false });
        expect(t.$('nope')).toBe('#Missing:nope#');
    });

    it('supports a custom caller name', () => {
        const t = withDynamicCaller(makeBase(), { callerName: 'call' });
        expect(t.call('farewell')).toBe('Goodbye');
    });

    it('supports a custom onMissing handler', () => {
        const t = withDynamicCaller(makeBase(), {
            typedKeys: false,
            onMissing: (path) => `[[${path}]]`,
        });
        expect(t.$('nope')).toBe('[[nope]]');
    });

    it('leaves nested objects untouched when not recursive', () => {
        const t = withDynamicCaller(makeBase());
        expect(t.user.name()).toBe('Ada');
        expect('$' in t.user).toBe(false);
    });

    describe('recursive', () => {
        it('adds the caller to nested objects', () => {
            const t = withDynamicCaller(makeBase(), { recursive: true });
            expect(t.$('farewell')).toBe('Goodbye');
            expect(t.user.$('name')).toBe('Ada');
        });

        it('reports the full dotted path to onMissing', () => {
            const t = withDynamicCaller(makeBase(), {
                recursive: true,
                typedKeys: false,
                onMissing: (path) => `missing:${path}`,
            });
            expect(t.$('nope')).toBe('missing:nope');
            expect(t.user.$('nope')).toBe('missing:user.nope');
        });

        it('works with a custom caller name on every level', () => {
            const t = withDynamicCaller(makeBase(), {
                recursive: true,
                callerName: '__X',
            });
            expect(t.__X('farewell')).toBe('Goodbye');
            expect(t.user.__X('name')).toBe('Ada');
        });
    });

    describe('typedKeys', () => {
        it('is a type-only switch and does not change runtime behaviour', () => {
            const t = withDynamicCaller(makeBase());
            expect(t.$('farewell')).toBe('Goodbye');
            expect(t.$('greeting', { name: 'Paul' })).toBe('Hello Paul');

            const loose = withDynamicCaller(makeBase(), { typedKeys: false });
            expect(loose.$('farewell')).toBe('Goodbye');
        });
    });
});
