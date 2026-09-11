/**
 * **U7's proof, and it has to be the case that was actually failing.**
 *
 * The first version of this file declared its own input as
 * `interface ImportRepoInput extends Record<string, Json | undefined>` and passed that. That case
 * was never broken: an input carrying an index signature is exactly the workaround
 * `mesh-operator`'s `SeedInput` already uses to get through the door, and a test built on the
 * workaround cannot see the door.
 *
 * What fails is the ordinary case: a **generated** input type. `mesh-serve client` emits
 *
 *     export interface IdentityRegisterInput {
 *         readonly email: string;
 *         readonly password: string;
 *         readonly displayName: string;
 *     }
 *
 * and an `interface` in TypeScript gets no implicit index signature, so it does not satisfy
 * `Record<string, Json | undefined>`. That is the whole of U7 as a user meets it, and it is why
 * `mesh-operator` types its register command `BoundCommand<any, any>` — the only other way through.
 *
 * So the shapes below are copied from a real generator output rather than written to fit. If this
 * file compiles, a screen can pass the command the generator gave it. That is the claim.
 *
 * **There is no `as any` in here.** The repository bans it, and a proof written with the banned
 * construct proves that the construct works.
 */

import { describe, it } from 'vitest';

import { schema, type BoundCommand, type Registrar } from '@flybyme/mesh-web';

import { ui } from '../src/ui/index.js';

// --------------------------------------------------------------------------- a registrar

/**
 * What a `ViewContext` hands a composite: the right to register a handler, as a value.
 *
 * Written out rather than faked, because the composites take it as a prop and a fake one would
 * be the cast this file exists to avoid. The id is opaque by design, so a counter is a real one.
 */
let handlers = 0;
const on: Registrar = () => ({ kind: 'handler', id: `generics-test-${(handlers += 1)}` });

// --------------------------------------------------------------------------- generated shapes

/** Copied verbatim from `mesh-operator/src/console/generated/api.ts`. */
interface IdentityRegisterInput {
    readonly email: string;
    readonly password: string;
    readonly displayName: string;
}

interface IdentityRegisterOutput {
    readonly userId: string;
}

/** Also generated: a command whose input is two required strings and nothing else. */
interface CdnDeployInput {
    readonly host: string;
    readonly release: string;
}

// --------------------------------------------------------------------------- the commands

/**
 * A real `BoundCommand`, built the way an application builds one.
 *
 * `input` and `output` are the contract's schemas. They are not `as any` here: a command that a
 * screen can render is a command whose schemas are present, and faking them would be faking the
 * half `ActionCard` reads to generate its fields.
 */
const registerUser: BoundCommand<IdentityRegisterInput, IdentityRegisterOutput> = {
    action: 'identity.register',
    description: 'Create an account.',
    input: schema<IdentityRegisterInput>({
        type: 'object',
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 12 },
            displayName: { type: 'string', minLength: 1 },
        },
        required: ['email', 'password', 'displayName'],
    }),
    output: schema<IdentityRegisterOutput>(),
    available: () => ({ can: true }),
    run: async () => ({ userId: 'u-1' }),
};

const deployRelease: BoundCommand<CdnDeployInput, void> = {
    action: 'cdn.deploy',
    description: 'Point a hostname at a release.',
    input: schema<CdnDeployInput>({
        type: 'object',
        properties: { host: { type: 'string' }, release: { type: 'string' } },
        required: ['host', 'release'],
    }),
    output: schema<void>(),
    available: () => ({ can: true }),
    run: async () => {},
};

// --------------------------------------------------------------------------- the proof

describe('U7 — a generated command reaches the vocabulary uncast', () => {
    it('compiles: ActionCard takes a generated input type', () => {
        // A type error on any line below is U7 reopening. Nothing here asserts at run time; the
        // compiler is the assertion, and `npm test` runs `typecheck` before it runs this file.
        ui.ActionCard({
            on,
            command: registerUser,
            title: 'Register user',
            primaryLabel: 'Register',
            initialValues: { email: '', password: '', displayName: '' },
        });
    });

    it('compiles: ActionButton takes a generated input type', () => {
        ui.ActionButton({
            on,
            command: deployRelease,
            input: { host: 'example.test', release: 'sha256:abc' },
            label: 'Deploy',
        });
    });

    it('compiles: the result is a Node, so it nests without .view()', () => {
        ui.DetailSurface({
            title: 'Account',
            children: [
                ui.ActionCard({
                    on,
                    command: registerUser,
                    initialValues: { email: '', password: '', displayName: '' },
                }),
            ],
        });
    });
});
