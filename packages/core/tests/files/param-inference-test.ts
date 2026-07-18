/**
 * Type-level checks for placeholder-based parameter inference and strictness axes.
 *
 * This file is validated by `tsc` (see tsconfig `include: ["src", "tests"]`).
 * It contains no runtime assertions; its purpose is to fail compilation if the
 * parameter-inference types regress.
 */
import {
    type CallableTranslations,
    type DefinePlaceholderParams,
    type ExtractDollarBracePlaceholders,
    type ExtractDoubleBracePlaceholders,
    type PlaceholderExtractor,
    type PlaceholderValues,
    createCallableTranslations,
} from '@/index';

// Compile-time equality assertion helper.
type Expect<T extends true> = T;
type Equal<A, B> =
    (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
        ? true
        : false;

// --- Placeholder extraction ------------------------------------------------

type _NoParams = Expect<
    Equal<ExtractDoubleBracePlaceholders<'plain text'>, never>
>;
type _OneParam = Expect<
    Equal<ExtractDoubleBracePlaceholders<'Hello {{name}}'>, 'name'>
>;
type _TwoParams = Expect<
    Equal<
        ExtractDoubleBracePlaceholders<'Test {{ name}} from {{sender}}'>,
        'name' | 'sender'
    >
>;
type _Dollar = Expect<
    Equal<
        ExtractDollarBracePlaceholders<'Hello ${name} and ${ other }'>,
        'name' | 'other'
    >
>;

// --- PlaceholderValues: no placeholders stays permissive for every combo ----

type _PlaceholderNoneOptional = Expect<
    Equal<PlaceholderValues<'plain', false, true>, Record<string, any>>
>;
type _PlaceholderNoneRequired = Expect<
    Equal<PlaceholderValues<'plain', true, false>, Record<string, any>>
>;

// --- DefinePlaceholderParams preserves narrow literals ---------------------

type _Defined = Expect<
    Equal<
        DefinePlaceholderParams<{ required: false; allowExtras: true }>,
        { required: false; allowExtras: true }
    >
>;

// --- Strictness axes (required × allowExtras) -------------------------------

type Shape = {
    greeting: 'Welcome {{name}} to {{place}}!';
    plain: 'No params here';
    nested: {
        order: 'You have {{count}} items';
    };
};

// default (`required: false`, `allowExtras: true`): optional + extra allowed.
declare const l1: CallableTranslations<Shape>;
l1.greeting();
l1.greeting({ name: 'Ada' });
l1.greeting({ name: 'Ada', place: 'Store' });
l1.greeting({ name: 'Ada', anything: 42 }); // extra allowed
l1.plain();
l1.nested.order({ count: 3 });

// `allowExtras: false`: optional + no extra.
declare const l2: CallableTranslations<
    Shape,
    DefinePlaceholderParams<{ allowExtras: false }>
>;
l2.greeting();
l2.greeting({ name: 'Ada' });
// @ts-expect-error extra keys are rejected when allowExtras is false
l2.greeting({ name: 'Ada', anything: 42 });

// `required: true`: params required + extra allowed.
declare const l3: CallableTranslations<
    Shape,
    DefinePlaceholderParams<{ required: true }>
>;
l3.greeting({ name: 'Ada', place: 'Store' });
l3.greeting({ name: 'Ada', place: 'Store', anything: 42 }); // extra allowed
// @ts-expect-error required params cannot be omitted
l3.greeting();
// @ts-expect-error missing required 'place'
l3.greeting({ name: 'Ada' });

// `required: true` + `allowExtras: false`: params required + no extra (strictest).
declare const l4: CallableTranslations<
    Shape,
    DefinePlaceholderParams<{ required: true; allowExtras: false }>
>;
l4.greeting({ name: 'Ada', place: 'Store' });
// @ts-expect-error extra keys rejected when allowExtras is false
l4.greeting({ name: 'Ada', place: 'Store', anything: 42 });
// @ts-expect-error required params cannot be omitted
l4.greeting();

// --- Value type narrowing via the `value` option ---------------------------

declare const strictValues: CallableTranslations<
    { greeting: 'Hello {{name}}' },
    DefinePlaceholderParams<{
        required: true;
        allowExtras: false;
        value: string;
    }>
>;
strictValues.greeting({ name: 'ok' });
// @ts-expect-error value must be a string
strictValues.greeting({ name: 123 });

// --- Overriding the extractor (e.g. `${...}` syntax) -----------------------

interface DollarExtractor extends PlaceholderExtractor {
    placeholders: ExtractDollarBracePlaceholders<this['template']>;
}

declare const dollar: CallableTranslations<
    { greeting: 'Hello ${name} from ${place}' },
    DefinePlaceholderParams<{
        required: true;
        allowExtras: false;
        extractor: DollarExtractor;
    }>
>;
dollar.greeting({ name: 'Ada', place: 'Store' });
// @ts-expect-error required params cannot be omitted with custom extractor
dollar.greeting();

// `{{...}}` is not recognised by the dollar extractor, so no params are inferred
// and the function stays permissive even with `required: true`.
declare const notDollar: CallableTranslations<
    { greeting: 'Hello {{name}}' },
    DefinePlaceholderParams<{
        required: true;
        allowExtras: false;
        extractor: DollarExtractor;
    }>
>;
notDollar.greeting();
notDollar.greeting({ whatever: 1 });

// --- End-to-end through createCallableTranslations (defaults) --------------

const t = createCallableTranslations(
    {
        greeting: 'Welcome {{name}} to {{place}}!',
        plain: 'No params here',
        nested: { order: 'You have {{count}} items' },
    } as const,
    undefined,
    { transform: ({ value }) => value }
);

t.greeting({ name: 'Ada', place: 'Store' });
t.greeting({ name: 'Ada' }); // subset allowed (defaults)
t.greeting(); // omit allowed (defaults)
t.greeting({ extra: 1 }); // extra allowed (defaults)
t.plain();
t.nested.order({ count: 3 });
