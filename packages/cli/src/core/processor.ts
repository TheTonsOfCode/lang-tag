import JSON5 from 'json5';

import { buildTagNameAlternation } from '@/core/tag-name';
import { LangTagCLIConfig, LangTagCLIProcessedTag } from '@/type';

export interface $LT_TagReplaceData {
    tag: LangTagCLIProcessedTag;

    translations?: string | any;
    config?: string | any;
}

export class $LT_TagProcessor {
    constructor(
        private config: Pick<
            LangTagCLIConfig,
            'tagName' | 'translationArgPosition'
        >
    ) {}

    public extractTags(fileContent: string): LangTagCLIProcessedTag[] {
        const tagNameAlternation = buildTagNameAlternation(this.config.tagName);
        const optionalVariableAssignment = `(?:\\s*(\\w+)\\s*=\\s*)?`;

        // Find all potential lang tag matches
        const matches: LangTagCLIProcessedTag[] = [];
        let currentIndex = 0;

        // Build position maps for comments and strings to skip them
        const skipRanges = this.buildSkipRanges(fileContent);

        // Create a regex to find the start of a lang tag (with or without generic type)
        // First match the tag name (any configured alternative), then check for generic type
        const tagNamePattern = new RegExp(
            `${optionalVariableAssignment}(${tagNameAlternation})`,
            'g'
        );

        while (true) {
            // Find the next potential tag name match
            tagNamePattern.lastIndex = currentIndex;
            const tagNameMatch = tagNamePattern.exec(fileContent);

            if (!tagNameMatch) break;

            const tagNameStartIndex = tagNameMatch.index;
            const variableName = tagNameMatch[1] || undefined;
            const matchedTagName = tagNameMatch[2];

            // Check if this match is inside a comment or string literal
            if (this.isInSkipRange(tagNameStartIndex, skipRanges)) {
                currentIndex = tagNameStartIndex + 1;
                continue;
            }

            // Find where the tag name ends
            let i = tagNameStartIndex + tagNameMatch[0].length;

            // Check for generic type: <...>
            let genericType: string | undefined = undefined;
            let matchStartIndex = tagNameStartIndex;

            // Skip whitespace
            while (i < fileContent.length && /\s/.test(fileContent[i])) {
                i++;
            }

            if (i < fileContent.length && fileContent[i] === '<') {
                // Found potential generic type start
                const genericStart = i;
                let angleCount = 1;
                i++; // Skip '<'

                // Parse nested generic type (e.g., Array<string>, { a: { b: string } })
                while (i < fileContent.length && angleCount > 0) {
                    const char = fileContent[i];
                    if (char === '<') angleCount++;
                    else if (char === '>') angleCount--;
                    else if (
                        (char === '"' || char === "'" || char === '`') &&
                        !this.isInSkipRange(i, skipRanges)
                    ) {
                        // Skip string literals inside generic type
                        const stringStart = i;
                        i++;
                        while (i < fileContent.length) {
                            if (fileContent[i] === '\\') {
                                i += 2; // Skip escaped character
                                continue;
                            }
                            if (fileContent[i] === char) {
                                i++;
                                break;
                            }
                            i++;
                        }
                        continue;
                    }
                    i++;
                }

                if (angleCount === 0) {
                    // Successfully parsed generic type
                    genericType = fileContent
                        .substring(genericStart + 1, i - 1)
                        .trim();
                    matchStartIndex = tagNameStartIndex;
                } else {
                    // Malformed generic type, skip this match
                    currentIndex = tagNameStartIndex + 1;
                    continue;
                }
            } else {
                // No generic type, tag name is followed directly by '('
                matchStartIndex = tagNameStartIndex;
            }

            // Now look for opening parenthesis and brace
            // Skip whitespace
            while (i < fileContent.length && /\s/.test(fileContent[i])) {
                i++;
            }

            // Must have opening parenthesis followed by opening brace
            if (
                i >= fileContent.length ||
                fileContent[i] !== '(' ||
                i + 1 >= fileContent.length
            ) {
                currentIndex = tagNameStartIndex + 1;
                continue;
            }

            i++; // Skip '('

            // Skip whitespace after '('
            while (i < fileContent.length && /\s/.test(fileContent[i])) {
                i++;
            }

            // Must have opening brace
            if (i >= fileContent.length || fileContent[i] !== '{') {
                currentIndex = tagNameStartIndex + 1;
                continue;
            }

            // Found valid tag start - i is now at the opening brace '{'
            const braceStartIndex = i;

            // Check if this match is inside a comment or string literal
            if (this.isInSkipRange(matchStartIndex, skipRanges)) {
                currentIndex = matchStartIndex + 1;
                continue;
            }

            // Find the matching closing brace for the first object
            let braceCount = 1;
            i++; // Move past the opening '{'

            while (i < fileContent.length && braceCount > 0) {
                if (fileContent[i] === '{') braceCount++;
                if (fileContent[i] === '}') braceCount--;
                i++;
            }

            if (braceCount !== 0) {
                // No matching closing brace found, skip this match
                currentIndex = matchStartIndex + 1;
                continue;
            }

            // Check if there's a second parameter
            let parameter1Text = fileContent.substring(braceStartIndex, i);
            let parameter2Text: string | undefined;
            let satisfiesType: string | undefined;
            let asConst = false;

            // After first object, allow `as const` and `satisfies Type` on translations.
            // Skip whitespace
            while (
                i < fileContent.length &&
                (fileContent[i] === ' ' ||
                    fileContent[i] === '\n' ||
                    fileContent[i] === '\t')
            ) {
                i++;
            }

            if (this.config.translationArgPosition === 1) {
                const asConstEnd = this.parseAsConst(fileContent, i);
                if (asConstEnd !== undefined) {
                    asConst = true;
                    i = asConstEnd;
                    while (
                        i < fileContent.length &&
                        /\s/.test(fileContent[i])
                    ) {
                        i++;
                    }
                }
            }

            if (
                this.config.translationArgPosition === 1 &&
                this.startsWithSatisfies(fileContent, i)
            ) {
                const satisfies = this.parseSatisfiesType(fileContent, i);
                if (!satisfies) {
                    currentIndex = matchStartIndex + 1;
                    continue;
                }
                satisfiesType = satisfies.type;
                i = satisfies.endIndex;

                while (i < fileContent.length && /\s/.test(fileContent[i])) {
                    i++;
                }
            }

            if (i >= fileContent.length) {
                // Reached EOF without finding a closing paren
                currentIndex = matchStartIndex + 1;
                continue;
            }

            if (fileContent[i] === ',') {
                // Consume comma and any whitespace after it
                i++;
                while (
                    i < fileContent.length &&
                    (fileContent[i] === ' ' ||
                        fileContent[i] === '\n' ||
                        fileContent[i] === '\t')
                ) {
                    i++;
                }

                // Check if this is a trailing comma after first parameter (single parameter case)
                if (i >= fileContent.length || fileContent[i] === ')') {
                    // This is a trailing comma after the first parameter only - valid case
                    // We'll handle this in the closing parenthesis check below
                } else if (fileContent[i] === '{') {
                    // This is the start of a second parameter
                    // Parse second object
                    braceCount = 1;
                    const secondParamStart = i;
                    i++;

                    while (i < fileContent.length && braceCount > 0) {
                        if (fileContent[i] === '{') braceCount++;
                        if (fileContent[i] === '}') braceCount--;
                        i++;
                    }

                    if (braceCount !== 0) {
                        // Unbalanced braces - skip this match
                        currentIndex = matchStartIndex + 1;
                        continue;
                    }

                    parameter2Text = fileContent.substring(secondParamStart, i);

                    // After second object, allow `as const` and `satisfies Type`
                    // when translations are configured as the second argument.
                    while (
                        i < fileContent.length &&
                        (fileContent[i] === ' ' ||
                            fileContent[i] === '\n' ||
                            fileContent[i] === '\t')
                    ) {
                        i++;
                    }

                    if (this.config.translationArgPosition === 2) {
                        const asConstEnd = this.parseAsConst(fileContent, i);
                        if (asConstEnd !== undefined) {
                            asConst = true;
                            i = asConstEnd;
                            while (
                                i < fileContent.length &&
                                /\s/.test(fileContent[i])
                            ) {
                                i++;
                            }
                        }
                    }

                    if (
                        this.config.translationArgPosition === 2 &&
                        this.startsWithSatisfies(fileContent, i)
                    ) {
                        const satisfies = this.parseSatisfiesType(
                            fileContent,
                            i
                        );
                        if (!satisfies) {
                            currentIndex = matchStartIndex + 1;
                            continue;
                        }
                        satisfiesType = satisfies.type;
                        i = satisfies.endIndex;

                        while (
                            i < fileContent.length &&
                            /\s/.test(fileContent[i])
                        ) {
                            i++;
                        }
                    }

                    // Handle trailing comma after second parameter (Prettier formatting)
                    if (i < fileContent.length && fileContent[i] === ',') {
                        i++; // consume the comma
                        // Skip whitespace after comma
                        while (
                            i < fileContent.length &&
                            (fileContent[i] === ' ' ||
                                fileContent[i] === '\n' ||
                                fileContent[i] === '\t')
                        ) {
                            i++;
                        }
                    }
                } else {
                    // Malformed: comma not followed by an object or closing paren
                    currentIndex = matchStartIndex + 1;
                    continue;
                }
            } else if (fileContent[i] !== ')') {
                // No comma and not a closing parenthesis -> malformed (e.g., missing comma before second object)
                currentIndex = matchStartIndex + 1;
                continue;
            }

            // Require closing parenthesis for the tag call
            if (i >= fileContent.length || fileContent[i] !== ')') {
                // Scan ahead minimally to see if a ')' appears before a line break with code; conservative: require immediate ')'
                // For simplicity, if not immediate ')', treat as malformed
                currentIndex = matchStartIndex + 1;
                continue;
            }

            // Include the closing parenthesis
            i++;

            const fullMatch = fileContent.substring(matchStartIndex, i);
            // fullMatch should include: variable assignment (if any) + tagName + genericType (if any) + ( + parameters + )

            const { line, column } = getLineAndColumn(
                fileContent,
                matchStartIndex
            );

            let validity: any = 'ok';

            let parameter1 = undefined;
            let parameter2 = undefined;

            // Check for template string interpolation (${...}) - not allowed
            if (
                this.hasTemplateInterpolation(parameter1Text) ||
                (parameter2Text &&
                    this.hasTemplateInterpolation(parameter2Text))
            ) {
                // Skip this match - template interpolation not allowed
                currentIndex = matchStartIndex + 1;
                continue;
            }

            try {
                parameter1 = JSON5.parse(
                    this.stripNestedTypeModifiers(parameter1Text)
                );
                if (parameter2Text) {
                    try {
                        parameter2 = JSON5.parse(
                            this.stripNestedTypeModifiers(parameter2Text)
                        );
                    } catch (error) {
                        // Try to parse with escaped newlines in strings
                        try {
                            parameter2 = JSON5.parse(
                                this.escapeNewlinesInStrings(
                                    this.stripNestedTypeModifiers(
                                        parameter2Text
                                    )
                                )
                            );
                        } catch {
                            validity = 'invalid-param-2';
                        }
                    }
                }
            } catch (error) {
                // Try to parse with escaped newlines in strings (for multiline string support)
                try {
                    parameter1 = JSON5.parse(
                        this.escapeNewlinesInStrings(
                            this.stripNestedTypeModifiers(parameter1Text)
                        )
                    );
                } catch {
                    validity = 'invalid-param-1';
                }
            }

            let parameterTranslations =
                this.config.translationArgPosition === 1
                    ? parameter1
                    : parameter2;
            let parameterConfig =
                this.config.translationArgPosition === 1
                    ? parameter2
                    : parameter1;

            if (validity === 'ok') {
                if (!parameterTranslations) validity = 'translations-not-found';
            }

            matches.push({
                fullMatch,
                tagName: matchedTagName,
                variableName,
                genericType,
                satisfiesType,
                asConst,
                parameter1Text,
                parameter2Text,
                parameterTranslations,
                parameterConfig,
                index: matchStartIndex,
                line,
                column,
                validity,
            });

            currentIndex = i;
        }

        return matches;
    }

