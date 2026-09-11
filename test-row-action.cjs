const fs = require('fs');
let testStr = `
import { TableRow } from '../src/ui/components/table.js';

describe('TableRow action', () => {
    it('runs the command against the right row and cannot be fired twice', async () => {
        let ran = 0;
        let release = () => {};
        const held = new Promise<void>((r) => { release = r; });
        const mockCommand = commandThat(() => AVAILABLE, async () => {
            ran += 1;
            await held;
        });

        const row = TableRow({
            action: {
                on: wiring.on,
                command: mockCommand,
            }
        });
        
        // Find the action button in the row
        const btn = byClass(row, 'ui-action-button');
        expect(btn).toBeDefined();

        // Press it twice
        expect(press(btn!)).toBe(true);
        expect(press(btn!)).toBe(true);

        release();
        await Promise.resolve();
        await Promise.resolve(); // Let microtasks drain

        expect(ran).toBe(1);
    });
});
`;
let content = fs.readFileSync('test/ui.test.ts', 'utf8');
content += testStr;
fs.writeFileSync('test/ui.test.ts', content);
