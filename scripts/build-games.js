// Builds the site into dist/ and lists every game in games/ so it appears on the games page.
// Vercel runs this on every push (see vercel.json). Run it yourself with: node scripts/build-games.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const gamesDir = path.join(root, 'games');
const out = path.join(root, 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));

const list = [];
if (fs.existsSync(gamesDir)) {
  for (const folder of fs.readdirSync(gamesDir).sort()) {
    const dir = path.join(gamesDir, folder);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (!fs.existsSync(path.join(dir, 'index.html'))) {
      console.warn(`Skipped games/${folder}: it has no index.html`);
      continue;
    }
    let meta = {};
    const metaFile = path.join(dir, 'game.json');
    if (fs.existsSync(metaFile)) {
      try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); }
      catch (e) { console.warn(`games/${folder}/game.json isn't valid JSON, using defaults`); }
    }
    const thumb = ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg', 'thumbnail.webp', 'thumbnail.gif']
      .find(f => fs.existsSync(path.join(dir, f)));
    const id = folder.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'game';
    list.push({
      id,
      name: String(meta.name || folder),
      desc: String(meta.description || ''),
      help: String(meta.controls || ''),
      color: /^#[0-9a-fA-F]{6}$/.test(meta.color || '') ? meta.color : '#7c3aed',
      src: `games/${folder}/index.html`,
      thumb: thumb ? `games/${folder}/${thumb}` : ''
    });
  }
  fs.cpSync(gamesDir, path.join(out, 'games'), { recursive: true });
}
fs.mkdirSync(path.join(out, 'games'), { recursive: true });
fs.writeFileSync(path.join(out, 'games', 'manifest.json'), JSON.stringify(list, null, 2));
console.log(`Built dist/ with ${list.length} game(s) from the games folder: ${list.map(g => g.name).join(', ') || 'none'}`);
