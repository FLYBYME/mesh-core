const fs = require('fs');

function fix(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replaceAll(search, replace);
    }
    fs.writeFileSync(file, content);
}

fix('src/identity/view.ts', [
    ['badge:', 'subtitle:'],
    ['label: \'Slug\'', 'header: \'Slug\''],
    ['label: \'Owner\'', 'header: \'Owner\''],
    ['}).view()', '})']
]);

fix('test/press.browser.test.ts', [
    ['}).view()', '})']
]);

fix('test/signIn.browser.test.ts', [
    ['}).view()', '})']
]);

fix('test/ui.test.ts', [
    ['label: \'Host\'', 'header: \'Host\'']
]);

fix('src/ui/composites/actionButton.ts', [
    ['defineComposite, formatRefusal, UI_ACTION_BUTTON,', 'formatRefusal,'],
    ['type ActionButtonProps, type ActionButtonState, type Composite,', 'type ActionButtonProps, type ActionButtonState,']
]);

fix('src/ui/composites/actionCard.ts', [
    ['defineComposite, formatRefusal, UI_ACTION_CARD,', 'formatRefusal,'],
    ['type ActionCardProps, type ActionCardState, type Composite,', 'type ActionCardProps, type ActionCardState,']
]);

fix('src/ui/composites/form.ts', [
    ['defineComposite, UI_FORM, type Composite, type FieldOverride,', 'type FieldOverride,'],
    // in case it's different
    ['defineComposite, UI_FORM, type Composite,', ''],
]);

fix('src/ui/composites/signIn.ts', [
    ['defineComposite, UI_SIGN_IN,', ''],
    ['type Composite, type SignInProps, type SignInState,', 'type SignInProps, type SignInState,']
]);

fix('test/generics.type.test.ts', [
    ['const card = ', 'export const card = '],
    ['const button = ', 'export const button = ']
]);

