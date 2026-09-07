import './ui.css';
import type { Context, Extension } from '@flybyme/mesh-web';
import { CONSUMES, NEEDS } from './contract.js';
import { entityListComponent, entityItemComponent } from './views/entityList.js';
import { detailSurfaceComponent } from './views/detailSurface.js';
import { propertyGridComponent } from './views/propertyGrid.js';
import { tableComponent, tableRowComponent } from './views/table.js';

export * from './contract.js';

export default class UiExtension implements Extension<typeof NEEDS, typeof CONSUMES> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;

    readonly components = [
        entityListComponent,
        entityItemComponent,
        detailSurfaceComponent,
        propertyGridComponent,
        tableComponent,
        tableRowComponent,
    ];

    activate(_cx: Context<typeof NEEDS, typeof CONSUMES>): void {
        // Design system extension: contributes components to the registry and stylesheet to the page.
    }
}
