import {
    element,
    text,
    type Node as Described,
} from '@flybyme/mesh-web';

export function renderKindBadge(kind: () => string): Described {
    return element('Badge', {
        props: {
            class: 'part-kind-badge',
            style: () => {
                const k = kind();
                const bg = k === 'kernel' ? '#8957e5' : k === 'application' ? '#1f6feb' : '#238636';
                return {
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    backgroundColor: bg,
                    display: 'inline-block',
                };
            },
        },
        children: [text(kind)],
    });
}

export function renderStateBadge(state: () => string): Described {
    return element('Badge', {
        props: {
            class: 'version-state-badge',
            style: () => {
                const s = state();
                const bg = s === 'built' ? '#238636' : s === 'declared' ? '#9e6a03' : '#da3633';
                return {
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: bg,
                    display: 'inline-block',
                };
            },
        },
        children: [text(state)],
    });
}
