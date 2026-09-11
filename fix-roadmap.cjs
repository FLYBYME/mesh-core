const fs = require('fs');
let roadmap = fs.readFileSync('spec/roadmap.md', 'utf8');

roadmap = roadmap.replace(
    "U7. **Generics and composites are in conflict.**",
    "U7. **Generics and composites are in conflict.** (Fixed: `ui` functions all return a `Node`)"
);
roadmap = roadmap.replace(
    "1. **The namespace is not generic.** `ui.ActionCard` is declared",
    "1. **The namespace is not generic.** (Decided: All 15 functions return a `Node` directly, making them standard generic functions rather than pinned constants.)"
);

fs.writeFileSync('spec/roadmap.md', roadmap);
