import { hrtime } from 'node:process';

import { $LT_TagProcessor } from '../src/core/processor';

interface Scenario {
    name: string;
    content: string;
    expectedTags: number;
    translationArgPosition?: 1 | 2;
    tagName?: string;
}

const scenarios: Scenario[] = [
    {
        name: 'deeply nested objects',
        expectedTags: 1,
        content: `const translations = lang({
            dashboard: {
                kpi: {
                    graph: {
                        type: {
                            orders: 'Orders',
                            products: 'Products',
                            revenue: 'Revenue',
                        },
                    },
                },
            },
        }, { namespace: 'dashboard', path: 'page.main' });`,
    },
    {
        name: 'nested satisfies',
        expectedTags: 1,
        content: `const translations = lang({
            siteRemoval: {
                activeOrders: 'The site has active orders',
                lastSite: 'The last site cannot be removed',
            } satisfies Record<SiteRemovalMessage, string>,
            validation: {
                required: 'This field is required',
            },
        }, { namespace: 'page' });`,
    },
    {
        name: 'recursive type modifiers',
        expectedTags: 1,
        content: `const translations = lang({
            common: {
                missing: 'Missing',
            } as const,
            dashboard: {
                labels: {
                    orders: 'Orders',
                    products: 'Products',
                } as const satisfies Readonly<Record<DashboardLabel, string>>,
            },
        } as const satisfies Record<PageSection, unknown>, {
            namespace: 'page',
        });`,
    },
    {
        name: 'nested arrays as const',
        expectedTags: 1,
        content: `const translations = lang({
            steps: [
                { title: 'First', description: 'Start' },
                { title: 'Second', description: 'Finish' },
            ] as const,
            matrix: [
                ['One', 'Two'],
                ['Three', 'Four'],
            ] as const,
        }, { namespace: 'wizard' });`,
    },
    {
        name: 'complex generic',
        expectedTags: 1,
        content: `const translations = lang<
            Readonly<Record<'new' | 'done', { label: string; hints: string[] }>>
        >({
            new: { label: 'New', hints: ['Recently created'] },
            done: { label: 'Done', hints: ['Already completed'] },
        });`,
    },
    {
        name: 'inline satisfies type',
        expectedTags: 1,
        content: `const translations = lang({
            new: 'New order',
            done: 'Completed',
        } satisfies {
            readonly new: string;
            readonly done: string;
        }, { namespace: 'orders' });`,
    },
    {
        name: 'comments and trailing commas',
        expectedTags: 1,
        content: `export const translations = lang(
            {
                // A line comment with lang({ fake: 'tag' })
                title: 'Title',
                /* A block comment with braces { } and satisfies Fake */
                description: 'Description',
            },
            {
                namespace: 'comments',
                path: 'example',
            },
        );`,
    },
    {
        name: 'syntax tokens in strings',
        expectedTags: 1,
        content: `const translations = lang({
            braces: 'Value with { nested } braces',
            call: "lang({ fake: 'tag' })",
            assertion: 'as const satisfies Record<Key, string>',
            escaped: 'It\\'s still a string',
            template: \`Template without interpolation: { value }\`,
        }, { namespace: 'strings' });`,
    },
    {
        name: 'multiple tags in one file',
        expectedTags: 4,
        content: `
            export const common = lang({ save: 'Save', cancel: 'Cancel' }, { namespace: 'common' });
            const orders = lang({ new: 'New', done: 'Done' } satisfies Record<Status, string>);
            lang({ anonymous: 'Anonymous use' }, { namespace: 'anonymous' });
            const finalTag = lang({ value: 'Final' } as const, { namespace: 'final' });
        `,
    },
    {
        name: 'comments with false positives',
        expectedTags: 1,
        content: `
            // const ignored = lang({ key: 'Ignored' });
            /* lang({ nested: { ignored: 'Ignored' } }, { namespace: 'ignored' }); */
            const source = "lang({ string: 'Ignored' })";
            const actual = lang({ key: 'Collected' }, { namespace: 'actual' });
        `,
    },
    {
        name: 'translations at position two',
        expectedTags: 1,
        tagName: 't',
        translationArgPosition: 2,
        content: `const translations = t(
            { namespace: 'reversed', path: 'deep.path' },
            {
                common: { title: 'Title' } as const,
                status: {
                    new: 'New',
                    done: 'Done',
                } satisfies Record<Status, string>,
            } as const,
        );`,
    },
    {
        name: 'multiline string recovery',
        expectedTags: 1,
        content: `const translations = lang({
            message: 'First line
Second line',
            other: "Another
multiline value",
        }, { namespace: 'multiline' });`,
    },
    {
        name: 'deep type nesting',
        expectedTags: 1,
        content: `const translations = lang({
            value: 'Value',
        } satisfies Readonly<Record<
            keyof Pick<Source, 'first' | 'second'>,
            Array<{ readonly label: string; readonly metadata: [string, number] }>
        >>);`,
    },
    {
        name: 'nested inline type assertions',
        expectedTags: 1,
        content: `const translations = lang({
            group: {
                first: 'First',
                second: 'Second',
            } satisfies {
                first: string;
                second: string;
            },
            footer: { copyright: 'Copyright' } as const,
        }, { namespace: 'inline' });`,
    },
    {
        name: 'malformed calls',
        expectedTags: 0,
        content: `
            const missingParen = lang({ key: 'Value' };
            const missingComma = lang({ key: 'Value' } { namespace: 'broken' });
            const missingBrace = lang({ nested: { key: 'Value' });
        `,
    },
    {
        name: 'template interpolation rejection',
        expectedTags: 0,
        content: [
            'const translations = lang({',
            '    dynamic: `Hello, ${userName}`,',
            "}, { namespace: 'dynamic' });",
        ].join('\n'),
    },
];