    public replaceTags(
        fileContent: string,
        replacements: $LT_TagReplaceData[]
    ): string {
        const replaceMap: Map<LangTagCLIProcessedTag, string> = new Map();

        replacements.forEach((R) => {
            if (!R.translations && !R.config && R.config !== null) {
                throw new Error('Replacement data is required!');
            }

            const tag = R.tag;

            let newTranslationsString = R.translations;
            // We do not use "tag.parameterTranslations" in order to preserve translations object comments, etc.
            if (!newTranslationsString)
                newTranslationsString =
                    this.config.translationArgPosition === 1
                        ? tag.parameter1Text
                        : tag.parameter2Text || '{}';
            else if (typeof newTranslationsString !== 'string')
                newTranslationsString = JSON5.stringify(newTranslationsString);
            if (!newTranslationsString)
                throw new Error('Tag must have translations provided!');
            try {
                JSON5.parse(
                    this.stripNestedTypeModifiers(newTranslationsString)
                );
            } catch (error) {
                throw new Error(
                    `Tag translations are invalid object! Translations: ${newTranslationsString}`
                );
            }

            let newConfigString = R.config;
            if (!newConfigString && newConfigString !== null)
                newConfigString = tag.parameterConfig;
            if (newConfigString) {
                try {
                    if (typeof newConfigString === 'string')
                        JSON5.parse(
                            this.stripNestedTypeModifiers(newConfigString)
                        );
                    else newConfigString = JSON5.stringify(newConfigString);
                } catch (error) {
                    throw new Error(
                        `Tag config is invalid object! Config: ${newConfigString}`
                    );
                }
            }

            // IMPORTANT: If config is NULL and translations are on position 2, we need to set config to "{}"
            // to ensure the function call has the correct argument structure: t({}, translations)
            if (
                newConfigString === null &&
                this.config.translationArgPosition === 2
            ) {
                newConfigString = '{}';
            }

            // TODO:   HERE:  Cała logika formatowania wcięć itd w przyszłości

            const arg1 =
                this.config.translationArgPosition === 1
                    ? newTranslationsString
                    : newConfigString;
            const arg2 =
                this.config.translationArgPosition === 1
                    ? newConfigString
                    : newTranslationsString;

            const translationTypeSuffix =
                (tag.asConst ? ' as const' : '') +
                (tag.satisfiesType ? ` satisfies ${tag.satisfiesType}` : '');
            const arg1TypeSuffix =
                this.config.translationArgPosition === 1
                    ? translationTypeSuffix
                    : '';
            const arg2TypeSuffix =
                this.config.translationArgPosition === 2
                    ? translationTypeSuffix
                    : '';

            // Preserve generic type if it was present in the original tag
            const genericTypePart = tag.genericType
                ? `<${tag.genericType}>`
                : '';

            // Preserve the original matched tag name (important when config.tagName is a list)
            let tagFunction = `${tag.tagName}${genericTypePart}(${arg1}${arg1TypeSuffix}`;
            if (arg2) tagFunction += `, ${arg2}${arg2TypeSuffix}`;
            tagFunction += ')';

            if (tag.variableName)
                replaceMap.set(tag, ` ${tag.variableName} = ${tagFunction}`);
            else replaceMap.set(tag, tagFunction);
        });

        let offset = 0;

        replaceMap.forEach((replacement, match) => {
            const startIdx = match.index + offset;
            const endIdx = startIdx + match.fullMatch.length;

            fileContent =
                fileContent.slice(0, startIdx) +
                replacement +
                fileContent.slice(endIdx);

            offset += replacement.length - match.fullMatch.length;
        });

        return fileContent;
    }

