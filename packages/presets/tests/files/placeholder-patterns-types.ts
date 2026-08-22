/**
 * Type-level checks for built-in placeholder syntax and
 * {@link processPlaceholders} options.
 *
 * Type-checked only (`tsc --noEmit`). `@ts-expect-error` lines are the
 * contract that `syntax` and `pattern` stay mutually exclusive.
 */
import type { PlaceholderSyntax } from '@/placeholder-patterns';
import { processPlaceholders } from '@/react/placeholders';

type Expect<T extends true> = T;
type Equal<A, B> =
    (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
        ? true
        : false;

/** One name per core `*Extractor` — adding an extractor must update this. */
type AllSyntax =
    | 'doubleBrace'
    | 'dollarBrace'
    | 'singleBrace'
    | 'percentBrace'
    | 'percentPercent'
    | 'colon'
    | 'dollarIdent'
    | 'angleBracket'
    | 'doubleSquare'
    | 'singleSquare';

type _SyntaxCoverage = Expect<Equal<PlaceholderSyntax, AllSyntax>>;

processPlaceholders('Hello {{name}}', { name: 'Ada' });
processPlaceholders('Hello {{name}}', { name: 'Ada' }, {});
processPlaceholders(
    'Hello {{name}}',
    { name: 'Ada' },
    {
        syntax: 'doubleBrace',
    }
);
processPlaceholders(
    'Hello ${name}',
    { name: 'Ada' },
    {
        syntax: 'dollarBrace',
    }
);
processPlaceholders('Hello !name!', { name: 'Ada' }, { pattern: /!(.*?)!/g });

// @ts-expect-error unknown syntax name
processPlaceholders('x', {}, { syntax: 'nope' });

// @ts-expect-error syntax and pattern are mutually exclusive
processPlaceholders('x', {}, { syntax: 'dollarBrace', pattern: /!(.*?)!/g });
