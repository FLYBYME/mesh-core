import {
    AUTH,
    consumes,
    needs,
    PAGE_CHROME,
    type AuthApi,
    type PageChrome,
} from '@flybyme/mesh-web';

export const NEEDS = needs('chrome', 'log', 'commands', 'state');
export const CONSUMES = consumes(AUTH);
export const EMPTY_CONSUMES = consumes();

export { PAGE_CHROME, type PageChrome, AUTH, type AuthApi };
