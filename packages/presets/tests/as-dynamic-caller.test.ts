import { LangTagSpecial, isLangTagSpecial } from 'lang-tag';
import { describe, expect, it } from 'vitest';

import { asDynamicCaller } from '@/dynamic-caller';

const makeBase = () => ({
    greeting: (params?: { name?: string }) =>
        `Hello ${params?.name ?? 'stranger'}`,
    farewell: () => 'Goodbye',
    user: {
        name: () => 'Ada',
    },
});

describe('asDynamicCaller', () => {
    it('makes the translations object itself the caller', () => {
        const t = asDynamicCaller(makeBase());
        expect(t.farewell()).toBe('Goodbye');
        expect(t('farewell')).toBe('Goodbye');
    });

    it('forwards extra arguments to the resolved translation', () => {
        const t = asDynamicCaller(makeBase());
        expect(t('greeting', { name: 'Paul' })).toBe('Hello Paul');
    });

    it('returns the default missing marker for unknown keys', () => {
        const t = asDynamicCaller(makeBase(), { typedKeys: false });
        expect(t('nope')).toBe('#Missing:nope#');
    });

    it('supports a custom onMissing handler', () => {
        const t = asDynamicCaller(makeBase(), {
            typedKeys: false,
            onMissing: (path) => `[[${path}]]`,
        });
        expect(t('nope')).toBe('[[nope]]');
    });

    it('leaves nested objects untouched when not recursive', () => {
        const t = asDynamicCaller(makeBase());
        expect(t.user.name()).toBe('Ada');
        expect(typeof t.user).toBe('object');
        expect(typeof t.user).not.toBe('function');
    });

    describe('recursive', () => {
        it('makes nested objects callable too', () => {
            const t = asDynamicCaller(makeBase(), { recursive: true });
            expect(t('farewell')).toBe('Goodbye');
            expect(t.user('name')).toBe('Ada');
            expect(t.user.name()).toBe('Ada');
        });

        it('reports the full dotted path to onMissing', () => {
            const t = asDynamicCaller(makeBase(), {
                recursive: true,
                typedKeys: false,
                onMissing: (path) => `missing:${path}`,
            });
            expect(t('nope')).toBe('missing:nope');
            expect(t.user('nope')).toBe('missing:user.nope');
        });
    });

    it('keeps translation keys enumerable and the call brand hidden', () => {
        const t = asDynamicCaller(makeBase(), { recursive: true });

        expect(t('farewell')).toBe('Goodbye');
        expect(Object.keys(t)).toEqual(
            expect.arrayContaining(['greeting', 'farewell', 'user'])
        );
        expect(Object.keys(t.user)).toEqual(['name']);
    });

    it('brands the callable object as a lang-tag special', () => {
        const t = asDynamicCaller(makeBase(), { recursive: true });

        expect(isLangTagSpecial(t)).toBe(true);
        expect(t[LangTagSpecial]).toBe('dynamic-caller');
        expect(isLangTagSpecial(t.user)).toBe(true);
        expect(t.user[LangTagSpecial]).toBe('dynamic-caller');
        expect(isLangTagSpecial(t.greeting)).toBe(false);
    });

    describe('typedKeys', () => {
        it('is a type-only switch and does not change runtime behaviour', () => {
            const t = asDynamicCaller(makeBase());
            expect(t('farewell')).toBe('Goodbye');
            expect(t('greeting', { name: 'Paul' })).toBe('Hello Paul');

            const loose = asDynamicCaller(makeBase(), { typedKeys: false });
            expect(loose('farewell')).toBe('Goodbye');
        });
    });

    describe('nested section with placeholders', () => {
        const interpolate = (value: string, params?: Record<string, any>) =>
            value.replace(
                /\{\{(.*?)\}\}/g,
                (_, key) => params?.[key.trim()] ?? ''
            );

        const makeMailbox = () => ({
            inbox: {
                title: () => 'Inbox',
                unread: (params?: { count?: number; sender?: string }) =>
                    interpolate(
                        'You have {{count}} unread from {{sender}}',
                        params
                    ),
                empty: () => 'Nothing here',
            },
            profile: {
                greeting: (params?: { name?: string }) =>
                    interpolate('Hello {{name}}', params),
                name: (params?: { name?: string }) =>
                    interpolate('{{name}}', params),
            },
        });

        it('forwards params through a nested leaf and the section caller', () => {
            const t = asDynamicCaller(makeMailbox(), { recursive: true });

            expect(t.inbox.unread({ count: 3, sender: 'Ada' })).toBe(
                'You have 3 unread from Ada'
            );
            expect(t.inbox('unread', { count: 3, sender: 'Ada' })).toBe(
                'You have 3 unread from Ada'
            );
            expect(t.profile.name({ name: 'Ada' })).toBe('Ada');
            expect(t.profile('name', { name: 'Ada' })).toBe('Ada');
        });
    });
});
