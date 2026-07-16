import { NamespaceCollector } from '@/algorithms';
import { LangTagCLIConfig } from '@/type';

export const LANG_TAG_DEFAULT_CONFIG: LangTagCLIConfig = {
    tagName: 'lang',
    isLibrary: false,
    enforceLibraryTagPrefix: true,
    includes: ['src/**/*.{js,ts,jsx,tsx}'],
    excludes: ['node_modules', 'dist', 'build'],
    localesDirectory: 'locales',
    baseLanguageCode: 'en',
    collect: {
        collector: new NamespaceCollector(),
        defaultNamespace: 'common',
        ignoreConflictsWithMatchingValues: true,
        onCollectConfigFix: ({ config, langTagConfig }) => {
            if (langTagConfig.isLibrary) return config;

            if (!config)
                return {
                    path: '',
                    namespace: langTagConfig.collect!.defaultNamespace!,
                };
            if (!config.path) config.path = '';
            if (!config.namespace)
                config.namespace = langTagConfig.collect!.defaultNamespace!;
            return config;
        },
        onConflictResolution: async (context) => {
            await context.logger.conflict(context.conflict, true);
            // By default, continue processing even if conflicts occur
            // Call context.exit(); to terminate the process upon the first conflict
        },
        onCollectFinish: (context) => {
            if (context.conflicts.length) context.exit(); // Stop the process to avoid merging on conflict
        },
    },
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: (context) => {
            for (let e of context.exports) {
                context.logger.info(
                    'Detected lang tag exports at package {packageName}',
                    { packageName: e.packageJSON.name }
                );
            }

            context.logger.warn(
                `
Import Algorithm Not Configured

To import external language tags, you need to configure an import algorithm.

Setup Instructions:
1. Add this import at the top of your configuration file:
   {importStr}

2. Replace import.onImport function with:
   {onImport}

This will enable import of language tags from external packages.
            `.trim(),
                {
                    importStr:
                        "const { flexibleImportAlgorithm } = require('@lang-tag/cli/algorithms');",
                    onImport:
                        'onImport: flexibleImportAlgorithm({ filePath: { includePackageInPath: true } })',
                }
            );
        },
    },
    translationArgPosition: 1,
    hideDistDir: 'dist',
    onConfigGeneration: async (context) => {
        context.logger.info(
            'Config generation is not configured. Add onConfigGeneration handler to customize config generation.'
        );
    },
};
