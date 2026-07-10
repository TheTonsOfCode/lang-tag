/**
 * Type-level checks for the dynamic-caller preset.
 *
 * This file is type-checked (not executed) as part of `npm test` via
 * `tsc --noEmit` (tsconfig `include: ["src", "tests"]`). It carries no runtime
 * assertions; its sole purpose is to fail compilation if the preset's public
 * types regress. The `@ts-expect-error` lines double as guarantees that the
 * editor reports these as errors (and, conversely, autocompletes the valid
 * caller name / keys).
 */
import {
    type DynamicCaller,
    type WithDynamicCaller,
    withDynamicCaller,
} from '@/dynamic-caller';

// Compile-time equality assertion helpers.
type Expect<T extends true> = T;
type Equal<A, B> =
    (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
        ? true
        : false;

type Base = {
    greeting: (params?: { name?: string }) => string;
    user: {
        name: () => string;
    };
};

// --- Non-recursive (default) ------------------------------------------------

type Default = WithDynamicCaller<Base, '$', false>;

// The '$' caller is added at the top level...
type _DefaultCaller = Expect<Equal<Default['$'], DynamicCaller>>;
// ...original members are preserved untouched...
type _DefaultGreeting = Expect<Equal<Default['greeting'], Base['greeting']>>;
// ...and nested objects do NOT receive a caller.
type _DefaultNested = Expect<Equal<Default['user'], Base['user']>>;

// --- Recursive --------------------------------------------------------------

type Recursive = WithDynamicCaller<Base, 'call', true>;

type _RecursiveTop = Expect<Equal<Recursive['call'], DynamicCaller>>;
type _RecursiveNested = Expect<Equal<Recursive['user']['call'], DynamicCaller>>;
// Translation functions survive the recursive wrapping.
type _RecursiveFn = Expect<Equal<Recursive['user']['name'], () => string>>;

// --- A different caller name is honoured verbatim ---------------------------

type Renamed = WithDynamicCaller<Base, '__X', true>;
type _RenamedTop = Expect<Equal<Renamed['__X'], DynamicCaller>>;
type _RenamedNested = Expect<Equal<Renamed['user']['__X'], DynamicCaller>>;

// --- Inference through withDynamicCaller ------------------------------------

declare const base: Base;

const def = withDynamicCaller(base);
def.$('greeting');
def.greeting({ name: 'Ada' });
// @ts-expect-error nested objects have no caller unless `recursive` is set
def.user.$('name');

const renamed = withDynamicCaller(base, { callerName: 'call' });
renamed.call('greeting');
// @ts-expect-error the caller was renamed, so `$` no longer exists
renamed.$('greeting');

const rec = withDynamicCaller(base, { recursive: true });
rec.$('greeting');
rec.user.$('name');

// The caller accepts a runtime key plus forwarded params and returns a string.
declare const caller: DynamicCaller;
caller('some.key', { any: 'params' }) satisfies string;
// @ts-expect-error the key argument is required
caller();

// ---------------------------------------------------------------------------
// typedKeys: narrows the caller's key to the object's translation keys.
// ---------------------------------------------------------------------------

// Without typedKeys the key stays `string` (any key accepted).
type LooseCaller = WithDynamicCaller<Base, '$', false>['$'];
type _LooseKey = Expect<Equal<Parameters<LooseCaller>[0], string>>;

// With typedKeys the key becomes the union of *callable* keys (nested
// translation objects are excluded — you navigate to those via property access).
type TypedTop = WithDynamicCaller<Base, '$', false, true>['$'];
type _TypedTopKey = Expect<Equal<Parameters<TypedTop>[0], 'greeting'>>;

// Recursive + typedKeys: nested callers are typed to their own keys.
type TypedNested = WithDynamicCaller<Base, '$', true, true>['user']['$'];
type _TypedNestedKey = Expect<Equal<Parameters<TypedNested>[0], 'name'>>;

const typed = withDynamicCaller(base, { typedKeys: true });
typed.$('greeting');
// @ts-expect-error 'nope' is not a translation key
typed.$('nope');
// @ts-expect-error 'user' is a nested object, not a callable translation key
typed.$('user');

// ---------------------------------------------------------------------------
// Scenario from the issue: keys come from a Record<Union, ...> shape.
// ---------------------------------------------------------------------------

type Status = 'new' | 'done';

// The type driving `lang<Record<Status, any>>({ ... })`.
declare const statusTranslations: Record<Status, () => string>;

const statusTyped = withDynamicCaller(statusTranslations, {
    callerName: '__X',
    recursive: true,
    typedKeys: true,
});

statusTyped.__X('new');
statusTyped.__X('done');
// @ts-expect-error 'saxas' is not one of the Status keys
statusTyped.__X('saxas');

// Assert the caller's key parameter is exactly the Status union.
type StatusCaller = WithDynamicCaller<
    Record<Status, () => string>,
    '__X',
    true,
    true
>['__X'];
type _StatusKeys = Expect<Equal<Parameters<StatusCaller>[0], Status>>;

// Without typedKeys the same shape stays permissive (matches the issue's first
// example, where `lang` does not opt into typed keys).
const statusLoose = withDynamicCaller(statusTranslations, {
    callerName: '__X',
    recursive: true,
});
statusLoose.__X('saxas'); // allowed: key is `string`
