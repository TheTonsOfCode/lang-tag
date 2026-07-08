import { LangTagTranslations, createCallableTranslations } from '@/index';

// `as const` preserves the literal strings so template placeholders survive.
const f = {
    p1: 'Val 1',
    p2: 'Val 2 {{wawar}}',
    sub: {
        p3: 'Val 3 {{a}}',
    },
} as const;

// `const T` keeps the literal types through the generic (like the generated tags).
function t<const T extends LangTagTranslations>(translations: T) {
    return createCallableTranslations(translations, undefined, {
        transform: ({ path }) => path,
    });
}

const F = t(f);
F.p1();

F.sub.p3();
F.sub.p3({ a: 'aaa' });

F.p2({ wawar: 'asdas' }); // `wawar` is inferred + autocompleted from the placeholder

/// ------------

const K = t({
    empty: 'empty',
    withVar: 'Test {{someVar}} bar',
    nested: {
        empty2: 'emptyyy',
        withVariables: 'Variable1: {{var1}}, and other one {{otherOne}}',
    },
});

K.empty({});
K.empty();

K.withVar();
K.withVar({ someVar: 'foo' });

K.nested;
K.nested.empty2;
K.nested.empty2();
K.nested.empty2({});
K.nested.withVariables();
K.nested.withVariables({});
K.nested.withVariables({ var1: 'one' });
K.nested.withVariables({ var1: 'foo', otherOne: 'bar' });


K.nested.withVariables({})
