function create<I, O>(): I { return null as any; }
export const ui = {
    create: <I, O>() => create<I, O>()
} as const;

const res = ui.create<string, number>();