    private parseAsConst(text: string, startIndex: number): number | undefined {
        const match = /^as\s+const\b/.exec(text.substring(startIndex));
        return match ? startIndex + match[0].length : undefined;
    }

    private startsWithSatisfies(text: string, index: number): boolean {
        return (
            text.startsWith('satisfies', index) &&
            (index === 0 || !/[A-Za-z0-9_$]/.test(text[index - 1] || '')) &&
            !/[A-Za-z0-9_$]/.test(text[index + 'satisfies'.length] || '')
        );
    }

    private parseSatisfiesType(
        text: string,
        startIndex: number
    ): { type: string; endIndex: number } | undefined {
        let i = startIndex + 'satisfies'.length;
        if (i >= text.length || !/\s/.test(text[i])) return undefined;

        while (i < text.length && /\s/.test(text[i])) i++;
        const typeStart = i;
        let angleDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let parenDepth = 0;

        while (i < text.length) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === "'" || char === '"' || char === '`') {
                const quote = char;
                i++;
                while (i < text.length) {
                    if (text[i] === '\\') {
                        i += 2;
                    } else if (text[i] === quote) {
                        i++;
                        break;
                    } else {
                        i++;
                    }
                }
                continue;
            }

            if (char === '/' && nextChar === '/') {
                i += 2;
                while (i < text.length && text[i] !== '\n') i++;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                i += 2;
                while (
                    i < text.length - 1 &&
                    !(text[i] === '*' && text[i + 1] === '/')
                ) {
                    i++;
                }
                if (i >= text.length - 1) return undefined;
                i += 2;
                continue;
            }

