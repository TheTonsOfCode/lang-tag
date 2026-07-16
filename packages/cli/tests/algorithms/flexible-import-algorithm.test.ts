import { describe, expect, it, vi } from 'vitest';

import { flexibleImportAlgorithm } from '@/algorithms/import/flexible-import-algorithm';
import { ImportManager } from '@/core/import/import-manager';
import { LangTagCLIImportContext } from '@/type';

// Helper function to create a mock context
function createMockContext(
    exports: Array<{ packageJSON: any; exportData: any }>,
    debug: boolean = false
): LangTagCLIImportContext {
    const importManager = new ImportManager();

    vi.spyOn(importManager, 'importTag');

    return {
        exports,
        logger: {
            config: { debug },
            info: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
            success: vi.fn(),
            error: vi.fn(),
        },
        langTagConfig: {
            debug,
        },
        importManager,
    } as any;
}

// Helper function to create mock export data
function createMockExportData(
    packageName: string,
    files: Array<{ relativeFilePath: string; tags: any[] }>
) {
    return {
        packageJSON: { name: packageName },
        exportData: {
            baseLanguageCode: 'en',
            files,
        },
    };
}

// Helper function to create mock tag
function createMockTag(
    variableName: string,
    translations: any = { hello: 'Hello' },
    config: any = { namespace: 'common' }
) {
    return {
        variableName,
        translations,
        config,
    };
}

