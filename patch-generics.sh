sed -i 's/export const Form: Composite<FormProps<Record<string, Json | undefined>>, FormState<Record<string, Json | undefined>>> = defineComposite<.*$/export function Form<T = Record<string, Json | undefined>>(props: FormProps<T>): Node {\n    return createForm(props).view();\n}/' src/ui/composites/form.ts
sed -i '/FormProps<Record<string, Json | undefined>>,/d' src/ui/composites/form.ts
sed -i '/FormState<Record<string, Json | undefined>>/d' src/ui/composites/form.ts
sed -i '/UI_FORM,/d' src/ui/composites/form.ts
sed -i "/'Editing a thing: owns the buffers, validity, dirty state, and generates fields from schema.',/d" src/ui/composites/form.ts
sed -i '/(props) => createForm(props),/d' src/ui/composites/form.ts
sed -i '/);/d' src/ui/composites/form.ts

sed -i 's/export const ActionButton: Composite<ActionButtonProps<unknown, unknown>, ActionButtonState<unknown>> = defineComposite<.*$/export function ActionButton<I = void, O = void>(props: ActionButtonProps<I, O>): Node {\n    return createActionButton(props).view();\n}/' src/ui/composites/actionButton.ts
sed -i '/ActionButtonProps<unknown, unknown>,/d' src/ui/composites/actionButton.ts
sed -i '/ActionButtonState<unknown>/d' src/ui/composites/actionButton.ts
sed -i '/UI_ACTION_BUTTON,/d' src/ui/composites/actionButton.ts
sed -i "/'One command: owns whether it is running, reads available() for refusal, confirms before running.',/d" src/ui/composites/actionButton.ts
sed -i '/(props) => createActionButton(props),/d' src/ui/composites/actionButton.ts

sed -i 's/export const ActionCard: Composite<ActionCardProps<Record<string, Json | undefined>, unknown>, ActionCardState<Record<string, Json | undefined>, unknown>> = defineComposite<.*$/export function ActionCard<I extends Record<string, Json | undefined> = Record<string, Json | undefined>, O = unknown>(props: ActionCardProps<I, O>): Node {\n    return createActionCard(props).view();\n}/' src/ui/composites/actionCard.ts
sed -i '/ActionCardProps<Record<string, Json | undefined>, unknown>,/d' src/ui/composites/actionCard.ts
sed -i '/ActionCardState<Record<string, Json | undefined>, unknown>/d' src/ui/composites/actionCard.ts
sed -i '/UI_ACTION_CARD,/d' src/ui/composites/actionCard.ts
sed -i "/'One command with inputs: title, consequence, fields from schema, one primary control, and result\/error in place.',/d" src/ui/composites/actionCard.ts
sed -i '/(props) => createActionCard(props),/d' src/ui/composites/actionCard.ts

sed -i 's/export const SignIn: Composite<SignInProps, SignInState> = defineComposite<SignInProps, SignInState>(.*$/export function SignIn(props: SignInProps): Node {\n    return createSignIn(props).view();\n}/' src/ui/composites/signIn.ts
sed -i '/UI_SIGN_IN,/d' src/ui/composites/signIn.ts
sed -i "/'Email and password over the auth API: busy while signing in, the failure in place, gone once signed in.',/d" src/ui/composites/signIn.ts
sed -i '/(props) => createSignIn(props),/d' src/ui/composites/signIn.ts

