import { readFileSync } from 'fs';
import { Node, Project, SyntaxKind, TypeQueryNode } from 'ts-morph';

export interface RewriteConsumersResult {
    modified: boolean;
    rewrittenImportCount: number;
    rewrittenTypeofCount: number;
    modifiedContent: string;
    originalContent: string;
}

/**
 * After a tag value export is hidden, sibling `.d.ts` files still
 * `import { Name }` and write `typeof Name.TranslationsInput`.
 * `typeof` needs a value; `export type Name = typeof Name` only
 * ships a type. Convert those imports to type-only and rewrite
 * `typeof` to type position.
 */
export function $LT_RewriteHiddenExportConsumersInDtsFile(
    dtsFilePath: string,
    hiddenNames: Set<string>
): RewriteConsumersResult {
    const originalContent = readFileSync(dtsFilePath, 'utf-8');

    if (hiddenNames.size === 0) {
        return {
            modified: false,
            rewrittenImportCount: 0,
            rewrittenTypeofCount: 0,
            modifiedContent: originalContent,
            originalContent,
        };
    }

    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true,
    });

    const sourceFile = project.addSourceFileAtPath(dtsFilePath);
    const localAliases = new Set<string>();
    let rewrittenImportCount = 0;

    for (const importDecl of sourceFile.getImportDeclarations()) {
        const namedImports = importDecl.getNamedImports();
        if (namedImports.length === 0) {
            continue;
        }

        const hiddenSpecs = namedImports.filter((spec) =>
            hiddenNames.has(spec.getName())
        );
        if (hiddenSpecs.length === 0) {
            continue;
        }

        for (const spec of hiddenSpecs) {
            localAliases.add(spec.getAliasNode()?.getText() ?? spec.getName());
        }

        const hasDefault = importDecl.getDefaultImport() != null;
        const hasNamespace = importDecl.getNamespaceImport() != null;
        const allNamedHidden = hiddenSpecs.length === namedImports.length;

        if (importDecl.isTypeOnly()) {
            continue;
        }

        if (allNamedHidden && !hasDefault && !hasNamespace) {
            importDecl.setIsTypeOnly(true);
            rewrittenImportCount += hiddenSpecs.length;
        } else {
            for (const spec of hiddenSpecs) {
                if (!spec.isTypeOnly()) {
                    spec.setIsTypeOnly(true);
                    rewrittenImportCount++;
                }
            }
        }
    }

    for (const exportDecl of sourceFile.getExportDeclarations()) {
        const namedExports = exportDecl.getNamedExports();
        if (namedExports.length === 0) {
            continue;
        }

        const hiddenSpecs = namedExports.filter((spec) => {
            const exportedName = spec.getName();
            return (
                hiddenNames.has(exportedName) || localAliases.has(exportedName)
            );
        });
        if (hiddenSpecs.length === 0) {
            continue;
        }

        if (exportDecl.isTypeOnly()) {
            continue;
        }

        const allNamedHidden = hiddenSpecs.length === namedExports.length;
        if (allNamedHidden) {
            exportDecl.setIsTypeOnly(true);
            rewrittenImportCount += hiddenSpecs.length;
        } else {
            for (const spec of hiddenSpecs) {
                if (!spec.isTypeOnly()) {
                    spec.setIsTypeOnly(true);
                    rewrittenImportCount++;
                }
            }
        }
    }

    let rewrittenTypeofCount = 0;
    const typeQueries = sourceFile.getDescendantsOfKind(SyntaxKind.TypeQuery);

    for (const typeQuery of typeQueries.reverse()) {
        if (rewriteTypeQuery(typeQuery, localAliases)) {
            rewrittenTypeofCount++;
        }
    }

    const modified = rewrittenImportCount > 0 || rewrittenTypeofCount > 0;

    return {
        modified,
        rewrittenImportCount,
        rewrittenTypeofCount,
        modifiedContent: modified ? sourceFile.getFullText() : originalContent,
        originalContent,
    };
}

function rewriteTypeQuery(
    typeQuery: TypeQueryNode,
    localAliases: Set<string>
): boolean {
    const parts = entityNameParts(typeQuery.getExprName());
    if (!parts || !localAliases.has(parts[0])) {
        return false;
    }

    const parent = typeQuery.getParent();
    if (
        parts.length === 1 &&
        Node.isTypeAliasDeclaration(parent) &&
        parent.getName() === parts[0]
    ) {
        return false;
    }

    const [root, ...rest] = parts;
    const replacement = rest.reduce((acc, part) => `${acc}['${part}']`, root);
    typeQuery.replaceWithText(replacement);
    return true;
}

function entityNameParts(expr: Node): string[] | null {
    if (Node.isIdentifier(expr)) {
        return [expr.getText()];
    }
    if (Node.isQualifiedName(expr)) {
        const left = entityNameParts(expr.getLeft());
        if (!left) {
            return null;
        }
        return [...left, expr.getRight().getText()];
    }
    return null;
}
