/**
 * Normalizes config `tagName` to a non-empty list of tag names.
 * When an array is provided, the first entry is the primary name
 * (used for init/import); the rest are alternative names accepted while scanning.
 */
export function normalizeTagNames(
    tagName: string | string[] | undefined
): string[] {
    if (tagName == null) return [];
    if (Array.isArray(tagName)) {
        return tagName.filter((name): name is string => Boolean(name));
    }
    return tagName ? [tagName] : [];
}

/** Primary tag name (first entry), used when a single name is required. */
export function getPrimaryTagName(
    tagName: string | string[] | undefined,
    fallback = 'lang'
): string {
    return normalizeTagNames(tagName)[0] ?? fallback;
}

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a regex alternative group for configured tag names.
 * Longer names are listed first so they win over shorter prefixes.
 */
export function buildTagNameAlternation(tagName: string | string[]): string {
    const names = normalizeTagNames(tagName);
    if (names.length === 0) {
        throw new Error('At least one tagName is required');
    }

    const uniqueSorted = [...new Set(names)].sort(
        (a, b) => b.length - a.length || a.localeCompare(b)
    );

    return uniqueSorted.map(escapeRegExp).join('|');
}

export function applyLibraryTagPrefix(tagName: string): string {
    return tagName.startsWith('_') ? tagName : `_${tagName}`;
}

export function applyLibraryTagPrefixToConfig(
    tagName: string | string[]
): string | string[] {
    if (Array.isArray(tagName)) {
        return tagName.map(applyLibraryTagPrefix);
    }
    return applyLibraryTagPrefix(tagName);
}

export function isReservedTagName(tagName: string): boolean {
    const normalized = tagName.toLowerCase().replace(/[-_\s]/g, '');
    return normalized === 'langtag' || normalized === 'lang-tag';
}
