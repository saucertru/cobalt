// Rail4: an original 3D freeski park game for cobalt.
// Uses three.js (MIT), vendored next to this file.
import * as THREE from 'three';

// ---------- world constants ----------
const SL = 0.32;                 // slope: metres dropped per metre travelled
const G = 9.8;
const LEN = 1200;                // course length (metres)
const HALF_W = 40;               // half width of the groomed course
const TAU = Math.PI * 2;
const SIN_T = SL / Math.hypot(1, SL);
const base = z => -SL * z;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let seed = 4;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- course layout (same every run, so scores are fair) ----------
const kickers = [], rails = [];
const KS = {
  S: { w: 6, len: 5, hgt: 1.2 }, M: { w: 7, len: 7, hgt: 2.0 },
  L: { w: 8, len: 9, hgt: 2.9 }, XL: { w: 10, len: 12, hgt: 3.8 },
};
const addKicker = (s, x, z) => kickers.push({ ...KS[s], x, z, size: s });
const addRail = (type, x, z, len) => rails.push({
  type, x, z1: z, z2: z + len, w: type === 'box' ? 0.7 : 0.12,
  hMin: type === 'box' ? 0.2 : 0.25, hMax: type === 'box' ? 0.6 : 0.9,
});
for (let i = 0, z = 70; z < LEN - 90; i++, z += 58) {
  const j = () => (rnd() - 0.5) * 6;
  switch (i % 5) {
    case 0: addKicker('S', -16 + j(), z); addKicker('M', j(), z + 2); addKicker('L', 16 + j(), z + 4); break;
    case 1: addRail('rail', -12 + j(), z, 14 + rnd() * 6); addRail('box', 9 + j(), z + 3, 12 + rnd() * 6); break;
    case 2: addKicker('M', -11 + j(), z); addKicker('L', 12 + j(), z + 3); break;
    case 3: addRail('box', j() * 0.5, z, 18 + rnd() * 6); addRail('rail', -19 + j() * 0.5, z + 4, 12); addRail('rail', 19 + j() * 0.5, z + 4, 12); break;
    case 4: addKicker('XL', j() * 0.5, z); addKicker('S', -24 + j() * 0.5, z + 4); addKicker('S', 24 + j() * 0.5, z + 4); break;
  }
}

function kickerAdd(x, z) {
  let a = 0;
  for (const k of kickers) {
    if (z < k.z || z > k.z + k.len || Math.abs(x - k.x) > k.w / 2) continue;
    a = Math.max(a, k.hgt * Math.pow((z - k.z) / k.len, 1.7));
  }
  return a;
}
const ground = (x, z) => base(z) + kickerAdd(x, z);
const railTop = (r, z) => base(z) + (z < r.z1 + 3 ? r.hMin + (r.hMax - r.hMin) * clamp((z - r.z1) / 3, 0, 1) : r.hMax);
function groundNormal(x, z, out = new THREE.Vector3()) {
  const e = 0.25;
  return out.set(-(ground(x + e, z) - ground(x - e, z)), 2 * e, -(ground(x, z + e) - ground(x, z - e))).normalize();
}
const bank = x => { const a = Math.abs(x) - HALF_W - 2; return a > 0 ? a * a * 0.012 + a * 0.18 : 0; };

// ---------- renderer / scene ----------
const app = document.getElementById('app');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  document.getElementById('nogl').style.display = 'flex';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const HORIZON = new THREE.Color('#f4b3a4');
scene.fog = new THREE.Fog(HORIZON, 80, 480);
const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 3000);

const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: new THREE.Color('#29295f') }, mid: { value: HORIZON.clone() }, low: { value: new THREE.Color('#ffe0b0') },
  },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP;
    void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.5, h)) : mix(mid, low, smoothstep(0.0, -0.25, h));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
}));
scene.add(sky);
const sun = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12), new THREE.MeshBasicMaterial({ color: '#fff0c8', fog: false }));
scene.add(sun);

