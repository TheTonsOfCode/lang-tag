/**
 * Type-level checks for placeholder-based parameter inference and strictness levels.
 *
 * This file is validated by `tsc` (see tsconfig `include: ["src", "tests"]`).
 * It contains no runtime assertions; its purpose is to fail compilation if the
 * parameter-inference types regress.
 */
import {
    type CallableTranslations,
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

// --- PlaceholderValues: no placeholders stays permissive at every level ----

type _PlaceholderNoneOptional = Expect<
    Equal<PlaceholderValues<'plain', 'optional-open'>, Record<string, any>>
>;
type _PlaceholderNoneRequired = Expect<
    Equal<PlaceholderValues<'plain', 'required-closed'>, Record<string, any>>
>;

// --- Strictness levels 1..4 ------------------------------------------------

type Shape = {
    greeting: 'Welcome {{name}} to {{place}}!';
    plain: 'No params here';
    nested: {
        order: 'You have {{count}} items';
    };
};

// 'optional-open' (default): optional + extra allowed.
declare const l1: CallableTranslations<Shape>;
l1.greeting();
l1.greeting({ name: 'Ada' });
l1.greeting({ name: 'Ada', place: 'Store' });
l1.greeting({ name: 'Ada', anything: 42 }); // extra allowed
l1.plain();
l1.nested.order({ count: 3 });

// 'optional-closed': optional + no extra.
declare const l2: CallableTranslations<Shape, { level: 'optional-closed' }>;
l2.greeting();
l2.greeting({ name: 'Ada' });
// @ts-expect-error extra keys are rejected when closed
l2.greeting({ name: 'Ada', anything: 42 });

// 'required-open': required + extra allowed.
declare const l3: CallableTranslations<Shape, { level: 'required-open' }>;
l3.greeting({ name: 'Ada', place: 'Store' });
l3.greeting({ name: 'Ada', place: 'Store', anything: 42 }); // extra allowed
// @ts-expect-error required params cannot be omitted
l3.greeting();
// @ts-expect-error missing required 'place'
l3.greeting({ name: 'Ada' });

// 'required-closed': required + no extra (strictest).
declare const l4: CallableTranslations<Shape, { level: 'required-closed' }>;
l4.greeting({ name: 'Ada', place: 'Store' });
// @ts-expect-error extra keys rejected when closed
l4.greeting({ name: 'Ada', place: 'Store', anything: 42 });
// @ts-expect-error required params cannot be omitted
l4.greeting();

// --- Value type narrowing via the `value` option ---------------------------

declare const strictValues: CallableTranslations<
    { greeting: 'Hello {{name}}' },
    { level: 'required-closed'; value: string }
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
    { level: 'required-closed'; extractor: DollarExtractor }
>;
dollar.greeting({ name: 'Ada', place: 'Store' });
// @ts-expect-error required params cannot be omitted with custom extractor
dollar.greeting();

// `{{...}}` is not recognised by the dollar extractor, so no params are inferred
// and the function stays permissive even at 'required-closed'.
declare const notDollar: CallableTranslations<
    { greeting: 'Hello {{name}}' },
    { level: 'required-closed'; extractor: DollarExtractor }
>;
notDollar.greeting();
notDollar.greeting({ whatever: 1 });

// --- End-to-end through createCallableTranslations (default level 1) --------

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
t.greeting({ name: 'Ada' }); // subset allowed (level 1)
t.greeting(); // omit allowed (level 1)
t.greeting({ extra: 1 }); // extra allowed (level 1)
t.plain();
t.nested.order({ count: 3 });
