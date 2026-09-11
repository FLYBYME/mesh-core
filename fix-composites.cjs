const fs = require('fs');

function replaceExport(file, startStr, newContent) {
    let content = fs.readFileSync(file, 'utf8');
    const startIndex = content.indexOf(startStr);
    if (startIndex !== -1) {
        content = content.substring(0, startIndex) + newContent;
        fs.writeFileSync(file, content);
    }
}

replaceExport('src/ui/composites/actionButton.ts', 'export const ActionButton: Composite<', 
`export function ActionButton<I = void, O = void>(props: ActionButtonProps<I, O>): Node {
    return createActionButton(props).view();
}
`);

replaceExport('src/ui/composites/actionCard.ts', 'export const ActionCard: Composite<', 
`export function ActionCard<I extends Record<string, Json | undefined> = Record<string, Json | undefined>, O = unknown>(props: ActionCardProps<I, O>): Node {
    return createActionCard(props).view();
}
`);

replaceExport('src/ui/composites/signIn.ts', 'export const SignIn: Composite<', 
`export function SignIn(props: SignInProps): Node {
    return createSignIn(props).view();
}
`);
