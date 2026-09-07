import type { CdnComposeInputPart } from '../generated/api.js';

export function parsePartsInput(raw: string): readonly CdnComposeInputPart[] {
    const lines = raw.split('\n');
    const result: CdnComposeInputPart[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) continue;
        const colon = trimmed.indexOf(':');
        if (colon > 0) {
            const id = trimmed.slice(0, colon).trim();
            const version = trimmed.slice(colon + 1).trim();
            if (id !== '' && version !== '') {
                const kind: 'application' | 'extension' = (id === 'chrome' || id === 'theme' || id === 'auth')
                    ? 'extension'
                    : 'application';
                result.push({ id, version, kind });
            }
        }
    }
    return result;
}
