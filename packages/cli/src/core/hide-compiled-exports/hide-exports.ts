import { readFileSync } from 'fs';
import { Project, VariableDeclarationList, VariableStatement } from 'ts-morph';

export interface HideExportsResult {
    hiddenCount: number;
    hiddenNames: string[];
    modifiedContent: string;
    originalContent: string;
}

interface HideWorkItem {
    statement: VariableStatement;
    names: string[];
}

export function $LT_HideExportsInDtsFile(
    dtsFilePath: string,
    variableNames: Set<string>
): HideExportsResult {
    const originalContent = readFileSync(dtsFilePath, 'utf-8');

    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true,
    });

    const sourceFile = project.addSourceFileAtPath(dtsFilePath);

    const work: HideWorkItem[] = [];

    for (const declaration of sourceFile.getVariableDeclarations()) {
        const name = declaration.getName();

        if (variableNames.has(name)) {
            const parent = declaration.getParent();
            if (parent && parent.getKindName() === 'VariableDeclarationList') {
                const varList = parent as VariableDeclarationList;
                const grandParent = varList.getParent();
                if (
                    grandParent &&
                    grandParent.getKindName() === 'VariableStatement'
                ) {
                    const varStatement = grandParent as VariableStatement;

                    // Both "export const" and "export declare const"
                    if (varStatement.hasExportKeyword()) {
                        const existing = work.find(
                            (item) => item.statement === varStatement
                        );
                        if (existing) {
                            existing.names.push(name);
                        } else {
                            work.push({
                                statement: varStatement,
                                names: [name],
                            });
                        }
                    }
                }
            }
        }
    }

    if (work.length === 0) {
        return {
            hiddenCount: 0,
            hiddenNames: [],
            modifiedContent: originalContent,
            originalContent,
        };
    }

    const hiddenNames: string[] = [];

    for (const { statement } of work) {
        statement.toggleModifier('export', false);
    }

    // Insert aliases last-to-first so earlier child indices stay valid.
    for (let i = work.length - 1; i >= 0; i--) {
        const { statement, names } = work[i];
        const aliases = names
            .filter((name) => !sourceFile.getTypeAlias(name))
            .map((name) => ({
                name,
                type: `typeof ${name}`,
                isExported: true,
            }));

        hiddenNames.unshift(...names);

        if (aliases.length > 0) {
            sourceFile.insertTypeAliases(
                statement.getChildIndex() + 1,
                aliases
            );
        }
    }

    return {
        hiddenCount: hiddenNames.length,
        hiddenNames,
        modifiedContent: sourceFile.getFullText(),
        originalContent,
    };
}
