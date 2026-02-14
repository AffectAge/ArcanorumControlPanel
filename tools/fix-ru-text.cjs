const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);

const cp1251 = {
  encode(text) {
    return Buffer.from(text, 'binary');
  },
};

// Decode mojibake fragments like "РџСЂРёРІРµС‚" -> "Привет"
function decodeMojibake(segment) {
  const bytes = [];
  for (let i = 0; i < segment.length; i += 1) {
    const code = segment.charCodeAt(i);
    if (code > 0xff) return segment;
    bytes.push(code);
  }
  const decoded = Buffer.from(bytes).toString('utf8');
  if (!decoded || decoded.includes('\uFFFD')) return segment;
  return decoded;
}

function fixText(text) {
  const pattern = /(?:\u0420.|\u0421.|\u0432\u0402.|\u0402.|\u0403.|\u201A.)+/g;
  return text.replace(pattern, (seg) => decodeMojibake(seg));
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = fixText(before);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed += 1;
    console.log(`fixed: ${path.relative(path.resolve(__dirname, '..'), file)}`);
  }
}

console.log(`done, changed: ${changed}`);
