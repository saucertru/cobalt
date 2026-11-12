// Builds the site into dist/ and lists every game in games/ so it appears on the Games page.
// Vercel runs this on every push (see vercel.json). Run it yourself with: node scripts/build-games.js
//
// What counts as a game:
//   games/<folder>/index.html      an HTML game
//   games/<folder>/<something>.swf a Flash game (played with Ruffle; a player page is made for you)
//   games/<something>.swf          a Flash game dropped straight into games/
//   games/<folder>/<rom>  or  games/<rom>   a console game (NES, SNES, GB, GBA, N64, DS, PS1, Sega...) played with EmulatorJS
//                                  (for .zip/.bin/.iso/.md ROMs, set "system" in game.json, e.g. "nes", "gba", "psx", "segaMD")
// Optional in a folder: game.json (name, description, controls, color, icon, entry, swf) and thumbnail.png/.jpg/.webp/.gif
//   icon  = path of an image inside the folder to show on the game's card (e.g. "img/icon.png")
//   entry = path of the game's main page if it isn't index.html at the top (found automatically one level down too)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const gamesDir = path.join(root, 'games');
const out = path.join(root, 'dist');
const outGames = path.join(out, 'games');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(outGames, { recursive: true });
for (const f of ['index.html', 'supabase-config.js', 'site-config.js']) {
  if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(out, f));
}
// images in the main folder (for the tab icon in site-config.js)
for (const f of fs.readdirSync(root)) {
  if (/\.(png|ico|svg|jpe?g|webp|gif)$/i.test(f) && fs.statSync(path.join(root, f)).isFile()) fs.copyFileSync(path.join(root, f), path.join(out, f));
}