const measuredIterations = readPositiveInteger(
    process.env.BENCH_ITERATIONS,
    75
);
const warmupIterations = readPositiveInteger(process.env.BENCH_WARMUP, 15);

const preparedScenarios = scenarios.map((scenario) => ({
    ...scenario,
    processor: new $LT_TagProcessor({
        tagName: scenario.tagName ?? 'lang',
        translationArgPosition: scenario.translationArgPosition ?? 1,
    }),
    samplesNs: [] as number[],
    fingerprint: '',
}));

for (const scenario of preparedScenarios) {
    const tags = scenario.processor.extractTags(scenario.content);
    if (tags.length !== scenario.expectedTags) {
        throw new Error(
            `${scenario.name}: expected ${scenario.expectedTags} tags, received ${tags.length}`
        );
    }
    scenario.fingerprint = fingerprint(tags);
}

for (let iteration = 0; iteration < warmupIterations; iteration++) {
    for (const scenario of preparedScenarios) {
        assertStableResult(
            scenario,
            scenario.processor.extractTags(scenario.content)
        );
    }
}

const suiteSamplesNs: number[] = [];
let parsedTags = 0;

for (let iteration = 0; iteration < measuredIterations; iteration++) {
    let suiteElapsedNs = 0;

    for (const scenario of preparedScenarios) {
        const start = hrtime.bigint();
        const tags = scenario.processor.extractTags(scenario.content);
        const elapsedNs = Number(hrtime.bigint() - start);

        scenario.samplesNs.push(elapsedNs);
        suiteElapsedNs += elapsedNs;
        parsedTags += tags.length;
        assertStableResult(scenario, tags);
    }

    suiteSamplesNs.push(suiteElapsedNs);
}

const allSamplesNs = preparedScenarios.flatMap(
    (scenario) => scenario.samplesNs
);
const totalNs = allSamplesNs.reduce((sum, sample) => sum + sample, 0);
const totalParses = allSamplesNs.length;

console.log('\nParser benchmark results');
console.table(
    preparedScenarios.map((scenario) => {
        const stats = calculateStats(scenario.samplesNs);
        return {
            scenario: scenario.name,
            tags: scenario.expectedTags,
            'avg µs': formatMicroseconds(stats.average),
            'median µs': formatMicroseconds(stats.median),
            'p95 µs': formatMicroseconds(stats.p95),
            'min µs': formatMicroseconds(stats.minimum),
            'max µs': formatMicroseconds(stats.maximum),
        };
    })
);

const suiteStats = calculateStats(suiteSamplesNs);
console.log('Summary');
console.log(`  Scenarios:             ${preparedScenarios.length}`);
console.log(`  Warmup rounds:         ${warmupIterations}`);
console.log(`  Measured rounds:       ${measuredIterations}`);
console.log(`  Total parser calls:    ${totalParses}`);
console.log(`  Parsed tags:           ${parsedTags}`);
console.log(`  Total parser time:     ${(totalNs / 1_000_000).toFixed(3)} ms`);
console.log(
    `  Average per parse:     ${formatMicroseconds(totalNs / totalParses)} µs`
);
console.log(
    `  Average per full run:  ${formatMicroseconds(suiteStats.average)} µs`
);
console.log(
    `  Median per full run:   ${formatMicroseconds(suiteStats.median)} µs`
);
console.log(
    `  Full runs per second:  ${(1_000_000_000 / suiteStats.average).toFixed(
        2
    )}`
);

function fingerprint(
    tags: ReturnType<$LT_TagProcessor['extractTags']>
): string {
    return JSON.stringify(
        tags.map((tag) => ({
            fullMatch: tag.fullMatch,
            genericType: tag.genericType,
            satisfiesType: tag.satisfiesType,
            asConst: tag.asConst,
            translations: tag.parameterTranslations,
            config: tag.parameterConfig,
            validity: tag.validity,
        }))
    );
}

function assertStableResult(
    scenario: (typeof preparedScenarios)[number],
    tags: ReturnType<$LT_TagProcessor['extractTags']>
): void {
    const currentFingerprint = fingerprint(tags);
    if (currentFingerprint !== scenario.fingerprint) {
        throw new Error(`${scenario.name}: parser returned an unstable result`);
    }
}

function calculateStats(samples: number[]) {
    const sorted = [...samples].sort((a, b) => a - b);
    const total = sorted.reduce((sum, sample) => sum + sample, 0);
    const middle = Math.floor(sorted.length / 2);
    const median =
        sorted.length % 2 === 0
            ? (sorted[middle - 1] + sorted[middle]) / 2
            : sorted[middle];

    return {
        average: total / sorted.length,
        median,
        p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
        minimum: sorted[0],
        maximum: sorted[sorted.length - 1],
    };
}

function formatMicroseconds(nanoseconds: number): string {
    return (nanoseconds / 1_000).toFixed(3);
}

function readPositiveInteger(
    value: string | undefined,
    fallback: number
): number {
    if (value === undefined) return fallback;

    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Expected a positive integer, received "${value}"`);
    }
    return parsed;
}
