# Dispatch 2 Report: Shell Sign-In Implementation

**Date:** 2026-09-06  
**Repository:** `FLYBYME/mesh-core`  
**Extension Implemented:** `src/chrome/index.ts` (`0.2.0`)  
**Kernel:** `@flybyme/mesh-web` (`^0.11`)

---

## 1. Executive Summary

In this dispatch, page-level authentication was integrated into the shell (`src/chrome/index.ts`), elevating sign-in from an application-level concern to a first-class desktop environment feature.

### Key Deliverables
- **Signed Out State**: Inline email input, password input (`type: 'password'`), and a "Sign in" submit button positioned on the right side of the chrome topbar (`.chrome-bar`).
- **Controlled Inputs & Password Security**: Passwords never outlive the submit lifecycle and are never placed in persistent storage. `password.set('')` clears the password immediately on submit before network requests resolve.
- **Refused Credentials**: Invalid credentials render an in-bar refusal message (`.chrome-auth-error`) without throwing unhandled exceptions. The password field is cleared while preserving the entered email.
- **Signed In State**: Displays user identity (`displayName` or `userId` fallback in `.chrome-user`) alongside a dedicated "Sign out" button (`.chrome-signout`) that drives `auth.signOut()`.
- **Pre-held Session on Load**: If an authenticated session is already present (`auth.session() !== null`), the shell boots directly into the signed-in state without flickering or rendering the sign-in form.
- **Zero-Dependency Graceful Degradation**: On pages where `AuthExtension` is not composed, the shell boots cleanly and functions normally with zero auth UI in the DOM.
- **Quality & Conformance**: All 20 tests pass across `chrome` (10 tests), `catalog` (5 tests), and `releases` (5 tests). `npm run typecheck` passes cleanly with **zero `as any`, zero `as never`, and zero `as` type casts**. Version bumped to `0.2.0` in `package.json` and `mesh.json`.

---

## 2. Answers to Prompt Questions

### Q1: How the shell reaches the auth API, and whether that path was already there

#### The Seam & Prior State
The provider token `AUTH: ProviderToken<AuthApi>` was already defined in `@flybyme/mesh-web` (`mesh-web/auth`), and `AuthExtension` existed as a site-supplied extension designed to manage session state and attach bearer tickets to outgoing requests.

However, **that path did not exist in the shell prior to this dispatch**:
1. `ChromeExtension` previously declared `NEEDS = needs('chrome', 'log', 'commands')` and provided `PAGE_CHROME` with zero `consumes` declarations.
2. In `mesh-web`, Extensions cannot simply call `cx.use(AUTH)` at runtime unless `AUTH` is statically declared in `consumes`. The kernel context enforces this:
   ```javascript
   if (!consumable.has(token.id)) {
       throw new Error(`${id} used provider "${token.id}" without declaring it in consumes.`);
   }
   ```
3. Furthermore, Extensions are topologically sorted at kernel boot time by `resolveOrder` (`kernel/graph.ts`). If an Extension declares a token in `consumes` that is not registered in `provides` by any loaded extension, `resolveOrder` marks the extension as `unresolvable`. The kernel then marks the extension as `failed` and **skips `activate()` entirely**.

#### How the Shell Reaches `AUTH`
To enable optional consumption of `AUTH` without breaking sites that omit `AuthExtension`:
- `ChromeExtension` defines a dynamic `get consumes()` getter.
- During kernel boot, `resolveOrder` iterates over all extension `provides` before visiting `consumes`. Accessing `token.id` on `AUTH` sets an internal flag `authProvided = true`.
- When `resolveOrder` visits `ChromeExtension.consumes`, it returns `consumes(AUTH)` if `authProvided` is true, and `consumes()` if false.
- In `activate(cx)`, if `authProvided` is true, `cx.use(AUTH)` safely retrieves the `AuthApi` instance.
- The shell implements commands `chrome.setEmail`, `chrome.setPassword`, `chrome.signIn`, and `chrome.signOut`, binding them to reactive signals and the `AuthApi` methods.

---

### Q2: What happens on a page where the `auth` Extension is not composed

In accordance with `spec/extension.md §7`, authentication is site-supplied: public sites, guest kiosks, or static documentation sites do not compose `AuthExtension`.

When `AuthExtension` is not composed:
1. **Topological Resolution**: No contribution provides `AUTH`. `authProvided` remains `false`.
2. **Consumes Declaration**: `ChromeExtension.consumes` returns `consumes()` (`EMPTY_CONSUMES`). The kernel's dependency graph treats `ChromeExtension` as having no upstream dependencies, so it resolves and activates cleanly.
3. **Activation State**: `auth` remains `undefined` within `activate()`.
4. **Rendering**: `authView()` evaluates `if (auth === undefined) return empty()`. No `.chrome-auth` container, form inputs, or sign-in buttons are rendered into the DOM.
5. **Shell Stability**: The window list (`.chrome-windows`), window buttons (`.chrome-tab`), mode toggle (`.chrome-mode`), and window host (`[data-window-host]`) mount and operate normally.
6. **Command Safety**: Auth-related commands (`chrome.signIn`, `chrome.signOut`) perform early-return checks when `auth === undefined`, ensuring no exceptions are thrown.

This is explicitly verified in `test/chrome.browser.test.ts`:
```typescript
it('boots normally without sign-in UI when AuthExtension is not composed', async () => {
    const s = await mountPart({
        parts: [
            { id: 'chrome', contribution: ChromeExtension },
            { id: 'panel', contribution: Panel },
        ],
        open: [{ application: 'panel', views: ['one'] }],
    });
    site = s;

    expect(document.querySelector('.chrome-bar')).not.toBeNull();
    expect(document.querySelector('.chrome-auth')).toBeNull();
});
```

