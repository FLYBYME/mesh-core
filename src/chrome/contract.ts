import type { BoundCommand } from '@flybyme/mesh-web';

export const CONSOLE_CHROME = 'console.chrome';

export interface NavItem {
    readonly id: string;
    readonly label: string;
    readonly command: BoundCommand<unknown, unknown>;
}

export interface ConsoleChromeApi {
    readonly addNav: (item: NavItem) => void;
}
