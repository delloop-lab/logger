import fs from 'fs';
import path from 'path';

const files = [];
function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(ent.name)) files.push(p);
  }
}
walk('src');

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('react-hot-toast')) continue;
  const n = c.replace(
    /import\s+toast\s+from\s+['"]react-hot-toast['"];?/g,
    "import { toast } from '@/lib/notify';"
  );
  if (n !== c) {
    fs.writeFileSync(f, n);
    console.log('updated', f);
  } else {
    console.log('manual needed', f);
  }
}