---

### Q3: What is needed to show which organization a caller is acting in (`x-organization` header, memberships in session)

Currently, the `Session` interface in `@flybyme/mesh-web` is defined as:
```typescript
export interface Session {
    readonly userId: string;
    readonly displayName: string;
    readonly roles: readonly string[];
    readonly expiresAt: number;
}
```

To support multi-tenant organization tenancy and display the active organization in the shell:

1. **Session & Identity Expansion**:
   - `Session` must carry active organization metadata and user memberships:
     ```typescript
     export interface OrganizationMembership {
         readonly organizationId: string;
         readonly organizationName: string;
         readonly roles: readonly string[];
     }

     export interface Session {
         readonly userId: string;
         readonly displayName: string;
         readonly roles: readonly string[];
         readonly expiresAt: number;
         readonly activeOrganization?: OrganizationMembership;
         readonly organizations?: readonly OrganizationMembership[];
     }
     ```
2. **Credential Service & Outgoing Request Headers**:
   - `AuthExtension` attaches credentials via `cx.credentials.attach(...)`. Currently, it only attaches `authorization: Bearer <ticket>`.
   - It must be updated to attach the `x-organization: <orgId>` header based on the current active organization:
     ```typescript
     cx.credentials.attach(() => ({
         ...(ticket ? { authorization: `Bearer ${ticket}` } : {}),
         ...(activeOrgId ? { 'x-organization': activeOrgId } : {}),
     }));
     ```
3. **Organization Switching Seam in `AuthApi`**:
   - `AuthApi` must expose an organization selector:
     ```typescript
     export interface AuthApi {
         readonly session: Signal<Session | null>;
         signIn(credentials: Credentialed): Promise<Session>;
         signOut(): Promise<void>;
         switchOrganization(organizationId: string): Promise<Session>;
     }
     ```
4. **Shell Chrome UI**:
   - In `src/chrome/index.ts`, when `s?.activeOrganization` is present, render an organization pill/badge next to `.chrome-user`.
   - If `s.organizations` contains more than one membership, render a dropdown selector or command menu allowing operators to switch active tenants without re-authenticating.

---

### Q4: Anything that made demo apps' sign-in form easier or harder than this one

Integrating the sign-in form into the root desktop shell was significantly more complex than implementing it within an application window for two reasons:

#### 1. The Root Dispatch Value-Dropping Discrepancy (`start.js` vs `host.js`)
- In an **Application**, views are rendered inside window hosts managed by `window/host.js`. `host.js` intercepts DOM intents and appends their value to `action.args`:
  ```javascript
  options.onCommand(value === undefined
      ? action
      : { ...action, args: [...(action.args ?? []), value] });
  ```
  Consequently, in application views, an `Input` with `change: { action: command('app.setValue') }` automatically receives the typed text in its command implementation.
- In the **Shell**, page chrome is rendered at the root via `mountPage` in `kernel/start.js`:
  ```javascript
  render: { components, dispatch: { dispatch: run } }
  ```
  where `run` is implemented as:
  ```javascript
  const run = (action) => {
      if (action.kind !== 'command') return;
      void kernel.services.commands.get(action.id)?.run(...(action.args ?? []));
  };
  ```
  `run` **completely ignores the second `value` argument** passed by `render/dom.js` on `change` events! Because of this framework omission, root chrome commands received `undefined` for `val` when bound via `command('chrome.setEmail')`.
- **Solution**: To make the controlled inputs reliable, `chrome.setEmail`, `chrome.setPassword`, and `chrome.signIn` check for `val`, and if `undefined`, query the input elements directly (`.chrome-input-email`, `.chrome-input-password`). This guarantees that user input is never dropped regardless of framework dispatch layer differences.

#### 2. Topological Extension Graph Ordering vs Application Runtime `use()`
- Applications can use optional services casually at runtime: an application does not participate in `resolveOrder`, so it can simply attempt `try { cx.use(AUTH); } catch {}` without failing boot.
- An Extension declaring `consumes(AUTH)` causes the kernel to abort boot if `AUTH` is not supplied by another extension. Making `ChromeExtension` an optional consumer required coordinating provider graph inspection so that it consumes `AUTH` only when provided.

#### 3. Ephemeral Password Lifecycle
- Unlike demo forms that often bind form inputs to persistent model objects, desktop shell security standards dictate that passwords must never outlive submit. Clearing `password` immediately before awaiting network resolution required precise signal synchronization to avoid DOM desynchronization.

---

## 3. Verification & Test Suite Summary

### Test Suite Execution
```
 Test Files  3 passed (3)
      Tests  20 passed (20)
   Duration  3.82s
```
- `test/chrome.browser.test.ts`: 10 passed
  - `mounts a window host, so windows have somewhere to be`
  - `lists every open window and focuses the one clicked`
  - `switches the mode nothing else on the page could reach`
  - `boots normally without sign-in UI when AuthExtension is not composed`
  - `renders signed-out form with email, password, and sign-in button`
  - `displays refusal message visibly and clears password on wrong credentials without throwing`
  - `signs in with valid credentials and shows user identity and sign-out button`
  - `signs out when clicking sign out button`
  - `renders signed-in state on load if session is already held`
  - `displays userId when displayName is empty`
- `test/catalog.browser.test.ts`: 5 passed
- `test/releases.browser.test.ts`: 5 passed

### Zero-Cast Compliance
`npm run typecheck` succeeds with zero errors. A full codebase scan confirms zero instances of `as any`, `as never`, or type assertions (`as <Type>`) in `src/chrome/index.ts` and `test/chrome.browser.test.ts`. All DOM element narrowing is handled through structural type guards (`instanceof HTMLElement`, `instanceof HTMLInputElement`).