            const atTopLevel =
                angleDepth === 0 &&
                braceDepth === 0 &&
                bracketDepth === 0 &&
                parenDepth === 0;
            if (
                atTopLevel &&
                (char === ',' || char === ')' || char === '}' || char === ']')
            ) {
                const type = text.substring(typeStart, i).trim();
                return type ? { type, endIndex: i } : undefined;
            }

            if (char === '<') angleDepth++;
            else if (char === '>' && angleDepth > 0) angleDepth--;
            else if (char === '{') braceDepth++;
            else if (char === '}' && braceDepth > 0) braceDepth--;
            else if (char === '[') bracketDepth++;
            else if (char === ']' && bracketDepth > 0) bracketDepth--;
            else if (char === '(') parenDepth++;
            else if (char === ')' && parenDepth > 0) parenDepth--;

            i++;
        }

        return undefined;
    }

    private stripNestedTypeModifiers(text: string): string {
        let result = '';
        let i = 0;

        while (i < text.length) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === "'" || char === '"' || char === '`') {
                const quote = char;
                const start = i;
                i++;
                while (i < text.length) {
                    if (text[i] === '\\') {
                        i += 2;
                    } else if (text[i] === quote) {
                        i++;
                        break;
                    } else {
                        i++;
                    }
                }
                result += text.substring(start, i);
                continue;
            }

            if (char === '/' && nextChar === '/') {
                const start = i;
                i += 2;
                while (i < text.length && text[i] !== '\n') i++;
                result += text.substring(start, i);
                continue;
            }
            if (char === '/' && nextChar === '*') {
                const start = i;
                i += 2;
                while (
                    i < text.length - 1 &&
                    !(text[i] === '*' && text[i + 1] === '/')
                ) {
                    i++;
                }
                i = Math.min(i + 2, text.length);
                result += text.substring(start, i);
                continue;
            }

            const asConstEnd = this.parseAsConst(text, i);
            if (
                asConstEnd !== undefined &&
                (i === 0 || !/[A-Za-z0-9_$]/.test(text[i - 1]))
            ) {
                i = asConstEnd;
                continue;
            }

            if (this.startsWithSatisfies(text, i)) {
                const satisfies = this.parseSatisfiesType(text, i);
                if (satisfies) {
                    i = satisfies.endIndex;
                    continue;
                }
            }

            result += char;
            i++;
        }

        return result;
    }

    private buildSkipRanges(fileContent: string): Array<[number, number]> {
        const ranges: Array<[number, number]> = [];
        let i = 0;

        while (i < fileContent.length) {
            const char = fileContent[i];
            const nextChar = fileContent[i + 1];

            // Single-line comment
            if (char === '/' && nextChar === '/') {
                const start = i;
                i += 2;
                while (i < fileContent.length && fileContent[i] !== '\n') {
                    i++;
                }
                ranges.push([start, i]);
                continue;
            }

            // Block comment
            if (char === '/' && nextChar === '*') {
                const start = i;
                i += 2;
                while (i < fileContent.length - 1) {
                    if (fileContent[i] === '*' && fileContent[i + 1] === '/') {
                        i += 2;
                        break;
                    }
                    i++;
                }
                ranges.push([start, i]);
                continue;
            }

            // String literals (single quote)
            if (char === "'") {
                const start = i;
                i++;
                while (i < fileContent.length) {
                    if (fileContent[i] === '\\') {
                        i += 2; // Skip escaped character
                        continue;
                    }
                    if (fileContent[i] === "'") {
                        i++;
                        break;
                    }
                    i++;
                }
                ranges.push([start, i]);
                continue;
            }

            // String literals (double quote)
            if (char === '"') {
                const start = i;
                i++;
                while (i < fileContent.length) {
                    if (fileContent[i] === '\\') {
                        i += 2; // Skip escaped character
                        continue;
                    }
                    if (fileContent[i] === '"') {
                        i++;
                        break;
                    }
                    i++;
                }
                ranges.push([start, i]);
                continue;
            }

            // Template literals (backtick)
            if (char === '`') {
                const start = i;
                i++;
                while (i < fileContent.length) {
                    if (fileContent[i] === '\\') {
                        i += 2; // Skip escaped character
                        continue;
                    }
                    if (fileContent[i] === '`') {
                        i++;
                        break;
                    }
                    i++;
                }
                ranges.push([start, i]);
                continue;
            }

            i++;
        }

        return ranges;
    }

    private isInSkipRange(
        position: number,
        skipRanges: Array<[number, number]>
    ): boolean {
        for (const [start, end] of skipRanges) {
            if (position >= start && position < end) {
                return true;
            }
        }
        return false;
    }

    private hasTemplateInterpolation(text: string): boolean {
        // Check if the text contains template string interpolation ${...}
        // We need to be careful to only check inside backtick strings
        let i = 0;
        while (i < text.length) {
            if (text[i] === '`') {
                // Inside template literal
                i++;
                while (i < text.length) {
                    if (text[i] === '\\') {
                        i += 2; // Skip escaped character
                        continue;
                    }
                    if (text[i] === '$' && text[i + 1] === '{') {
                        return true; // Found interpolation
                    }
                    if (text[i] === '`') {
                        i++;
                        break;
                    }
                    i++;
                }
                continue;
            }
            i++;
        }
        return false;
    }

    private escapeNewlinesInStrings(text: string): string {
        // Helper method to escape literal newlines in strings for JSON5 parsing
        // This allows parsing of multiline strings that have literal newlines
        let result = '';
        let i = 0;

        while (i < text.length) {
            const char = text[i];

            // Handle double-quoted strings
            if (char === '"') {
                result += char;
                i++;
                while (i < text.length) {
                    if (text[i] === '\\') {
                        // Already escaped character, keep as-is
                        result += text[i] + text[i + 1];
                        i += 2;
                        continue;
                    }
                    if (text[i] === '\n') {
                        // Escape the literal newline
                        result += '\\n';
                        i++;
                        continue;
                    }
                    if (text[i] === '"') {
                        result += text[i];
                        i++;
                        break;
                    }
                    result += text[i];
                    i++;
                }
                continue;
            }

            // Handle single-quoted strings
            if (char === "'") {
                result += char;
                i++;
                while (i < text.length) {
                    if (text[i] === '\\') {
                        // Already escaped character, keep as-is
                        result += text[i] + text[i + 1];
                        i += 2;
                        continue;
                    }
                    if (text[i] === '\n') {
                        // Escape the literal newline
                        result += '\\n';
                        i++;
                        continue;
                    }
                    if (text[i] === "'") {
                        result += text[i];
                        i++;
                        break;
                    }
                    result += text[i];
                    i++;
                }
                continue;
            }

            result += char;
            i++;
        }

        return result;
    }
}

function getLineAndColumn(
    text: string,
    matchIndex: number
): { line: number; column: number } {
    const lines = text.slice(0, matchIndex).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { line, column };
}
