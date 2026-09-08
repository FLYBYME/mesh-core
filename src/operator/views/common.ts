import {
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

export function renderLoadingSkeleton(label: string): Described {
    return element('Stack', {
        props: {
            class: 'state-loading operator-loading-skeleton',
            'data-state': 'loading',
            style: {
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                opacity: 0.6,
            },
        },
        children: [
            element('Row', {
                props: {
                    style: {
                        height: '24px',
                        width: '200px',
                        background: 'var(--surface-subtle, #21262d)',
                        borderRadius: '4px',
                    },
                },
                children: [text(`Loading ${label}…`)],
            }),
            element('Stack', {
                props: {
                    style: {
                        height: '100px',
                        background: 'var(--surface, #161b22)',
                        borderRadius: '6px',
                        border: '1px solid var(--edge, #30363d)',
                    },
                },
            }),
        ],
    });
}

export function renderEmptyState(title: string, message: string, cta?: Described): Described {
    return element('Card', {
        props: {
            class: 'state-empty operator-empty-card',
            'data-state': 'empty',
            style: {
                padding: '32px 24px',
                background: 'var(--surface, #161b22)',
                borderRadius: '6px',
                border: '1px solid var(--edge, #30363d)',
                textAlign: 'center',
                margin: '16px',
            },
        },
        children: [
            element('Heading', {
                props: { level: 2, style: { fontSize: '16px', color: 'var(--ink, #e6edf3)', margin: '0 0 8px 0' } },
                children: [text(title)],
            }),
            element('Text', {
                props: { style: { fontSize: '13px', color: 'var(--ink-dim, #8b949e)', margin: '0 0 16px 0' } },
                children: [text(message)],
            }),
            ...(cta ? [cta] : []),
        ],
    });
}

export function renderUnauthenticatedState(): Described {
    return element('Card', {
        props: {
            class: 'state-unauthenticated operator-auth-panel',
            'data-state': 'unauthenticated',
            style: {
                padding: '24px',
                background: 'var(--surface, #161b22)',
                border: '1px solid var(--edge, #30363d)',
                borderRadius: '6px',
                margin: '16px',
                maxWidth: '420px',
            },
        },
        children: [
            element('Heading', {
                props: { level: 3, style: { fontSize: '15px', color: 'var(--ink, #e6edf3)', margin: '0 0 8px 0' } },
                children: [text('Sign in to operate')],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', marginBottom: '16px' } },
                children: [text('A valid session is required to perform operator mutations and view restricted data.')],
            }),
        ],
    });
}

export function renderRefusedControl(
    label: string,
    gateOrReason: string,
): Described {
    return element('Button', {
        props: {
            class: 'state-refused control-refused',
            'data-state': 'refused',
            disabled: true,
            title: `Refused: ${gateOrReason}`,
            style: {
                padding: '4px 10px',
                fontSize: '12px',
                opacity: 0.5,
                cursor: 'not-allowed',
                background: 'var(--surface, #21262d)',
                color: 'var(--ink-dim, #8b949e)',
                border: '1px dashed var(--edge, #30363d)',
                borderRadius: '4px',
            },
        },
        children: [text(`${label} (${gateOrReason})`)],
    });
}

export function renderErrorBanner(
    errorMessage: () => string | null,
    onRetry?: () => Promise<void>,
): Described {
    return when(
        () => errorMessage() !== null,
        () => element('Row', {
            props: {
                class: 'state-error operator-error-banner',
                'data-state': 'error',
                style: {
                    padding: '10px 14px',
                    margin: '8px 16px',
                    borderRadius: '6px',
                    background: 'rgba(248, 81, 73, 0.1)',
                    border: '1px solid var(--danger, #f85149)',
                    color: 'var(--danger, #f85149)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                },
            },
            children: [
                element('Text', {
                    children: [text(() => errorMessage() ?? 'An unexpected error occurred.')],
                }),
                ...(onRetry ? [
                    element('Button', {
                        props: {
                            class: 'operator-retry-btn',
                            style: {
                                padding: '2px 8px',
                                fontSize: '11px',
                                background: 'transparent',
                                border: '1px solid var(--danger, #f85149)',
                                color: 'var(--danger, #f85149)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            },
                        },
                        children: [text('Retry')],
                    }),
                ] : []),
            ],
        }),
    );
}