describe('flexibleImportAlgorithm', () => {
    describe('Basic functionality', () => {
        it('should import all tags from all packages with default options', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting'),
                            createMockTag('farewell'),
                        ],
                    },
                ]),
                createMockExportData('package2', [
                    {
                        relativeFilePath: 'ui.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(3);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'farewell',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'ui.ts',
                {
                    variableName: 'button',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle packages without names', () => {
            const exports = [
                {
                    packageJSON: {},
                    exportData: {
                        baseLanguageCode: 'en',
                        files: [
                            {
                                relativeFilePath: 'unknown.ts',
                                tags: [createMockTag('test')],
                            },
                        ],
                    },
                },
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'unknown.ts',
                {
                    variableName: 'test',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should auto-generate variable names for tags without variableName by default', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            {
                                ...createMockTag('auto_name'),
                                variableName: undefined,
                            },
                            {
                                ...createMockTag('auto_name2'),
                                variableName: undefined,
                            },
                            createMockTag('another_valid'),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm(); // No options - use defaults

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(4);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'valid',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'translations2',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'translations3',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'another_valid',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should skip tags without variableName when explicitly set to skip', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            {
                                ...createMockTag('invalid'),
                                variableName: undefined,
                            },
                            createMockTag('another_valid'),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    handleMissingVariableName: 'skip',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'valid',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'another_valid',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping tag without variableName in package1/common.ts'
            );
        });
    });

    describe('Variable name options', () => {
        it('should prefix variable names with package name when enabled', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'my_package_greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle scoped packages with replace option', () => {
            const exports = [
                createMockExportData('@scope/package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'replace',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'scope_package_greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle scoped packages with remove-scope option', () => {
            const exports = [
                createMockExportData('@scope/package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'remove-scope',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'package_greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should apply case transformation to variable names', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my_variable')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    case: 'camel',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'myPackageMyVariable',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should not apply case transformation when case is "no"', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my_variable')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    case: 'no',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'my_package_my_variable',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should auto-generate variable names for tags without variableName', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            {
                                ...createMockTag('auto_name'),
                                variableName: undefined,
                            },
                            {
                                ...createMockTag('auto_name2'),
                                variableName: undefined,
                            },
                            createMockTag('another_valid'),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    handleMissingVariableName: 'auto-generate',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(4);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'valid',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'translations2',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'translations3',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'another_valid',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should use custom function for handling missing variable names', () => {
            const exports = [
                createMockExportData('my_package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            {
                                ...createMockTag('invalid'),
                                variableName: undefined,
                            },
                            {
                                ...createMockTag('another_invalid'),
                                variableName: undefined,
                            },
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    handleMissingVariableName: (
                        tag,
                        packageName,
                        fileName,
                        index
                    ) => {
                        const baseName = fileName.replace('.ts', '');
                        return `${packageName}_${baseName}_${index + 1}`;
                    },
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(3);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'valid',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'my_package_common_2',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'my_package_common_3',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should apply case transformation to auto-generated variable names', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            {
                                ...createMockTag('invalid'),
                                variableName: undefined,
                            },
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    handleMissingVariableName: 'auto-generate',
                    case: 'camel',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'myPackageTranslations1',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should sanitize variable names by default', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my-variable')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'my$variable',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should sanitize variable names with dots and spaces', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my.variable name')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'my$variable$name',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should sanitize variable names starting with numbers', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('123variable')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: '$123variable',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should not sanitize when sanitizeVariableName is false', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my.variable')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    sanitizeVariableName: false,
                },
            });

            expect(() => algorithm(context)).toThrow(
                'Invalid JavaScript identifier: "my.variable"'
            );
        });

        it('should sanitize after case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my.variable-name')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    case: 'upper',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'MY$VARIABLE$NAME',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should throw error when duplicate variable names exist in same file', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting'),
                            createMockTag('greeting'),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            expect(() => algorithm(context)).toThrow(
                'Duplicate variable name "greeting" in file "common.ts". Variable names must be unique within the same file.'
            );
        });
    });

    describe('File path options', () => {
        it('should group all translations by package when groupByPackage is enabled', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                    {
                        relativeFilePath: 'ui.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    groupByPackage: true,
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my-package.ts',
                expect.objectContaining({
                    variableName: 'greeting',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my-package.ts',
                expect.objectContaining({
                    variableName: 'button',
                })
            );
        });

        it('should include package name in path when includePackageInPath is enabled', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my-package/common.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle scoped packages in file paths with replace option', () => {
            const exports = [
                createMockExportData('@scope/package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    groupByPackage: true,
                    scopedPackageHandling: 'replace',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'scope-package.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should apply case transformation to file paths', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'my-file.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: 'camel',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'myPackage/myFile.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });
    });

    describe('Exclusion options', () => {
        it('should exclude packages by name', () => {
            const exports = [
                createMockExportData('allowed-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
                createMockExportData('excluded-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('farewell')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    packages: ['excluded-package'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'greeting',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping excluded package: excluded-package'
            );
        });

        it('should exclude tags by namespace patterns', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag(
                                'greeting',
                                { hello: 'Hello' },
                                { namespace: 'common' }
                            ),
                            createMockTag(
                                'admin_action',
                                { action: 'Action' },
                                { namespace: 'admin.user' }
                            ),
                            createMockTag(
                                'internal_util',
                                { util: 'Util' },
                                { namespace: 'internal' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*', 'internal*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'greeting',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping excluded namespace: admin.user'
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping excluded namespace: internal'
            );
        });

        it('should handle wildcard namespace patterns', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag(
                                'greeting',
                                { hello: 'Hello' },
                                { namespace: 'common' }
                            ),
                            createMockTag(
                                'admin_user',
                                { user: 'User' },
                                { namespace: 'admin.user' }
                            ),
                            createMockTag(
                                'admin_settings',
                                { settings: 'Settings' },
                                { namespace: 'admin.settings' }
                            ),
                            createMockTag(
                                'internal_util',
                                { util: 'Util' },
                                { namespace: 'internal.util' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*', 'internal*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'greeting',
                })
            );
        });
    });

    describe('Inclusion options', () => {
        it('should include only specified packages', () => {
            const exports = [
                createMockExportData('allowed-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
                createMockExportData('excluded-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('farewell')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['allowed-package'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'greeting',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: excluded-package'
            );
        });

        it('should include only specified namespaces', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag(
                                'greeting',
                                { hello: 'Hello' },
                                { namespace: 'common' }
                            ),
                            createMockTag(
                                'admin_action',
                                { action: 'Action' },
                                { namespace: 'admin.user' }
                            ),
                            createMockTag(
                                'internal_util',
                                { util: 'Util' },
                                { namespace: 'internal' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                include: {
                    namespaces: ['common', 'admin.*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'greeting',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'admin_action',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping namespace not in include list: internal'
            );
        });

        it('should handle wildcard package patterns', () => {
            const exports = [
                createMockExportData('@company/ui-button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('primary')],
                    },
                ]),
                createMockExportData('@company/ui-input', [
                    {
                        relativeFilePath: 'input.ts',
                        tags: [createMockTag('text')],
                    },
                ]),
                createMockExportData('@company/utils-helpers', [
                    {
                        relativeFilePath: 'helpers.ts',
                        tags: [createMockTag('format')],
                    },
                ]),
                createMockExportData('other-package', [
                    {
                        relativeFilePath: 'other.ts',
                        tags: [createMockTag('other')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['@company/ui-*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'button.ts',
                expect.objectContaining({
                    variableName: 'primary',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'input.ts',
                expect.objectContaining({
                    variableName: 'text',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: @company/utils-helpers'
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: other-package'
            );
        });

        it('should handle wildcard namespace patterns', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag(
                                'greeting',
                                { hello: 'Hello' },
                                { namespace: 'ui.common' }
                            ),
                            createMockTag(
                                'button',
                                { text: 'Button' },
                                { namespace: 'ui.components' }
                            ),
                            createMockTag(
                                'admin_user',
                                { user: 'User' },
                                { namespace: 'admin.user' }
                            ),
                            createMockTag(
                                'admin_settings',
                                { settings: 'Settings' },
                                { namespace: 'admin.settings' }
                            ),
                            createMockTag(
                                'internal_util',
                                { util: 'Util' },
                                { namespace: 'internal.util' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                include: {
                    namespaces: ['ui.*', 'admin.*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(4);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'greeting',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'button',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'admin_user',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                expect.objectContaining({
                    variableName: 'admin_settings',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping namespace not in include list: internal.util'
            );
        });

        it('should combine include and exclude patterns', () => {
            const exports = [
                createMockExportData('@company/ui-button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [
                            createMockTag(
                                'primary',
                                { text: 'Primary' },
                                { namespace: 'ui.common' }
                            ),
                            createMockTag(
                                'admin_button',
                                { text: 'Admin Button' },
                                { namespace: 'admin.ui' }
                            ),
                        ],
                    },
                ]),
                createMockExportData('@company/ui-input', [
                    {
                        relativeFilePath: 'input.ts',
                        tags: [
                            createMockTag(
                                'text',
                                { text: 'Text' },
                                { namespace: 'ui.common' }
                            ),
                            createMockTag(
                                'admin_input',
                                { text: 'Admin Input' },
                                { namespace: 'admin.ui' }
                            ),
                        ],
                    },
                ]),
                createMockExportData('@company/internal-lib', [
                    {
                        relativeFilePath: 'internal.ts',
                        tags: [
                            createMockTag(
                                'secret',
                                { text: 'Secret' },
                                { namespace: 'internal' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['@company/ui-*'],
                },
                exclude: {
                    namespaces: ['admin.*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'button.ts',
                expect.objectContaining({
                    variableName: 'primary',
                })
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'input.ts',
                expect.objectContaining({
                    variableName: 'text',
                })
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: @company/internal-lib'
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping excluded namespace: admin.ui'
            );
        });
    });

    describe('Pattern matching (matchesAnyPattern)', () => {
        it('should match exact package names', () => {
            const exports = [
                createMockExportData('exact-match', [
                    {
                        relativeFilePath: 'test.ts',
                        tags: [createMockTag('test')],
                    },
                ]),
                createMockExportData('no-match', [
                    {
                        relativeFilePath: 'test.ts',
                        tags: [createMockTag('test')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true);
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['exact-match'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: no-match'
            );
        });

        it('should match wildcard patterns for packages', () => {
            const exports = [
                createMockExportData('ui-button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
                createMockExportData('ui-input', [
                    {
                        relativeFilePath: 'input.ts',
                        tags: [createMockTag('input')],
                    },
                ]),
                createMockExportData('utils-helpers', [
                    {
                        relativeFilePath: 'helpers.ts',
                        tags: [createMockTag('helpers')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true);
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['ui-*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: utils-helpers'
            );
        });

        it('should match scoped package patterns', () => {
            const exports = [
                createMockExportData('@company/ui-button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
                createMockExportData('@company/utils-helpers', [
                    {
                        relativeFilePath: 'helpers.ts',
                        tags: [createMockTag('helpers')],
                    },
                ]),
                createMockExportData('@other/ui-button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true);
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['@company/*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: @other/ui-button'
            );
        });

        it('should match namespace patterns with dots', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'test.ts',
                        tags: [
                            createMockTag(
                                'ui_common',
                                { text: 'UI Common' },
                                { namespace: 'ui.common' }
                            ),
                            createMockTag(
                                'ui_components',
                                { text: 'UI Components' },
                                { namespace: 'ui.components' }
                            ),
                            createMockTag(
                                'admin_user',
                                { text: 'Admin User' },
                                { namespace: 'admin.user' }
                            ),
                            createMockTag(
                                'internal_util',
                                { text: 'Internal Util' },
                                { namespace: 'internal.util' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true);
            const algorithm = flexibleImportAlgorithm({
                include: {
                    namespaces: ['ui.*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping namespace not in include list: admin.user'
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping namespace not in include list: internal.util'
            );
        });

        it('should handle multiple patterns in include', () => {
            const exports = [
                createMockExportData('ui-button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
                createMockExportData('utils-helpers', [
                    {
                        relativeFilePath: 'helpers.ts',
                        tags: [createMockTag('helpers')],
                    },
                ]),
                createMockExportData('other-lib', [
                    {
                        relativeFilePath: 'other.ts',
                        tags: [createMockTag('other')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true);
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['ui-*', 'utils-*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: other-lib'
            );
        });

        it('should handle empty patterns array', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'test.ts',
                        tags: [createMockTag('test')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true);
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: [],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(0);
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: package1'
            );
        });

        it('should handle complex wildcard patterns', () => {
            const exports = [
                createMockExportData('@company/ui-button-v2', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
                createMockExportData('@company/ui-input-v1', [
                    {
                        relativeFilePath: 'input.ts',
                        tags: [createMockTag('input')],
                    },
                ]),
                createMockExportData('@company/utils-helpers-v3', [
                    {
                        relativeFilePath: 'helpers.ts',
                        tags: [createMockTag('helpers')],
                    },
                ]),
                createMockExportData('@other/ui-button-v2', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('button')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true);
            const algorithm = flexibleImportAlgorithm({
                include: {
                    packages: ['@company/ui-*-v*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: @company/utils-helpers-v3'
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Skipping package not in include list: @other/ui-button-v2'
            );
        });
    });

    describe('Complex scenarios', () => {
        it('should handle multiple packages with different configurations', () => {
            const exports = [
                createMockExportData('@ui/button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [
                            createMockTag(
                                'primary',
                                { text: 'Primary' },
                                { namespace: 'ui' }
                            ),
                            createMockTag(
                                'secondary',
                                { text: 'Secondary' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
                createMockExportData('@utils/helpers', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag(
                                'format',
                                { text: 'Format' },
                                { namespace: 'utils' }
                            ),
                        ],
                    },
                ]),
                createMockExportData('internal-lib', [
                    {
                        relativeFilePath: 'internal.ts',
                        tags: [
                            createMockTag(
                                'secret',
                                { text: 'Secret' },
                                { namespace: 'internal' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'replace',
                    case: 'camel',
                },
                filePath: {
                    groupByPackage: true,
                    scopedPackageHandling: 'remove-scope',
                    case: 'kebab',
                },
                exclude: {
                    packages: ['internal-lib'],
                    namespaces: ['internal.*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(3);

            // UI Button package
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'button.ts',
                {
                    variableName: 'uiButtonPrimary',
                    translations: { text: 'Primary' },
                    config: { namespace: 'ui' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'button.ts',
                {
                    variableName: 'uiButtonSecondary',
                    translations: { text: 'Secondary' },
                    config: { namespace: 'ui' },
                }
            );

            // Utils package
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'helpers.ts',
                {
                    variableName: 'utilsHelpersFormat',
                    translations: { text: 'Format' },
                    config: { namespace: 'utils' },
                }
            );
        });

        it('should handle empty exports array', () => {
            const exports: any[] = [];
            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).not.toHaveBeenCalled();
        });

        it('should handle packages with empty files array', () => {
            const exports = [createMockExportData('empty-package', [])];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).not.toHaveBeenCalled();
        });

        it('should handle files with empty tags array', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'empty.ts',
                        tags: [],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).not.toHaveBeenCalled();
        });
    });

    describe('Debug logging', () => {
        it('should log debug information when debug is enabled', () => {
            const exports = [
                createMockExportData('test-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.logger.debug).toHaveBeenCalledWith(
                'Processing library: test-package'
            );
            expect(context.logger.debug).toHaveBeenCalledWith(
                'Imported: greeting -> common.ts'
            );
        });
    });

    describe('Nested file paths', () => {
        it('should handle nested file paths without case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'no',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'layout-components/translation-manager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should apply case transformation to nested file paths', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'camel',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'layoutComponents/translationManager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should apply case transformation to nested file paths with kebab case', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'kebab',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'layout-components/translation-manager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should apply case transformation to nested file paths with snake case', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'snake',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'layout_components/translation_manager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle nested paths with includePackageInPath', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: 'kebab',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my-package/layout-components/translation-manager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle nested paths with scoped package and case transformation', () => {
            const exports = [
                createMockExportData('@scope/my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'replace',
                    case: 'kebab',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'scope-my-package/layout-components/translation-manager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle nested paths with groupByPackage', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                    {
                        relativeFilePath: 'another/folder/file.ts',
                        tags: [createMockTag('farewell')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    groupByPackage: true,
                    case: 'kebab',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my-package.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my-package.ts',
                {
                    variableName: 'farewell',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle deeply nested paths with multiple case transformations', () => {
            const exports = [
                createMockExportData('@scope/my-package', [
                    {
                        relativeFilePath:
                            'src/components/ui/buttonComponent.ts',
                        tags: [createMockTag('buttonText')],
                    },
                    {
                        relativeFilePath: 'src/utils/helperFunctions.ts',
                        tags: [createMockTag('helperMessage')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'remove-scope',
                    case: 'snake',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my_package/src/components/ui/button_component.ts',
                {
                    variableName: 'buttonText',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my_package/src/utils/helper_functions.ts',
                {
                    variableName: 'helperMessage',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle nested paths with Pascal case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'components/ui/button-component.ts',
                        tags: [createMockTag('buttonText')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'pascal',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'Components/Ui/ButtonComponent.ts',
                {
                    variableName: 'buttonText',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle nested paths with constant case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'components/ui/button-component.ts',
                        tags: [createMockTag('buttonText')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'constant',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'COMPONENTS/UI/BUTTON_COMPONENT.ts',
                {
                    variableName: 'buttonText',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle separate case transformations for directories and files', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: {
                        directories: 'camel',
                        files: 'pascal',
                    },
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'layoutComponents/TranslationManager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle separate case transformations with includePackageInPath', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath:
                            'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: {
                        directories: 'pascal',
                        files: 'snake',
                    },
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'MyPackage/LayoutComponents/translation_manager.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });

        it('should handle mixed case transformations with deeply nested paths', () => {
            const exports = [
                createMockExportData('@scope/my-package', [
                    {
                        relativeFilePath:
                            'src/components/ui/button-component.ts',
                        tags: [createMockTag('buttonText')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'remove-scope',
                    case: {
                        directories: 'snake',
                        files: 'camel',
                    },
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'my_package/src/components/ui/buttonComponent.ts',
                {
                    variableName: 'buttonText',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });
    });

    describe('Edge cases', () => {
        it('should handle tags with null/undefined config', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting', { hello: 'Hello' }, null),
                            createMockTag('farewell', { bye: 'Bye' }, null),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm();

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: null,
                }
            );
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'farewell',
                    translations: { bye: 'Bye' },
                    config: null,
                }
            );
        });

        it('should handle tags with empty namespace', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag(
                                'greeting',
                                { hello: 'Hello' },
                                { namespace: '' }
                            ),
                        ],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*'],
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'common.ts',
                {
                    variableName: 'greeting',
                    translations: { hello: 'Hello' },
                    config: { namespace: '' },
                }
            );
        });

        it('should handle complex package names with special characters', () => {
            const exports = [
                createMockExportData('@my-org/ui-components', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('primary')],
                    },
                ]),
            ];

            const context = createMockContext(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'replace',
                    case: 'camel',
                },
                filePath: {
                    groupByPackage: true,
                    scopedPackageHandling: 'remove-scope',
                    case: 'kebab',
                },
            });

            algorithm(context);

            expect(context.importManager.importTag).toHaveBeenCalledWith(
                'ui-components.ts',
                {
                    variableName: 'myOrgUiComponentsPrimary',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'common' },
                }
            );
        });
    });

    describe('configRemap functionality', () => {
        it('should apply config remapping when provided', () => {
            const mockContext = createMockContext([
                createMockExportData('test-package', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'buttonText',
                                { hello: 'Hello' },
                                { namespace: 'ui', path: 'button.text' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({
                configRemap: (config, context) => {
                    // Override namespace based on package name
                    if (context.packageName === 'test-package') {
                        return { ...config, namespace: 'overridden' };
                    }
                    return config;
                },
            });

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledWith(
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'buttonText',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'overridden', path: 'button.text' },
                })
            );
        });

        it('should remove config when configRemap returns null', () => {
            const mockContext = createMockContext([
                createMockExportData('no-config-package', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'buttonText',
                                { hello: 'Hello' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({
                configRemap: (config, context) => {
                    // Remove config for certain packages
                    if (context.packageName === 'no-config-package') {
                        return null;
                    }
                    return config;
                },
            });

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledWith(
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'buttonText',
                    translations: { hello: 'Hello' },
                    config: null,
                })
            );
        });

        it('should provide correct context to configRemap function', () => {
            const mockContext = createMockContext([
                createMockExportData('context-test', [
                    {
                        relativeFilePath: 'admin/User.ts',
                        tags: [
                            createMockTag(
                                'userName',
                                { name: 'John' },
                                { namespace: 'common' }
                            ),
                        ],
                    },
                ]),
            ]);

            const configRemapSpy = vi.fn((config, context) => config);

            const algorithm = flexibleImportAlgorithm({
                configRemap: configRemapSpy,
            });

            algorithm(mockContext);

            expect(configRemapSpy).toHaveBeenCalledWith(
                { namespace: 'common' },
                {
                    packageName: 'context-test',
                    fileName: 'admin/User.ts',
                    variableName: 'userName',
                    tagIndex: 0,
                }
            );
        });

        it('should import tag without config when configRemap returns null', () => {
            const mockContext = createMockContext([
                createMockExportData('mixed-package', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'buttonWithConfig',
                                { hello: 'Hello' },
                                { namespace: 'ui' }
                            ),
                            createMockTag(
                                'buttonWithoutConfig',
                                { goodbye: 'Goodbye' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({
                configRemap: (config, context) => {
                    // Remove config only for specific variable names
                    if (context.variableName === 'buttonWithoutConfig') {
                        return null;
                    }
                    return config;
                },
            });

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledTimes(
                2
            );

            // First tag should have config
            expect(mockContext.importManager.importTag).toHaveBeenNthCalledWith(
                1,
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'buttonWithConfig',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'ui' },
                })
            );

            // Second tag should have null config
            expect(mockContext.importManager.importTag).toHaveBeenNthCalledWith(
                2,
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'buttonWithoutConfig',
                    translations: { goodbye: 'Goodbye' },
                    config: null,
                })
            );
        });

        it('should use customVariableName when provided', () => {
            const mockContext = createMockContext([
                createMockExportData('test-package', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'originalName',
                                { hello: 'Hello' },
                                { namespace: 'ui' }
                            ),
                            createMockTag(
                                'anotherName',
                                { goodbye: 'Goodbye' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    customVariableName: (context) => {
                        // Generate custom names based on package and file
                        const packagePrefix = context.packageName.replace(
                            '-',
                            ''
                        );
                        const fileBase =
                            context.fileName
                                .split('/')
                                .pop()
                                ?.replace('.ts', '') || 'unknown';
                        return `${packagePrefix}_${fileBase}_${context.tagIndex + 1}`;
                    },
                },
            });

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledTimes(
                2
            );

            // First tag should have custom name
            expect(mockContext.importManager.importTag).toHaveBeenNthCalledWith(
                1,
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'testpackage_Button_1',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'ui' },
                })
            );

            // Second tag should have custom name
            expect(mockContext.importManager.importTag).toHaveBeenNthCalledWith(
                2,
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'testpackage_Button_2',
                    translations: { goodbye: 'Goodbye' },
                    config: { namespace: 'ui' },
                })
            );
        });

        it('should apply transformations to customVariableName result', () => {
            const mockContext = createMockContext([
                createMockExportData('test-package', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'originalName',
                                { hello: 'Hello' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    customVariableName: (context) => {
                        // Return a name that will be transformed
                        return `custom_name_with_underscores`;
                    },
                    case: 'camel', // This should transform the custom name
                    prefixWithPackageName: true, // This should add prefix
                    sanitizeVariableName: true, // This should sanitize
                },
            });

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledWith(
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'testPackageCustomNameWithUnderscores', // camelCase + prefix + sanitized
                    translations: { hello: 'Hello' },
                    config: { namespace: 'ui' },
                })
            );
        });

        it('should fall back to original naming when customVariableName returns null', () => {
            const mockContext = createMockContext([
                createMockExportData('fallback-package', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'originalName',
                                { hello: 'Hello' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    customVariableName: (context) => {
                        // Return null to fall back to original naming
                        return null;
                    },
                },
            });

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledWith(
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'originalName',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'ui' },
                })
            );
        });

        it('should provide correct context to customVariableName function', () => {
            const mockContext = createMockContext([
                createMockExportData('context-test', [
                    {
                        relativeFilePath: 'admin/User.ts',
                        tags: [
                            createMockTag(
                                'userName',
                                { name: 'John' },
                                { namespace: 'common' }
                            ),
                        ],
                    },
                ]),
            ]);

            const customVariableNameSpy = vi.fn(
                (context) => context.originalVariableName
            );

            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    customVariableName: customVariableNameSpy,
                },
            });

            algorithm(mockContext);

            expect(customVariableNameSpy).toHaveBeenCalledWith({
                packageName: 'context-test',
                fileName: 'admin/User.ts',
                originalVariableName: 'userName',
                tagIndex: 0,
                tag: expect.objectContaining({
                    variableName: 'userName',
                    translations: { name: 'John' },
                    config: { namespace: 'common' },
                }),
            });
        });

        it('should handle mixed custom and fallback naming', () => {
            const mockContext = createMockContext([
                createMockExportData('mixed-package', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'customName',
                                { hello: 'Hello' },
                                { namespace: 'ui' }
                            ),
                            createMockTag(
                                'fallbackName',
                                { goodbye: 'Goodbye' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    customVariableName: (context) => {
                        // Use custom naming for specific variable names
                        if (context.originalVariableName === 'customName') {
                            return `custom_${context.tagIndex + 1}`;
                        }
                        // Fall back to original naming for others
                        return null;
                    },
                },
            });

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledTimes(
                2
            );

            // First tag should have custom name
            expect(mockContext.importManager.importTag).toHaveBeenNthCalledWith(
                1,
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'custom_1',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'ui' },
                })
            );

            // Second tag should have original name (fallback)
            expect(mockContext.importManager.importTag).toHaveBeenNthCalledWith(
                2,
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'fallbackName',
                    translations: { goodbye: 'Goodbye' },
                    config: { namespace: 'ui' },
                })
            );
        });

        it('should work without configRemap function', () => {
            const mockContext = createMockContext([
                createMockExportData('no-remap', [
                    {
                        relativeFilePath: 'components/Button.ts',
                        tags: [
                            createMockTag(
                                'buttonText',
                                { hello: 'Hello' },
                                { namespace: 'ui' }
                            ),
                        ],
                    },
                ]),
            ]);

            const algorithm = flexibleImportAlgorithm({});

            algorithm(mockContext);

            expect(mockContext.importManager.importTag).toHaveBeenCalledWith(
                'components/Button.ts',
                expect.objectContaining({
                    variableName: 'buttonText',
                    translations: { hello: 'Hello' },
                    config: { namespace: 'ui' },
                })
            );
        });
    });
});