const slug = s => s.toLowerCase().replace(/\.swf$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'game';
const nice = s => s.replace(/\.swf$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Player page for Flash games. Ruffle (ruffle.rs) is loaded from unpkg.
function rufflePage(title, swfFile) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,sans-serif;color:#cfd8e8}
  #player{width:100%;height:100%}
  #player ruffle-player,#player ruffle-object{width:100%;height:100%;display:block}
  #msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;font-size:15px}
</style>
</head>
<body>
<div id="player"></div>
<div id="msg">Loading Flash player…</div>
<script>
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = { autoplay: 'on', unmuteOverlay: 'hidden', letterbox: 'on', splashScreen: false, contextMenu: 'on', backgroundColor: '#000000' };
</script>
<script src="https://unpkg.com/@ruffle-rs/ruffle"></script>
<script>
  (function start(tries) {
    const msg = document.getElementById('msg');
    if (!window.RufflePlayer || !window.RufflePlayer.newest) {
      if (tries > 50) { msg.textContent = "Couldn't load the Flash player (Ruffle). Check your connection and reload."; return; }
      return setTimeout(() => start(tries + 1), 100);
    }
    const player = window.RufflePlayer.newest().createPlayer();
    document.getElementById('player').appendChild(player);
    const api = typeof player.ruffle === 'function' ? player.ruffle() : player;
    Promise.resolve(api.load(${JSON.stringify(swfFile)}))
      .then(() => { msg.remove(); })
      .catch(() => { msg.textContent = "This Flash game couldn't be loaded."; });
  })(0);
</script>
</body>
</html>
`;
}

// Console games: file extension -> EmulatorJS system
const SYSTEMS = {nes: 'nes fds unf unif', snes: 'smc sfc fig swc bs gd3', n64: 'n64 z64 v64', gb: 'gb gbc dmg', gba: 'gba', nds: 'nds',
  vb: 'vb vboy', segaMS: 'sms', segaMD: 'gen smd sgd 68k', segaGG: 'gg', psx: 'pbp chd', atari2600: 'a26', atari7800: 'a78',
  lynx: 'lnx', pce: 'pce', ngp: 'ngp ngc', ws: 'ws wsc'};
const romSystem = f => { const ext = (f.split('.').pop() || '').toLowerCase(); return Object.keys(SYSTEMS).find(k => SYSTEMS[k].split(' ').includes(ext)) || ''; };
const SYSTEM_NAMES = {nes: 'NES', snes: 'SNES', n64: 'N64', gb: 'Game Boy', gba: 'GBA', nds: 'Nintendo DS', vb: 'Virtual Boy', segaMS: 'Master System',
  segaMD: 'Sega Genesis', segaGG: 'Game Gear', psx: 'PlayStation', atari2600: 'Atari 2600', atari7800: 'Atari 7800', lynx: 'Atari Lynx', pce: 'PC Engine', ngp: 'Neo Geo Pocket', ws: 'WonderSwan'};
function emulatorPage(title, romFile, system) {
  const data = 'https://cdn.emulatorjs.org/stable/data/';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#game{width:100%;height:100%}</style>
</head>
<body>
<div id="game"></div>
<script>
  window.EJS_player = '#game';
  window.EJS_core = ${JSON.stringify(system)};
  window.EJS_gameUrl = ${JSON.stringify(encodeURI(romFile))};
  window.EJS_gameName = ${JSON.stringify(title)};
  window.EJS_pathtodata = ${JSON.stringify(data)};
  window.EJS_startOnLoaded = true;
  window.EJS_color = '#2563eb';
</script>
<script src="${data}loader.js"></script>
</body>
</html>
`;
}

const list = [];
const add = (id, meta, fallbackName, folder, thumb, page = 'index.html') => {
  if (list.some(g => g.id === id)) { console.warn(`Skipped ${folder}: another game already uses the id "${id}"`); return; }
  list.push({
    id,
    name: String(meta.name || fallbackName),
    desc: String(meta.description || ''),
    help: String(meta.controls || ''),
    color: /^#[0-9a-fA-F]{6}$/.test(meta.color || '') ? meta.color : '#2563eb',
    src: `games/${folder}/${page}`,
    thumb: thumb ? `games/${folder}/${thumb}` : ''
  });
};

if (fs.existsSync(gamesDir)) {
  fs.cpSync(gamesDir, outGames, { recursive: true });
  for (const entry of fs.readdirSync(gamesDir).sort()) {
    const full = path.join(gamesDir, entry);
    const stat = fs.statSync(full);

    // A .swf dropped straight into games/
    if (stat.isFile() && /\.swf$/i.test(entry)) {
      const id = slug(entry);
      const dir = path.join(outGames, id);
      if (fs.existsSync(path.join(gamesDir, id))) { console.warn(`Skipped games/${entry}: a folder named "${id}" already exists`); continue; }
      fs.mkdirSync(dir, { recursive: true });
      fs.renameSync(path.join(outGames, entry), path.join(dir, 'game.swf'));
      fs.writeFileSync(path.join(dir, 'index.html'), rufflePage(nice(entry), 'game.swf'));
      add(id, { description: 'Flash game' }, nice(entry), id, '');
      continue;
    }
    // A console ROM dropped straight into games/
    if (stat.isFile() && romSystem(entry)) {
      const id = slug(entry.replace(/\.[^.]+$/, ''));
      if (fs.existsSync(path.join(gamesDir, id))) { console.warn(`Skipped games/${entry}: a folder named "${id}" already exists`); continue; }
      const dir = path.join(outGames, id);
      fs.mkdirSync(dir, { recursive: true });
      fs.renameSync(path.join(outGames, entry), path.join(dir, entry));
      const sys = romSystem(entry), title = nice(entry.replace(/\.[^.]+$/, ''));
      fs.writeFileSync(path.join(dir, 'index.html'), emulatorPage(title, entry, sys));
      add(id, { description: `${SYSTEM_NAMES[sys]} game` }, title, id, '');
      continue;
    }
    if (!stat.isDirectory()) continue;

    let meta = {};
    const metaFile = path.join(full, 'game.json');
    if (fs.existsSync(metaFile)) {
      try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); }
      catch (e) { console.warn(`games/${entry}/game.json isn't valid JSON, using defaults`); }
    }
    const safe = rel => typeof rel === 'string' && rel && !rel.includes('..') && !path.isAbsolute(rel) && fs.existsSync(path.join(full, rel)) ? rel.replace(/\\/g, '/') : '';
    const thumb = safe(meta.icon) || ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg', 'thumbnail.webp', 'thumbnail.gif']
      .find(f => fs.existsSync(path.join(full, f)));
    if (meta.icon && !safe(meta.icon)) console.warn(`games/${entry}: icon "${meta.icon}" not found`);

    // main page: game.json "entry", else index.html at the top, else one folder down (e.g. Game_Source/index.html)
    let page = safe(meta.entry) || (fs.existsSync(path.join(full, 'index.html')) ? 'index.html' : '');
    if (!page) {
      const sub = fs.readdirSync(full).filter(d => fs.statSync(path.join(full, d)).isDirectory() && fs.existsSync(path.join(full, d, 'index.html')));
      if (sub.length === 1) page = sub[0] + '/index.html';
    }
    if (page) {
      add(slug(entry), meta, entry, entry, thumb, page);
      continue;
    }
    // A folder with a Flash game in it
    const swfs = fs.readdirSync(full).filter(f => /\.swf$/i.test(f)).sort();
    const swf = meta.swf && swfs.includes(meta.swf) ? meta.swf : swfs[0];
    if (swf) {
      fs.writeFileSync(path.join(outGames, entry, 'index.html'), rufflePage(meta.name || nice(entry), swf));
      add(slug(entry), { description: 'Flash game', ...meta }, nice(entry), entry, thumb);
      continue;
    }
    // A folder with a console ROM in it
    const files = fs.readdirSync(full).filter(f => fs.statSync(path.join(full, f)).isFile());
    const rom = (meta.rom && files.includes(meta.rom) ? meta.rom : '') || files.find(f => romSystem(f)) ||
      (meta.system ? files.find(f => /\.(zip|7z|bin|iso|cue|md)$/i.test(f)) : '');
    const sys = (meta.system && SYSTEM_NAMES[meta.system] ? meta.system : '') || (rom ? romSystem(rom) : '');
    if (rom && sys) {
      fs.writeFileSync(path.join(outGames, entry, 'index.html'), emulatorPage(meta.name || nice(entry), rom, sys));
      add(slug(entry), { description: `${SYSTEM_NAMES[sys]} game`, ...meta }, nice(entry), entry, thumb);
      continue;
    }
    if (rom && !sys) { console.warn(`Skipped games/${entry}: add "system" to its game.json (e.g. "nes", "gba", "psx")`); continue; }
    console.warn(`Skipped games/${entry}: it has no index.html, .swf or ROM file`);
  }
}
list.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
fs.writeFileSync(path.join(outGames, 'manifest.json'), JSON.stringify(list, null, 2));
console.log(`Built dist/ with ${list.length} game(s): ${list.map(g => g.name).join(', ') || 'none'}`);