const hemi = new THREE.HemisphereLight('#cfd6ff', '#8a6f8f', 1.6);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#ffd3a6', 2.6);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
Object.assign(sunLight.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
sunLight.shadow.bias = -0.0008;
scene.add(sunLight, sunLight.target);
const SUN_OFF = new THREE.Vector3(-70, 90, 60);

// ---------- textures ----------
function corduroy() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(120,130,190,0.10)';
  for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function textTex(text, bg, fg, w = 512, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `italic 900 ${h * 0.62}px system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- ground ----------
const snowMat = new THREE.MeshLambertMaterial({ color: '#f1f0ff', map: corduroy() });
(function buildGround() {
  const W = 400, z0 = -140, L = LEN + 460, xs = 100, zs = Math.ceil(L / 8);
  const pos = [], uv = [], idx = [];
  for (let iz = 0; iz <= zs; iz++) {
    const z = z0 + iz * L / zs;
    for (let ix = 0; ix <= xs; ix++) {
      const x = -W / 2 + ix * W / xs;
      const off = Math.abs(x) > HALF_W + 4 ? Math.sin(x * 0.21) * Math.sin(z * 0.13) * 1.2 : 0;
      pos.push(x, base(z) + bank(x) + off, z);
      uv.push(x / 3, z / 3);
    }
  }
  for (let iz = 0; iz < zs; iz++) for (let ix = 0; ix < xs; ix++) {
    const a = iz * (xs + 1) + ix, b = a + 1, c = a + xs + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, snowMat); m.receiveShadow = true;
  scene.add(m);
})();

// ---------- kickers ----------
const lipMat = new THREE.MeshLambertMaterial({ color: '#ff7a3d' });
const kickMat = new THREE.MeshLambertMaterial({ color: '#e7e8ff', map: snowMat.map, side: THREE.DoubleSide });
for (const k of kickers) {
  const N = 16, p = [];
  const L = k.x - k.w / 2, R = k.x + k.w / 2;
  const top = (t) => { const z = k.z + t * k.len; return [z, base(z) + k.hgt * Math.pow(t, 1.7)]; };
  const quad = (a, b, c, d) => p.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < N; i++) {
    const [z0, y0] = top(i / N), [z1, y1] = top((i + 1) / N);
    quad([L, y0, z0], [L, y1, z1], [R, y1, z1], [R, y0, z0]);
    quad([L, base(z0) - 0.1, z0], [L, base(z1) - 0.1, z1], [L, y1, z1], [L, y0, z0]);
    quad([R, y0, z0], [R, y1, z1], [R, base(z1) - 0.1, z1], [R, base(z0) - 0.1, z0]);
  }
  const [zl, yl] = top(1);
  quad([L, yl, zl], [R, yl, zl], [R, base(zl) - 0.1, zl], [L, base(zl) - 0.1, zl]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const uvs = []; for (let i = 0; i < p.length; i += 3) uvs.push(p[i] / 3, p[i + 2] / 3);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, kickMat); m.castShadow = m.receiveShadow = true;
  scene.add(m);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(k.w + 0.02, 0.1, 0.35), lipMat);
  lip.position.set(k.x, yl - 0.04, zl - 0.17); scene.add(lip);
  for (const s of [-1, 1]) {
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), lipMat);
    flag.position.set(k.x + s * (k.w / 2 + 0.6), base(zl) + 0.8, zl); scene.add(flag);
  }
}

// ---------- rails and boxes ----------
const railMat = new THREE.MeshStandardMaterial({ color: '#c8d2e6', metalness: 0.8, roughness: 0.3 });
const boxTopMat = new THREE.MeshStandardMaterial({ color: '#2f6fed', metalness: 0.3, roughness: 0.45 });
const postMat = new THREE.MeshLambertMaterial({ color: '#3a3f55' });
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
for (const r of rails) {
  const pts = [[r.z1, r.hMin], [r.z1 + 3, r.hMax], [r.z2, r.hMax]];
  for (let s = 0; s < 2; s++) {
    const a = new THREE.Vector3(r.x, base(pts[s][0]) + pts[s][1], pts[s][0]);
    const b = new THREE.Vector3(r.x, base(pts[s + 1][0]) + pts[s + 1][1], pts[s + 1][0]);
    const d = b.clone().sub(a); const len = d.length(); d.normalize();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    let m;
    if (r.type === 'rail') {
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 10), railMat);
      m.quaternion.setFromUnitVectors(UP, d); m.position.copy(mid).y -= 0.05;
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, len), boxTopMat);
      m.quaternion.setFromUnitVectors(FWD, d); m.position.copy(mid).y -= 0.06;
    }
    m.castShadow = true; scene.add(m);
  }
  for (let z = r.z1 + 1; z < r.z2; z += 2.5) {
    const h = railTop(r, z) - base(z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 6), postMat);
    post.position.set(r.x, base(z) + h / 2 - 0.05, z); post.castShadow = true; scene.add(post);
  }
}

// ---------- trees, fences, gates ----------
(function decor() {
  const cone = new THREE.ConeGeometry(1.7, 5, 7);
  const treeMat = new THREE.MeshLambertMaterial({ color: '#21515c', flatShading: true });
  const capMat = new THREE.MeshLambertMaterial({ color: '#f7f6ff', flatShading: true });
  const count = 700;
  const trees = new THREE.InstancedMesh(cone, treeMat, count);
  const caps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 1.6, 7), capMat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (HALF_W + 7 + Math.pow(rnd(), 0.7) * 140), z = -120 + rnd() * (LEN + 380);
    const sc = 0.7 + rnd() * 1.1;
    const y = base(z) + bank(x) + 2.3 * sc;
    m.compose(p.set(x, y, z), q, s.set(sc, sc, sc)); trees.setMatrixAt(i, m);
    m.compose(p.set(x, y + 1.85 * sc, z), q, s.set(sc, sc, sc)); caps.setMatrixAt(i, m);
  }
  trees.castShadow = true;
  scene.add(trees, caps);

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 5);
  const n = Math.ceil((LEN + 60) / 10) * 2;
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), n);
  let i = 0;
  for (let z = -20; z < LEN + 40 && i < n - 1; z += 10) for (const sd of [-1, 1]) {
    m.compose(p.set(sd * HALF_W, base(z) + 0.65, z), q, s.set(1, 1, 1));
    poles.setMatrixAt(i, m); poles.setColorAt(i, new THREE.Color((z / 10) % 2 ? '#ff7a3d' : '#2f6fed')); i++;
  }
  poles.count = i;
  scene.add(poles);

  const gate = (z, text, bg) => {
    const post = new THREE.CylinderGeometry(0.25, 0.25, 7, 8);
    for (const sd of [-1, 1]) {
      const pm = new THREE.Mesh(post, postMat); pm.position.set(sd * 13, base(z) + 3.5, z); pm.castShadow = true; scene.add(pm);
    }
    const tex = textTex(text, bg, '#ffffff', 1024, 128);
    for (const ry of [0, Math.PI]) {     // two faces so the text reads the right way from both sides
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshBasicMaterial({ map: tex }));
      banner.position.set(0, base(z) + 6.2, z); banner.rotation.y = ry; scene.add(banner);
    }
  };
  gate(-2, 'RAIL4', '#2f6fed');
  gate(LEN, 'FINISH', '#ff7a3d');
})();

// ---------- the rider (original low-poly skier) ----------
function makeRider() {
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; };
  const jacket = lam('#2f6fed'), pants = lam('#22283a'), ski = lam('#ff7a3d'), helmet = lam('#f4f4fa'), dark = lam('#1a1d29');
  const goggles = new THREE.MeshStandardMaterial({ color: '#ffc94a', metalness: 0.7, roughness: 0.2 });

  const root = new THREE.Group();
  const pivot = new THREE.Group(); pivot.position.y = 0.95; root.add(pivot);
  const body = new THREE.Group(); body.position.y = -0.95; pivot.add(body);

  for (const sx of [-0.16, 0.16]) {
    const s = box(0.12, 0.035, 1.75, ski); s.position.set(sx, 0.02, 0.05); body.add(s);
    const tip = box(0.12, 0.035, 0.25, ski); tip.position.set(sx, 0.07, 0.98); tip.rotation.x = -0.45; body.add(tip);
    const tail = box(0.12, 0.035, 0.2, ski); tail.position.set(sx, 0.06, -0.86); tail.rotation.x = 0.4; body.add(tail);
    const boot = box(0.15, 0.2, 0.3, dark); boot.position.set(sx, 0.13, 0.02); body.add(boot);
  }
  const legs = new THREE.Group(); body.add(legs);
  for (const sx of [-0.15, 0.15]) { const l = box(0.17, 0.62, 0.2, pants); l.position.set(sx, 0.52, 0); legs.add(l); }
  const torso = new THREE.Group(); torso.position.y = 0.86; body.add(torso);
  const chest = box(0.48, 0.6, 0.3, jacket); chest.position.y = 0.3; torso.add(chest);
  const stripe = box(0.5, 0.08, 0.32, ski); stripe.position.y = 0.42; torso.add(stripe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), helmet); head.position.y = 0.78; head.castShadow = true; torso.add(head);
  const gog = box(0.28, 0.08, 0.06, goggles); gog.position.set(0, 0.77, 0.15); torso.add(gog);
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.3, 0.55, 0); torso.add(sh);
    const a = box(0.12, 0.56, 0.13, jacket); a.position.y = -0.27; sh.add(a);
    const hand = box(0.12, 0.1, 0.12, dark); hand.position.y = -0.58; sh.add(hand);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.15, 5), postMat);
    pole.position.set(0, -0.6, 0.05); pole.rotation.x = 1.25; pole.castShadow = true; sh.add(pole);
    sh.rotation.set(-0.35, 0, sx * 0.25);
    arms.push(sh);
  }
  return { root, pivot, legs, torso, arms };
}
const rider = makeRider();
scene.add(rider.root);

// ---------- snow spray ----------
const SPRAY = 260;
const sprayGeo = new THREE.BufferGeometry();
const sprayPos = new Float32Array(SPRAY * 3), sprayVel = new Float32Array(SPRAY * 3), sprayLife = new Float32Array(SPRAY);
sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.22, transparent: true, opacity: 0.85, depthWrite: false }));
spray.frustumCulled = false;
scene.add(spray);
let sprayIdx = 0;
function emitSpray(p, dir, n, power) {
  for (let i = 0; i < n; i++) {
    const k = sprayIdx = (sprayIdx + 1) % SPRAY;
    sprayPos.set([p.x + (Math.random() - 0.5) * 0.4, p.y + 0.05, p.z + (Math.random() - 0.5) * 0.4], k * 3);
    sprayVel.set([dir.x * power + (Math.random() - 0.5) * 2, 1.5 + Math.random() * 2.5, dir.z * power + (Math.random() - 0.5) * 2], k * 3);
    sprayLife[k] = 0.5 + Math.random() * 0.4;
  }
}
function updateSpray(dt) {
  for (let k = 0; k < SPRAY; k++) {
    if (sprayLife[k] <= 0) { sprayPos[k * 3 + 1] = -1e5; continue; }
    sprayLife[k] -= dt;
    sprayVel[k * 3 + 1] -= G * dt;
    for (let a = 0; a < 3; a++) sprayPos[k * 3 + a] += sprayVel[k * 3 + a] * dt;
  }
  sprayGeo.attributes.position.needsUpdate = true;
}

// ---------- input ----------
const K = {};
const MAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyQ: 'q', KeyE: 'e', ShiftLeft: 'grab', ShiftRight: 'grab', KeyG: 'grab', Space: 'jump',
};
addEventListener('keydown', e => {
  if (MAP[e.code]) { e.preventDefault(); if (!K[MAP[e.code]] && MAP[e.code] === 'jump') jumpDown(); K[MAP[e.code]] = true; }
  if (e.code === 'KeyR' && state !== 'menu' && state !== 'intro') startRun(true);
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) {
    if (state === 'menu') startRun(false);
    else if (state === 'results') startRun(true);
    else if (state === 'intro') skipIntro();
  }
});
addEventListener('keyup', e => {
  if (!MAP[e.code]) return;
  if (MAP[e.code] === 'jump') jumpUp();
  K[MAP[e.code]] = false;
});
addEventListener('blur', () => { for (const k in K) K[k] = false; if (state === 'play') togglePause(true); });
addEventListener('pointerdown', () => window.focus());

// ---------- player state ----------
const P = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), speed: 0, hd: 0, mode: 'ground', lastVy: 0, sw: false,
  spin: 0, flip: 0, roll: 0, spinV: 0, flipV: 0, rollV: 0, air: 0, airYaw: 0, grabT: 0, grabName: '', takeoffSw: false,
  charge: 0, charging: false, absorb: 0, rail: null, railT: 0, bal: 0, crashT: 0, tumble: new THREE.Vector3(), tumbleV: new THREE.Vector3(),
  steer: 0,
};
let state = 'menu', paused = false, score = 0, combo = 0, comboT = 0, runTime = 0, finishT = 0, introT = 0, cdT = 0, bestTrick = { name: '', pts: 0 };
const GRABS = ['Mute', 'Japan', 'Safety', 'Tail', 'Truck Driver', 'Blunt', 'Critical', 'Octo'];
const BEST_KEY = 'rail4_best';
const getBest = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } };

function resetRider() {
  P.pos.set(0, base(4), 4); P.vel.set(0, 0, 0); P.speed = 0; P.hd = 0; P.mode = 'ground'; P.sw = false; P.lastVy = 0;
  P.spin = P.flip = P.roll = 0; P.charge = 0; P.charging = false; P.absorb = 0; P.rail = null;
}

function jumpDown() { if (state === 'play' && (P.mode === 'ground' || P.mode === 'grind')) { P.charging = true; P.charge = 0; } }
function jumpUp() {
  if (state !== 'play' || !P.charging) return;
  P.charging = false;
  if (P.mode === 'ground') takeOff(P.lastVy + 3.6 + P.charge * 3.2);
  else if (P.mode === 'grind') { endGrind(); takeOff(-SL * P.speed + 3.8 + P.charge * 2); }
  P.charge = 0;
}

function takeOff(vy) {
  P.mode = 'air';
  P.vel.set(Math.sin(P.hd) * P.speed, vy, Math.cos(P.hd) * P.speed);
  P.spin = P.flip = P.roll = 0; P.spinV = P.flipV = P.rollV = 0;
  P.air = 0; P.grabT = 0; P.grabName = ''; P.takeoffSw = P.sw;
  P.airYaw = P.hd + (P.sw ? Math.PI : 0);
}

const wrapDist = (a, m) => { a = ((a % m) + m) % m; return Math.min(a, m - a); };
const upright = () => wrapDist(P.flip, TAU) < 0.95 && wrapDist(P.roll, TAU) < 0.95 && wrapDist(P.spin, Math.PI) < 1.1;

function trick() {
  const spinDeg = Math.round(Math.abs(P.spin) / Math.PI) * 180;
  const flips = Math.round(Math.abs(P.flip) / TAU), rolls = Math.round(Math.abs(P.roll) / TAU);
  const times = n => n === 2 ? 'Double ' : n === 3 ? 'Triple ' : n > 3 ? n + 'x ' : '';
  let name = '';
  if (rolls && spinDeg >= 360) name = times(rolls) + 'Cork ' + spinDeg;
  else if (rolls) name = times(rolls) + 'Sideflip' + (spinDeg ? ' ' + spinDeg : '');
  else if (flips && spinDeg >= 360) name = times(flips) + (P.flip > 0 ? 'Misty ' : 'Rodeo ') + spinDeg;
  else if (flips) name = times(flips) + (P.flip > 0 ? 'Frontflip' : 'Backflip') + (spinDeg ? ' ' + spinDeg : '');
  else if (spinDeg >= 180) name = (P.spin > 0 ? 'Left ' : 'Right ') + spinDeg;
  const grabbed = P.grabT > 0.25;
  if (grabbed) name = name ? name + ' ' + P.grabName : P.grabName + ' Grab';
  if (!name && P.air < 0.6) return null;
  if (!name) name = P.air > 1.2 ? 'Big Air' : 'Air';
  if (P.takeoffSw) name = 'Switch ' + name;
  const pts = Math.round((P.air * 80 + spinDeg * 1.4 + flips * 450 + rolls * 650 + Math.min(P.grabT, 2) * 260) * (P.takeoffSw ? 1.2 : 1));
  return { name, pts };
}

function addTrick(t) {
  if (!t || t.pts <= 0) return;
  combo = comboT > 0 ? combo + 1 : 1; comboT = 3.2;
  const mult = 1 + (combo - 1) * 0.25;
  const pts = Math.round(t.pts * mult);
  score += pts;
  if (pts > bestTrick.pts) bestTrick = { name: t.name, pts };
  popup(t.name, '+' + pts + (combo > 1 ? `  ×${mult.toFixed(2)}` : ''), false);
}

function land(h) {
  const n = groundNormal(P.pos.x, P.pos.z);
  const impact = P.vel.dot(n);
  if (!upright() || impact < -18) { crash(); return; }
  const s = ((P.spin % TAU) + TAU) % TAU;
  if (s > Math.PI / 2 && s < Math.PI * 1.5) P.sw = !P.sw;
  P.speed = Math.hypot(P.vel.x, P.vel.z) * 0.96;
  P.hd = clamp(Math.atan2(P.vel.x, P.vel.z), -1.3, 1.3);
  P.pos.y = h; P.mode = 'ground'; P.lastVy = -SL * Math.cos(P.hd) * P.speed;
  P.absorb = clamp(-impact / 12, 0.25, 1);
  addTrick(trick());
  P.spin = P.flip = P.roll = 0;
  emitSpray(P.pos, new THREE.Vector3(Math.sin(P.hd), 0, Math.cos(P.hd)), 26, 3);
}

function crash() {
  P.mode = 'crash'; P.crashT = 1.6; combo = 0; comboT = 0;
  P.speed = Math.hypot(P.vel.x, P.vel.z) * 0.55;
  if (P.vel.x || P.vel.z) P.hd = Math.atan2(P.vel.x, P.vel.z);
  P.pos.y = ground(P.pos.x, P.pos.z);
  P.tumble.set(P.flip, P.airYaw + P.spin, P.roll);
  P.tumbleV.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14);
  P.rail = null; P.charging = false;
  popup('BAIL', 'combo lost', true);
  emitSpray(P.pos, new THREE.Vector3(Math.sin(P.hd), 0, Math.cos(P.hd)), 40, 4);
}

function startGrind(r, fromAir) {
  if (fromAir) addTrick(trick());
  P.mode = 'grind'; P.rail = r; P.railT = 0; P.bal = (Math.random() - 0.5) * 0.25;
  P.speed = Math.max(5, fromAir ? Math.hypot(P.vel.x, P.vel.z) : P.speed);
  P.hd = 0; P.spin = P.flip = P.roll = 0; P.sw = false;
}
function endGrind() {
  const r = P.rail; if (!r) return;
  if (P.railT > 0.3) {
    const kind = r.type === 'box' ? 'Box Slide' : 'Rail Slide';
    addTrick({ name: (P.railT > 1.4 ? 'Long ' : '') + kind, pts: Math.round(P.railT * 230) });
  }
  P.rail = null;
}

// ---------- physics ----------
function stepGround(dt) {
  const steer = (K.left ? 1 : 0) - (K.right ? 1 : 0);
  P.steer += (steer - P.steer) * Math.min(1, dt * 8);
  P.hd = clamp(P.hd + steer * 1.75 * dt, -1.35, 1.35);
  let a = G * SIN_T * Math.cos(P.hd) - (K.up ? 0.0031 : 0.0058) * P.speed * P.speed - 0.25 - Math.abs(steer) * 0.7;
  if (K.down) a -= 8;
  P.speed = Math.max(0, P.speed + a * dt);

  const oldAdd = kickerAdd(P.pos.x, P.pos.z);
  let nx = P.pos.x + Math.sin(P.hd) * P.speed * dt, nz = P.pos.z + Math.cos(P.hd) * P.speed * dt;
  if (Math.abs(nx) > HALF_W - 1) { nx = Math.sign(nx) * (HALF_W - 1); P.hd *= 0.4; P.speed *= 0.985; }
  const newAdd = kickerAdd(nx, nz);
  if (newAdd > oldAdd) P.speed = Math.sqrt(Math.max(1, P.speed * P.speed - 2 * G * (newAdd - oldAdd)));
  const hNew = base(nz) + newAdd;
  const predicted = P.pos.y + P.lastVy * dt;
  if (oldAdd > 0.2 && hNew < predicted - 0.12) {      // off the lip (or the side) of a kicker
    P.pos.set(nx, predicted, nz);
    takeOff(P.lastVy + 0.6);
    return;
  }
  P.lastVy = (hNew - P.pos.y) / dt;
  P.pos.set(nx, hNew, nz);

  for (const r of rails) {        // ride straight onto the low end of a rail or box
    if (nz >= r.z1 && nz <= r.z1 + 1.6 && Math.abs(nx - r.x) < r.w / 2 + 0.3 && railTop(r, nz) - hNew < 0.45) { startGrind(r, false); return; }
  }
  if ((Math.abs(steer) || K.down) && P.speed > 6 && Math.random() < 0.6) {
    const side = new THREE.Vector3(Math.cos(P.hd) * -steer, 0, Math.sin(P.hd) * steer);
    emitSpray(P.pos, K.down ? new THREE.Vector3(Math.sin(P.hd), 0, Math.cos(P.hd)) : side, 1, 3);
  }
}

function stepAir(dt) {
  const ease = (v, t) => v + (t - v) * Math.min(1, dt * (t ? 7 : 10));
  P.spinV = ease(P.spinV, ((K.left ? 1 : 0) - (K.right ? 1 : 0)) * 7.6);
  P.flipV = ease(P.flipV, ((K.up ? 1 : 0) - (K.down ? 1 : 0)) * 6.3);
  P.rollV = ease(P.rollV, ((K.q ? 1 : 0) - (K.e ? 1 : 0)) * 6.3);
  P.spin += P.spinV * dt; P.flip += P.flipV * dt; P.roll += P.rollV * dt;
  if (K.grab) { if (!P.grabName) P.grabName = GRABS[Math.floor(Math.random() * GRABS.length)]; P.grabT += dt; }

  P.vel.y -= G * dt;
  P.pos.addScaledVector(P.vel, dt);
  P.air += dt;
  if (Math.abs(P.pos.x) > HALF_W - 1) { P.pos.x = Math.sign(P.pos.x) * (HALF_W - 1); P.vel.x *= -0.3; }

  if (P.vel.y <= 0) {
    for (const r of rails) {
      if (P.pos.z < r.z1 || P.pos.z > r.z2 || Math.abs(P.pos.x - r.x) > r.w / 2 + 0.4) continue;
      const top = railTop(r, P.pos.z);
      if (P.pos.y <= top + 0.12 && P.pos.y >= top - 0.7) {
        if (upright()) { P.pos.y = top; startGrind(r, true); } else crash();
        return;
      }
    }
  }
  const h = ground(P.pos.x, P.pos.z);
  if (P.pos.y <= h) land(h);
}

function stepGrind(dt) {
  const r = P.rail;
  P.speed = Math.max(2.5, P.speed + (G * SIN_T - 0.6 - 0.002 * P.speed * P.speed) * dt);
  P.pos.z += P.speed * dt;
  P.pos.x += (r.x - P.pos.x) * Math.min(1, dt * 14);
  P.bal += (P.bal * 1.3 + (Math.random() - 0.5) * 1.8) * dt;
  P.bal += ((K.left ? 1 : 0) - (K.right ? 1 : 0)) * 2.1 * dt;
  P.railT += dt;
  if (Math.abs(P.bal) > 1) {
    const side = Math.sign(P.bal);
    endGrind(); takeOff(-SL * P.speed); P.vel.x = side * 3;
    return;
  }
  if (P.pos.z > r.z2) { endGrind(); takeOff(-SL * P.speed + 0.8); return; }
  P.pos.y = railTop(r, P.pos.z);
  P.lastVy = -SL * P.speed;
  if (Math.random() < 0.35) emitSpray(P.pos, new THREE.Vector3(0, 0, 1), 1, 1);
}

function stepCrash(dt) {
  P.speed = Math.max(0, P.speed - 9 * dt);
  P.pos.x = clamp(P.pos.x + Math.sin(P.hd) * P.speed * dt, -HALF_W + 1, HALF_W - 1);
  P.pos.z += Math.cos(P.hd) * P.speed * dt;
  P.pos.y = ground(P.pos.x, P.pos.z);
  P.tumble.addScaledVector(P.tumbleV, dt);
  P.tumbleV.multiplyScalar(Math.max(0, 1 - dt * 2.2));
  P.crashT -= dt;
  if (P.crashT <= 0) {
    P.mode = 'ground'; P.speed = 5; P.hd = 0; P.sw = false; P.spin = P.flip = P.roll = 0;
    P.pos.y = ground(P.pos.x, P.pos.z); P.lastVy = -SL * P.speed;
  }
}

function physics(dt) {
  if (P.charging) P.charge = Math.min(0.6, P.charge + dt);
  P.absorb = Math.max(0, P.absorb - dt * 2.2);
  if (P.mode === 'ground') stepGround(dt);
  else if (P.mode === 'air') stepAir(dt);
  else if (P.mode === 'grind') stepGrind(dt);
  else if (P.mode === 'crash') stepCrash(dt);
}

// ---------- visuals ----------
const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qT = new THREE.Quaternion();
const vN = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
const tmpE = new THREE.Euler();
function riderPose(dt) {
  rider.root.position.copy(P.pos);
  const target = qT;
  if (P.mode === 'ground' || state === 'menu' || P.mode === 'finish') {
    groundNormal(P.pos.x, P.pos.z, vN);
    target.setFromUnitVectors(UP, vN);
    target.multiply(qA.setFromAxisAngle(UP, P.hd + (P.sw ? Math.PI : 0)));
    target.multiply(qB.setFromAxisAngle(Z, -P.steer * 0.32 * (P.sw ? -1 : 1)));
  } else if (P.mode === 'air') {
    target.setFromAxisAngle(UP, P.airYaw + P.spin);
    target.multiply(qA.setFromAxisAngle(X, P.flip));
    target.multiply(qB.setFromAxisAngle(Z, P.roll));
  } else if (P.mode === 'grind') {
    groundNormal(P.pos.x, P.pos.z, vN).set(0, 1, SL).normalize();
    target.setFromUnitVectors(UP, vN);
    target.multiply(qA.setFromAxisAngle(UP, Math.PI / 2));
    target.multiply(qB.setFromAxisAngle(Z, P.bal * 0.5));
  } else if (P.mode === 'crash') {
    target.setFromEuler(tmpE.set(P.tumble.x, P.tumble.y, P.tumble.z));
  }
  rider.pivot.quaternion.slerp(target, Math.min(1, dt * (P.mode === 'air' ? 30 : 14)));

  let crouch = K.up && P.mode === 'ground' ? 0.55 : 0.15;
  if (P.charging) crouch = 0.35 + P.charge;
  if (P.mode === 'air' && K.grab) crouch = 0.95;
  if (P.mode === 'grind') crouch = 0.35;
  crouch = Math.max(crouch, P.absorb);
  rider.legs.scale.y += ((1 - crouch * 0.32) - rider.legs.scale.y) * Math.min(1, dt * 12);
  rider.torso.position.y = 0.3 + 0.56 * rider.legs.scale.y;
  rider.torso.rotation.x += (crouch * 0.45 - rider.torso.rotation.x) * Math.min(1, dt * 12);
  const grabbing = P.mode === 'air' && K.grab;
  rider.arms[1].rotation.x += ((grabbing ? 0.9 : -0.35) - rider.arms[1].rotation.x) * Math.min(1, dt * 14);
  rider.arms[0].rotation.z += ((grabbing ? -1.1 : -0.25) - rider.arms[0].rotation.z) * Math.min(1, dt * 14);
  rider.arms[0].rotation.x = P.mode === 'grind' ? -0.2 + P.bal : -0.35;
}


// ---------- time of day + weather ----------
const TIMES = {
  dawn:   { label: 'Dawn',   top: '#3b4a8a', mid: '#f6c1d0', low: '#ffe6c4', hs: '#d9dcff', hg: '#9a8aa0', hi: 1.5, sc: '#ffc9b0', si: 2.2, dir: [-60, 35, 140], disc: '#fff0dc', night: false },
  day:    { label: 'Day',    top: '#2a6fd6', mid: '#bfe0ff', low: '#eef6ff', hs: '#e2f1ff', hg: '#a3abc4', hi: 1.8, sc: '#fff6e6', si: 3.0, dir: [-40, 120, 50], disc: '#fffbe8', night: false },
  sunset: { label: 'Sunset', top: '#29295f', mid: '#f4b3a4', low: '#ffe0b0', hs: '#cfd6ff', hg: '#8a6f8f', hi: 1.6, sc: '#ffd3a6', si: 2.6, dir: [-70, 90, 60], disc: '#fff0c8', night: false },
  night:  { label: 'Night',  top: '#04061a', mid: '#1b2452', low: '#28305e', hs: '#7486d0', hg: '#1e2036', hi: 0.9, sc: '#b8c8ff', si: 0.8, dir: [50, 100, 80], disc: '#e9eeff', night: true },
};
const WEATHERS = {
  clear:    { label: 'Clear',    flakes: 0,    fall: 0,   wind: 0,  near: 80, far: 480, grey: 0 },
  snow:     { label: 'Snow',     flakes: 1600, fall: 2.2, wind: 1,  near: 50, far: 320, grey: 0.45 },
  blizzard: { label: 'Blizzard', flakes: 4000, fall: 4,   wind: 11, near: 12, far: 130, grey: 0.7 },
  fog:      { label: 'Fog',      flakes: 0,    fall: 0,   wind: 0,  near: 8,  far: 120, grey: 0.6 },
};
const env = { time: 'sunset', weather: 'clear', wind: 0 };
const OVERCAST = new THREE.Color('#a7adbd'), OVERCAST_NIGHT = new THREE.Color('#1c2030');

// stars (night only)
const stars = (() => {
  const n = 900, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * TAU, v = 0.08 + Math.random() * 0.92, r = 1600;
    const c = Math.sqrt(1 - v * v);
    p.set([Math.cos(u) * c * r, v * r, Math.sin(u) * c * r], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
  m.visible = false; scene.add(m); return m;
})();
const headlamp = new THREE.PointLight('#cfe0ff', 0, 28, 1.6);
scene.add(headlamp);

// falling snow
const FLAKES = 4000;
const flakeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const flakePos = new Float32Array(FLAKES * 3), flakeSeed = new Float32Array(FLAKES);
for (let i = 0; i < FLAKES; i++) { flakePos.set([(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60], i * 3); flakeSeed[i] = Math.random(); }
const flakeGeo = new THREE.BufferGeometry(); flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ size: 0.16, map: flakeTex, transparent: true, depthWrite: false, color: '#ffffff' }));
flakes.frustumCulled = false; flakes.visible = false; scene.add(flakes);
function updateFlakes(dt) {
  const w = WEATHERS[env.weather];
  if (!w.flakes) return;
  const c = camera.position, t = performance.now() / 1000;
  for (let i = 0; i < w.flakes; i++) {
    const k = i * 3, sd = flakeSeed[i];
    flakePos[k] += (env.wind + Math.sin(t * 1.3 + sd * 20) * 0.6) * dt;
    flakePos[k + 1] -= w.fall * (0.7 + sd * 0.6) * dt;
    flakePos[k + 2] += Math.cos(t + sd * 30) * 0.4 * dt;
    // keep every flake in a 60 x 30 x 60 box around the camera
    for (const [a, half] of [[0, 30], [1, 15], [2, 30]]) {
      const rel = flakePos[k + a] - c.getComponent(a);
      if (rel > half) flakePos[k + a] -= half * 2; else if (rel < -half) flakePos[k + a] += half * 2;
    }
  }
  flakeGeo.attributes.position.needsUpdate = true;
}

function applyEnv(time, weather) {
  env.time = time; env.weather = weather;
  const T = TIMES[time], W = WEATHERS[weather];
  const grey = T.night ? OVERCAST_NIGHT : OVERCAST;
  const col = h => new THREE.Color(h).lerp(grey, W.grey);
  const u = sky.material.uniforms;
  u.top.value.copy(col(T.top)); u.mid.value.copy(col(T.mid)); u.low.value.copy(col(T.low));
  scene.fog.color.copy(u.mid.value); scene.fog.near = W.near; scene.fog.far = W.far;
  hemi.color.set(T.hs); hemi.groundColor.set(T.hg); hemi.intensity = T.hi * (W.grey ? 1.1 : 1);
  sunLight.color.set(T.sc); sunLight.intensity = T.si * (1 - W.grey * 0.6);
  SUN_OFF.set(...T.dir);
  sun.material.color.set(T.disc); sun.scale.setScalar(T.night ? 0.6 : 1);
  sun.visible = W.grey < 0.5;
  stars.visible = T.night && W.grey < 0.5;
  headlamp.intensity = T.night ? 14 : 0;
  flakes.visible = W.flakes > 0;
  flakeGeo.setDrawRange(0, W.flakes);
  flakes.material.size = weather === 'blizzard' ? 0.13 : 0.17;
  env.wind = W.wind * (Math.random() < 0.5 ? -1 : 1);
  renderer.toneMappingExposure = T.night ? 1.25 : 1;
  try { localStorage.setItem('rail4_env', JSON.stringify(choice)); } catch (e) { }
}

// menu choices ("random" picks a new one every run)
let choice = { time: 'sunset', weather: 'clear' };
try { Object.assign(choice, JSON.parse(localStorage.getItem('rail4_env') || '{}')); } catch (e) { }
const pick = (key, table) => choice[key] === 'random' ? Object.keys(table)[Math.floor(Math.random() * Object.keys(table).length)] : (table[choice[key]] ? choice[key] : Object.keys(table)[0]);
function applyChoice() { applyEnv(pick('time', TIMES), pick('weather', WEATHERS)); }
function buildChips(id, key, table) {
  const box = document.getElementById(id);
  const opts = [...Object.entries(table).map(([k, v]) => [k, v.label]), ['random', 'Random']];
  for (const [k, label] of opts) {
    const b = document.createElement('button');
    b.className = 'chip'; b.textContent = label; b.dataset.k = k;
    b.onclick = () => { choice[key] = k; refreshChips(); applyChoice(); };
    box.appendChild(b);
  }
}
function refreshChips() {
  for (const [id, key] of [['timeChips', 'time'], ['weatherChips', 'weather']])
    for (const b of document.getElementById(id).children) b.classList.toggle('on', b.dataset.k === choice[key]);
}

// ---------- camera + cutscenes ----------
const camDir = new THREE.Vector3(0, 0, 1), camPos = new THREE.Vector3(), lookAt = new THREE.Vector3();
let menuAng = 0, orbitAng = 0;
const INTRO_LEN = 6.5;
let introCurve, introLook;
function buildIntro() {
  // a flyover from far down the park, past the features, ending right behind the rider
  const P0 = P.pos;
  const pts = [
    new THREE.Vector3(34, base(430) + 46, 430),
    new THREE.Vector3(-26, base(250) + 26, 250),
    new THREE.Vector3(14, base(110) + 12, 110),
    new THREE.Vector3(6, base(30) + 6, 30),
    new THREE.Vector3(P0.x, P0.y + 3.1, P0.z - 7.2),
  ];
  const look = [
    new THREE.Vector3(0, base(330), 330),
    new THREE.Vector3(0, base(170), 170),
    new THREE.Vector3(0, base(60), 60),
    new THREE.Vector3(P0.x, P0.y + 1, P0.z),
    new THREE.Vector3(P0.x, P0.y + 0.9, P0.z + 5),
  ];
  introCurve = new THREE.CatmullRomCurve3(pts);
  introLook = new THREE.CatmullRomCurve3(look);
}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function updateCamera(dt) {
  if (state === 'menu') {
    menuAng += dt * 0.35;
    const a = Math.sin(menuAng) * 0.7;
    camera.position.set(P.pos.x + Math.sin(a) * 6.5, P.pos.y + 1.6, P.pos.z + Math.cos(a) * 6.5);
    camera.lookAt(P.pos.x, P.pos.y + 1.6, P.pos.z - 2);
    return;
  }
  if (state === 'intro') {
    const u = ease(clamp(introT / INTRO_LEN, 0, 1));
    camera.position.copy(introCurve.getPoint(u));
    camera.lookAt(introLook.getPoint(u));
    camera.fov = 64; camera.updateProjectionMatrix();
    return;
  }
  if (state === 'finishing' || state === 'results') {
    orbitAng += dt * 0.55;
    camPos.set(P.pos.x + Math.sin(orbitAng) * 6, P.pos.y + 1.8, P.pos.z + Math.cos(orbitAng) * 6);
    camera.position.lerp(camPos, 1 - Math.exp(-dt * 3));
    camera.lookAt(P.pos.x, P.pos.y + 1, P.pos.z);
    camera.fov += (55 - camera.fov) * Math.min(1, dt * 2); camera.updateProjectionMatrix();
    return;
  }
  let dx = 0, dz = 1;
  if (P.mode === 'air' || P.mode === 'crash') { dx = P.vel.x; dz = Math.max(0.5, P.vel.z); }
  else { dx = Math.sin(P.hd); dz = Math.cos(P.hd); }
  const d = new THREE.Vector3(dx, 0, dz).normalize();
  d.x *= 0.6; d.normalize();
  camDir.lerp(d, 1 - Math.exp(-dt * 3)).normalize();
  const dist = 7.2 + Math.min(P.speed, 30) * 0.05;
  camPos.set(P.pos.x - camDir.x * dist, P.pos.y + 3.1, P.pos.z - camDir.z * dist);
  camPos.y = Math.max(camPos.y, ground(camPos.x, camPos.z) + 1.4);
  camera.position.lerp(camPos, 1 - Math.exp(-dt * 6));
  lookAt.set(P.pos.x + camDir.x * 5, P.pos.y + 0.9, P.pos.z + camDir.z * 5);
  camera.lookAt(lookAt);
  camera.fov += ((64 + Math.min(P.speed, 30) * 0.35) - camera.fov) * Math.min(1, dt * 2);
  camera.updateProjectionMatrix();
}

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const hud = { score: $('score'), combo: $('combo'), time: $('time'), speed: $('speed'), prog: $('progFill'), bal: $('bal'), balDot: $('balDot'), trick: $('trick'), trickName: $('trickName'), trickPts: $('trickPts') };
let popTimer = 0;
function popup(name, pts, bad) {
  hud.trickName.textContent = name; hud.trickPts.textContent = pts;
  hud.trick.classList.toggle('bad', !!bad);
  hud.trick.classList.remove('show'); void hud.trick.offsetWidth; hud.trick.classList.add('show');
  popTimer = 1.8;
}
const fmtTime = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + s.toFixed(2).padStart(5, '0'); };
function updateHud(dt) {
  hud.score.textContent = score.toLocaleString();
  hud.combo.textContent = combo > 1 && comboT > 0 ? `combo ×${(1 + (combo - 1) * 0.25).toFixed(2)}` : '';
  hud.time.textContent = fmtTime(runTime);
  const sp = P.mode === 'air' ? Math.hypot(P.vel.x, P.vel.z) : P.speed;
  hud.speed.textContent = Math.round(sp * 3.6) + ' km/h';
  hud.prog.style.width = clamp(P.pos.z / LEN, 0, 1) * 100 + '%';
  hud.bal.style.display = P.mode === 'grind' ? 'block' : 'none';
  hud.balDot.style.left = 50 - clamp(P.bal, -1, 1) * 48 + '%';
  if (popTimer > 0 && (popTimer -= dt) <= 0) hud.trick.classList.remove('show');
}
function cine(on, title = '', sub = '', skippable = false) {
  $('cine').classList.toggle('on', on);
  $('skip').style.display = skippable ? '' : 'none';
  $('cineTitle').textContent = title; $('cineSub').textContent = sub;
}
let cdShown = '';
function countdownText(t) {
  const txt = t > 2 ? '3' : t > 1 ? '2' : t > 0 ? '1' : 'DROP!';
  if (txt !== cdShown) {
    cdShown = txt; const el = $('count');
    el.textContent = txt; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
}

// ---------- game flow ----------
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function startRun(skipCutscene) {
  resetRider(); score = 0; combo = 0; comboT = 0; runTime = 0; bestTrick = { name: '', pts: 0 };
  paused = false;
  applyChoice();
  show('menu', false); show('results', false); show('pause', false); show('hud', false);
  camDir.set(0, 0, 1);
  if (skipCutscene) beginCountdown();
  else {
    state = 'intro'; introT = 0; buildIntro();
    cine(true, 'RAIL4', `${TIMES[env.time].label} · ${WEATHERS[env.weather].label}`, true);
  }
  window.focus();
}
function skipIntro() { if (state === 'intro') beginCountdown(); }
function beginCountdown() {
  state = 'countdown'; cdT = 3; cdShown = '';
  cine(false); show('hud', true);
  camera.position.set(P.pos.x, P.pos.y + 3.1, P.pos.z - 7.2);
}
function togglePause(force) {
  if (state !== 'play') return;
  paused = force === true ? true : !paused;
  show('pause', paused);
}
function beginFinish() {
  state = 'finishing'; finishT = 3.4; P.mode = 'ground';
  orbitAng = Math.atan2(camera.position.x - P.pos.x, camera.position.z - P.pos.z);
  if (camera.position.distanceTo(P.pos) > 14) camera.position.set(P.pos.x, P.pos.y + 3, P.pos.z - 7);
  show('hud', false);
  cine(true, 'FINISH', `${score.toLocaleString()} pts · ${fmtTime(runTime)}`);
}
function finish() {
  state = 'results';
  cine(false);
  const best = getBest(), newBest = score > best;
  if (newBest) try { localStorage.setItem(BEST_KEY, String(score)); } catch (e) { }
  $('rScore').textContent = score.toLocaleString();
  $('rTime').textContent = fmtTime(runTime);
  $('rTrick').textContent = bestTrick.name ? `${bestTrick.name} (+${bestTrick.pts})` : '—';
  $('rBest').textContent = (newBest ? score : best).toLocaleString();
  $('rNew').style.display = newBest ? 'block' : 'none';
  $('menuBest').textContent = (newBest ? score : best).toLocaleString();
  show('results', true);
}
$('dropIn').onclick = () => startRun(false);
$('again').onclick = () => startRun(true);
$('toMenu').onclick = () => { state = 'menu'; resetRider(); show('results', false); show('menu', true); };
$('resume').onclick = () => togglePause();
$('cine').onclick = skipIntro;
$('menuBest').textContent = getBest().toLocaleString();
buildChips('timeChips', 'time', TIMES);
buildChips('weatherChips', 'weather', WEATHERS);
refreshChips();
applyChoice();

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});
document.addEventListener('fullscreenchange', () => dispatchEvent(new Event('resize')));

// ---------- main loop ----------
resetRider();
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused) {
    if (state === 'play') {
      const n = 4;
      for (let i = 0; i < n; i++) physics(dt / n);
      if (P.mode === 'air' && env.wind) P.vel.x += env.wind * 0.06 * dt;   // blizzard wind nudges you in the air
      runTime += dt;
      if (comboT > 0) comboT -= dt;
      if (P.pos.z > LEN && P.mode !== 'air') beginFinish();
    } else if (state === 'intro') {
      introT += dt;
      if (introT >= INTRO_LEN) beginCountdown();
    } else if (state === 'countdown') {
      cdT -= dt;
      countdownText(cdT);
      if (cdT <= -0.6) { state = 'play'; P.speed = 7; $('count').classList.remove('pop'); }
    } else if (state === 'finishing' || state === 'results') {
      const slow = state === 'finishing' ? 0.45 : 1;          // slow-motion finish
      P.speed = Math.max(0, P.speed - 9 * dt);
      P.pos.z += P.speed * dt * slow; P.pos.y = ground(P.pos.x, P.pos.z);
      if (P.speed > 4 && Math.random() < 0.5) emitSpray(P.pos, new THREE.Vector3(0, 0, 1), 2, 3);
      if (state === 'finishing' && (finishT -= dt) <= 0) finish();
    }
    riderPose(dt);
    updateSpray(dt);
    updateCamera(dt);
    updateFlakes(dt);
    updateHud(dt);
  }
  sunLight.position.copy(P.pos).add(SUN_OFF);
  sunLight.target.position.copy(P.pos);
  headlamp.position.set(P.pos.x, P.pos.y + 2.5, P.pos.z + 2);
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
  sun.position.copy(camera.position).addScaledVector(SUN_OFF.clone().normalize(), 1500);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.__rail4 = { P, K, get state() { return state; }, get score() { return score; }, startRun, skipIntro, applyEnv, kickers, rails, ground };
