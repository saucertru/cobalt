// Rail4: an original 3D freeski park game for cobalt.
// Uses three.js (MIT), vendored next to this file.
import * as THREE from 'three';

// ---------- world constants ----------
const SL = 0.32;                 // slope: metres dropped per metre travelled
const G = 9.8;
const HALF_W = 40;               // half width of the groomed course
const TAU = Math.PI * 2;
const SIN_T = SL / Math.hypot(1, SL);
const base = z => -SL * z;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let seed = 4;   // reset per map
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- maps + course layout (fixed per map, so scores are fair) ----------
let LEN = 1200;                  // course length of the current map (metres)
const kickers = [], rails = [];
const KS = {
  S: { w: 6, len: 5, hgt: 1.2 }, M: { w: 7, len: 7, hgt: 2.0 },
  L: { w: 8, len: 9, hgt: 2.9 }, XL: { w: 10, len: 12, hgt: 3.8 }, XXL: { w: 12, len: 15, hgt: 5 },
};
const addKicker = (s, x, z) => kickers.push({ ...KS[s], x, z, size: s });
const addRoller = (x, z, w = 14, len = 9, hgt = 1.3) => kickers.push({ x, z, w, len, hgt, size: 'roller', roller: true });
const obstacles = [];
const addRail = (type, x, z, len) => rails.push({
  type, x, z1: z, z2: z + len, w: type === 'box' ? 0.7 : 0.12,
  hMin: type === 'box' ? 0.2 : 0.25, hMax: type === 'box' ? 0.6 : 0.9,
});
const jit = (n = 6) => (rnd() - 0.5) * n;

const MAPS = {
  park: {
    label: 'Sunset Park', obstacles: 0.32, len: 1200, seed: 4, pines: 900, villages: [[-10, 1], [-10, -1], [1210, 1]], lift: false,
    gen() {
      for (let i = 0, z = 70; z < LEN - 90; i++, z += 58) {
        switch (i % 5) {
          case 0: addKicker('S', -16 + jit(), z); addKicker('M', jit(), z + 2); addKicker('L', 16 + jit(), z + 4); break;
          case 1: addRail('rail', -12 + jit(), z, 14 + rnd() * 6); addRail('box', 9 + jit(), z + 3, 12 + rnd() * 6); break;
          case 2: addKicker('M', -11 + jit(), z); addKicker('L', 12 + jit(), z + 3); break;
          case 3: addRail('box', jit(3), z, 18 + rnd() * 6); addRail('rail', -19 + jit(3), z + 4, 12); addRail('rail', 19 + jit(3), z + 4, 12); break;
          case 4: addKicker('XL', jit(3), z); addKicker('S', -24 + jit(3), z + 4); addKicker('S', 24 + jit(3), z + 4); break;
        }
      }
    },
  },
  village: {
    label: 'Pine Village', obstacles: 0.42, len: 1300, seed: 11, pines: 1300, lift: true,
    villages: [[-10, 1], [-10, -1], [330, 1], [460, -1], [760, 1], [900, -1], [1310, 1], [1310, -1]],
    gen() {
      for (let i = 0, z = 60; z < LEN - 90; i++, z += 64) {
        switch (i % 4) {
          case 0: addKicker('S', -10 + jit(), z); addKicker('M', 11 + jit(), z + 3); break;
          case 1: addRail('rail', jit(4), z, 16 + rnd() * 8); addRail('box', -17 + jit(3), z + 2, 12); addRail('box', 17 + jit(3), z + 2, 12); break;
          case 2: addKicker('L', jit(4), z); addKicker('S', -22 + jit(3), z + 6); addKicker('S', 22 + jit(3), z + 6); break;
          case 3: addKicker('M', -14 + jit(), z); addRail('rail', 12 + jit(), z, 22); break;
        }
      }
    },
  },
  bigair: {
    label: 'Big Air', obstacles: 0.25, len: 950, seed: 23, pines: 1000, villages: [[-10, 1], [960, -1]], lift: true,
    gen() {
      for (let i = 0, z = 90; z < LEN - 110; i++, z += 105) {
        addKicker(i % 2 ? 'XL' : 'XXL', jit(4), z);
        addKicker('M', -24 + jit(3), z + 10); addKicker('M', 24 + jit(3), z + 10);
        if (i % 2) { addRail('rail', -30 + jit(2), z + 40, 16); addRail('rail', 30 + jit(2), z + 40, 16); }
      }
    },
  },
  rails: {
    label: 'Rail Garden', obstacles: 0.3, len: 1000, seed: 37, pines: 1000, villages: [[-10, -1], [480, 1], [1010, 1]], lift: false,
    gen() {
      for (let i = 0, z = 55; z < LEN - 80; i++, z += 46) {
        switch (i % 4) {
          case 0: addRail('rail', jit(3), z, 28); addRail('box', -14 + jit(2), z + 4, 14); addRail('box', 14 + jit(2), z + 4, 14); break;
          case 1: for (const x of [-27, -9, 9, 27]) addRail(rnd() < 0.5 ? 'rail' : 'box', x + jit(2), z + rnd() * 6, 10 + rnd() * 6); break;
          case 2: addKicker('S', jit(4), z); addRail('rail', -20 + jit(3), z, 20); addRail('rail', 20 + jit(3), z, 20); break;
          case 3: addRail('box', -6 + jit(2), z, 22); addRail('box', 6 + jit(2), z + 6, 22); addKicker('M', -26 + jit(2), z + 4); break;
        }
      }
    },
  },
};
let currentMap = '';

const prof = (k, t) => k.roller ? Math.sin(Math.PI * t) : Math.pow(t, 1.7);
function kickerAdd(x, z) {
  let a = 0;
  for (const k of kickers) {
    if (z < k.z || z > k.z + k.len || Math.abs(x - k.x) > k.w / 2) continue;
    a = Math.max(a, k.hgt * prof(k, (z - k.z) / k.len));
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
const terrain = (x, z) => base(z) + bank(x) + (Math.abs(x) > HALF_W + 4 ? Math.sin(x * 0.21) * Math.sin(z * 0.13) * 1.2 : 0);

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

// ---------- course building (rebuilt whenever the map changes) ----------
const snowMat = new THREE.MeshLambertMaterial({ color: '#f1f0ff', map: corduroy() });
const lipMat = new THREE.MeshLambertMaterial({ color: '#ff7a3d' });
const kickMat = new THREE.MeshLambertMaterial({ color: '#e7e8ff', map: snowMat.map, side: THREE.DoubleSide });
const railMat = new THREE.MeshStandardMaterial({ color: '#c8d2e6', metalness: 0.8, roughness: 0.3 });
const boxTopMat = new THREE.MeshStandardMaterial({ color: '#2f6fed', metalness: 0.3, roughness: 0.45 });
const postMat = new THREE.MeshLambertMaterial({ color: '#3a3f55' });
const woodMat = new THREE.MeshLambertMaterial({ color: '#7a4a2b' });
const darkWoodMat = new THREE.MeshLambertMaterial({ color: '#4a2c19' });
const stoneMat = new THREE.MeshLambertMaterial({ color: '#8d8a94', flatShading: true });
const roofMat = new THREE.MeshLambertMaterial({ color: '#f7f7ff' });
const glowMat = new THREE.MeshLambertMaterial({ color: '#ffd68a', emissive: '#ffb347', emissiveIntensity: 0.3 });
const whiteMat = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: false });
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
const course = new THREE.Group();
scene.add(course);
const lift = { chairs: null, cables: [], t: 0, len: 0, x: 0 };

function clearCourse() {
  course.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  course.clear();
  kickers.length = 0; rails.length = 0; obstacles.length = 0; lift.chairs = null;
}

// helper: many copies of one part, placed with matrices
function instanced(geo, mat, mats, { shadow = false, colors = null } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, mats.length));
  mats.forEach((mx, i) => { m.setMatrixAt(i, mx); if (colors) m.setColorAt(i, colors[i]); });
  m.count = mats.length; m.castShadow = shadow; m.receiveShadow = true;
  course.add(m);
  return m;
}
const M4 = () => new THREE.Matrix4();
const place = (x, y, z, ry = 0, s = 1) => M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(s, s, s));

function buildGround() {
  const W = 420, z0 = -160, L = LEN + 480, xs = 110, zs = Math.ceil(L / 8);
  const pos = [], uv = [], idx = [];
  for (let iz = 0; iz <= zs; iz++) {
    const z = z0 + iz * L / zs;
    for (let ix = 0; ix <= xs; ix++) {
      const x = -W / 2 + ix * W / xs;
      pos.push(x, terrain(x, z), z);
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
  course.add(m);
}

function buildKickers() {
  for (const k of kickers) {
    const N = 16, p = [];
    const L = k.x - k.w / 2, R = k.x + k.w / 2;
    const top = (t) => { const z = k.z + t * k.len; return [z, base(z) + k.hgt * prof(k, t)]; };
    const quad = (a, b, c, d) => p.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < N; i++) {
      const [z0, y0] = top(i / N), [z1, y1] = top((i + 1) / N);
      quad([L, y0, z0], [L, y1, z1], [R, y1, z1], [R, y0, z0]);
      quad([L, base(z0) - 0.1, z0], [L, base(z1) - 0.1, z1], [L, y1, z1], [L, y0, z0]);
      quad([R, y0, z0], [R, y1, z1], [R, base(z1) - 0.1, z1], [R, base(z0) - 0.1, z0]);
    }
    const [zl, yl] = top(1);
    if (!k.roller) quad([L, yl, zl], [R, yl, zl], [R, base(zl) - 0.1, zl], [L, base(zl) - 0.1, zl]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const uvs = []; for (let i = 0; i < p.length; i += 3) uvs.push(p[i] / 3, p[i + 2] / 3);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, kickMat); m.castShadow = m.receiveShadow = true;
    course.add(m);
    if (k.roller) continue;
    const lip = new THREE.Mesh(new THREE.BoxGeometry(k.w + 0.02, 0.1, 0.35), lipMat);
    lip.position.set(k.x, yl - 0.04, zl - 0.17); course.add(lip);
    for (const s of [-1, 1]) {
      const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), lipMat);
      flag.position.set(k.x + s * (k.w / 2 + 0.6), base(zl) + 0.8, zl); course.add(flag);
    }
  }
}

function buildRails() {
  const posts = [];
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
      m.castShadow = true; course.add(m);
    }
    for (let z = r.z1 + 1; z < r.z2; z += 2.5) {
      const h = railTop(r, z) - base(z);
      posts.push(M4().compose(new THREE.Vector3(r.x, base(z) + h / 2 - 0.05, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
    }
  }
  instanced(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), postMat, posts, { shadow: true });
}

// cosy chalets, grouped into little villages beside the run
function buildVillages(map, blocked) {
  const parts = { body: [], base: [], gable: [], roofL: [], roofR: [], chim: [], win: [], door: [], lampPost: [], lampBulb: [], fence: [] };
  const local = (cm, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    cm.clone().multiply(M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  for (const [zc, side] of map.villages) {
    const n = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const x = side * (HALF_W + 12 + (i % 3) * 13 + jit(4));
      const z = zc + (Math.floor(i / 3) - 1) * 16 + jit(5);
      const w = 6 + rnd() * 3, d = 5 + rnd() * 2.5, h = 3.5 + rnd() * 1.5;
      const y = terrain(x, z);
      const ry = (side > 0 ? -Math.PI / 2 : Math.PI / 2) + jit(0.5);
      const cm = place(x, y, z, ry);
      blocked.push([x, z, Math.max(w, d) * 0.8]);
      parts.base.push(local(cm, 0, -1.2, 0, 0, 0, 0, w + 0.5, 3, d + 0.5));
      parts.body.push(local(cm, 0, 0.3 + h / 2, 0, 0, 0, 0, w, h, d));
      const roofY = 0.3 + h, pitch = 0.62, half = w / 2 / Math.cos(pitch) + 0.5;
      parts.gable.push(local(cm, 0, roofY, 0, 0, 0, 0, w, Math.tan(pitch) * w / 2, d));
      parts.roofL.push(local(cm, -w / 4 - 0.12, roofY + Math.tan(pitch) * w / 4 + 0.15, 0, 0, 0, pitch, half, 0.32, d + 1.2));
      parts.roofR.push(local(cm, w / 4 + 0.12, roofY + Math.tan(pitch) * w / 4 + 0.15, 0, 0, 0, -pitch, half, 0.32, d + 1.2));
      parts.chim.push(local(cm, w * 0.22, roofY + 1.6, d * 0.15, 0, 0, 0, 0.7, 2.2, 0.7));
      for (const wx of [-w * 0.28, w * 0.28]) parts.win.push(local(cm, wx, 0.3 + h * 0.55, d / 2 + 0.03, 0, 0, 0, 1.1, 1.1, 0.08));
      parts.win.push(local(cm, 0, roofY + 0.7, d / 2 + 0.03, 0, 0, 0, 0.9, 0.9, 0.08));
      for (const wz of [-d * 0.22, d * 0.22]) for (const sx of [-1, 1]) parts.win.push(local(cm, sx * (w / 2 + 0.03), 0.3 + h * 0.55, wz, 0, 0, 0, 0.08, 1, 1));
      parts.door.push(local(cm, 0, 0.3 + 1.1, -d / 2 - 0.03, 0, 0, 0, 1.2, 2.2, 0.1));
    }
    for (let k = -2; k <= 2; k++) {            // lamps and a fence along the run edge
      const lz = zc + k * 12, lx = side * (HALF_W + 3);
      parts.lampPost.push(M4().compose(new THREE.Vector3(lx, terrain(lx, lz) + 2, lz), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
      parts.lampBulb.push(M4().compose(new THREE.Vector3(lx, terrain(lx, lz) + 4.1, lz), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
      parts.fence.push(M4().compose(new THREE.Vector3(side * (HALF_W + 4.5), terrain(side * (HALF_W + 4.5), lz + 6) + 0.6, lz + 6), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan(SL)), new THREE.Vector3(1, 1, 1)));
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const tri = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: 1, bevelEnabled: false }); gableGeo.translate(0, 0, -0.5);
  instanced(box, stoneMat, parts.base);
  instanced(box, woodMat, parts.body, { shadow: true });
  instanced(gableGeo, woodMat, parts.gable);
  instanced(box, roofMat, parts.roofL, { shadow: true });
  instanced(box, roofMat, parts.roofR, { shadow: true });
  instanced(box, stoneMat, parts.chim);
  instanced(box, glowMat, parts.win);
  instanced(box, darkWoodMat, parts.door);
  instanced(new THREE.CylinderGeometry(0.08, 0.1, 4, 6), postMat, parts.lampPost);
  instanced(new THREE.SphereGeometry(0.28, 10, 8), glowMat, parts.lampBulb);
  instanced(new THREE.BoxGeometry(0.12, 1.1, 11), darkWoodMat, parts.fence);
}

// layered pines with snow on top, plus rocks
function buildForest(count, blocked) {
  const trunk = [], t1 = [], t2 = [], t3 = [], cap = [], cols = [], rocks = [];
  const greens = ['#1f4d45', '#24584c', '#1b4340', '#2b5e48', '#1d5157'].map(c => new THREE.Color(c));
  let tries = 0;
  while (trunk.length < count && tries++ < count * 4) {
    const side = rnd() < 0.5 ? -1 : 1;
    const near = rnd() < 0.3;              // a denser line of trees right beside the run
    const x = side * (HALF_W + (near ? 5 + rnd() * 8 : 8 + Math.pow(rnd(), 0.75) * 150));
    const z = -150 + rnd() * (LEN + 420);
    if (blocked.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r + 2.5)) continue;
    if (lift.x && Math.abs(x - lift.x) < 6) continue;
    const s = 0.65 + rnd() * 1.0, y = terrain(x, z), ry = rnd() * TAU;
    trunk.push(place(x, y + 1.1 * s, z, ry, s));
    t1.push(place(x, y + 2.7 * s, z, ry, s));
    t2.push(place(x, y + 4.3 * s, z, ry + 0.4, s));
    t3.push(place(x, y + 5.7 * s, z, ry + 0.8, s));
    cap.push(place(x, y + 6.6 * s, z, ry, s));
    cols.push(greens[Math.floor(rnd() * greens.length)]);
  }
  for (let i = 0; i < 160; i++) {
    const side = rnd() < 0.5 ? -1 : 1, x = side * (HALF_W + 6 + rnd() * 120), z = -140 + rnd() * (LEN + 380);
    const s = 0.6 + rnd() * 2.2;
    rocks.push(M4().compose(new THREE.Vector3(x, terrain(x, z) + s * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, 0)), new THREE.Vector3(s, s * 0.7, s)));
  }
  const pineMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true });
  instanced(new THREE.CylinderGeometry(0.28, 0.4, 2.2, 6), darkWoodMat, trunk);
  instanced(new THREE.ConeGeometry(2.3, 3.1, 8), pineMat, t1, { shadow: true, colors: cols });
  instanced(new THREE.ConeGeometry(1.8, 2.7, 8), pineMat, t2, { shadow: true, colors: cols });
  instanced(new THREE.ConeGeometry(1.2, 2.3, 8), pineMat, t3, { colors: cols });
  instanced(new THREE.ConeGeometry(0.7, 1.0, 8), new THREE.MeshLambertMaterial({ color: '#f8f8ff', flatShading: true }), cap);
  instanced(new THREE.DodecahedronGeometry(1, 0), stoneMat, rocks, { shadow: true });
}

// a working chairlift up the side of the hill
function buildLift() {
  const x = lift.x = -(HALF_W + 16);
  const z0 = -60, z1 = LEN + 60, towers = [];
  const top = z => terrain(x, z) + 11;
  for (let z = z0; z <= z1; z += 55) {
    towers.push(M4().compose(new THREE.Vector3(x, terrain(x, z) + 5.5, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
  }
  instanced(new THREE.CylinderGeometry(0.35, 0.5, 11, 8), postMat, towers, { shadow: true });
  instanced(new THREE.BoxGeometry(4.2, 0.35, 0.5), postMat, towers.map(m => m.clone().multiply(M4().makeTranslation(0, 5.4, 0))));
  for (const off of [-1.8, 1.8]) {
    const pts = [];
    for (let z = z0; z <= z1; z += 55) pts.push(new THREE.Vector3(x + off, top(z), z));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#2a2d3d' }));
    course.add(line);
  }
  lift.len = z1 - z0; lift.z0 = z0; lift.top = top;
  const chair = new THREE.Group();
  const seat = new THREE.BoxGeometry(1.4, 0.15, 0.6); seat.translate(0, -2.2, 0);
  const back = new THREE.BoxGeometry(1.4, 0.7, 0.12); back.translate(0, -1.85, -0.28);
  const hanger = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5); hanger.translate(0, -1.1, 0);
  const n = 46;
  lift.chairs = [seat, back, hanger].map((g, i) => {
    const m = new THREE.InstancedMesh(g, i === 2 ? postMat : boxTopMat, n);
    m.castShadow = true; course.add(m); return m;
  });
  lift.n = n;
}
function updateLift(dt) {
  if (!lift.chairs) return;
  lift.t = (lift.t + dt * 2.2) % (lift.len * 2);
  const m = M4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < lift.n; i++) {
    const d = (lift.t + i * (lift.len * 2 / lift.n)) % (lift.len * 2);
    const goingUp = d > lift.len;
    const z = goingUp ? lift.z0 + lift.len - (d - lift.len) : lift.z0 + d;
    p.set(lift.x + (goingUp ? -1.8 : 1.8), lift.top(z), z);
    q.setFromAxisAngle(UP, goingUp ? Math.PI : 0);
    m.compose(p, q, s);
    for (const c of lift.chairs) c.setMatrixAt(i, m);
  }
  for (const c of lift.chairs) c.instanceMatrix.needsUpdate = true;
}

function buildDecor() {
  const n = Math.ceil((LEN + 60) / 10) * 2, mats = [], cols = [];
  for (let z = -20; z < LEN + 40; z += 10) for (const sd of [-1, 1]) {
    mats.push(place(sd * HALF_W, base(z) + 0.65, z));
    cols.push(new THREE.Color((Math.round(z / 10)) % 2 ? '#ff7a3d' : '#2f6fed'));
  }
  instanced(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 5), whiteMat, mats.slice(0, n), { colors: cols.slice(0, n) });
  const gate = (z, text, bg) => {
    const post = new THREE.CylinderGeometry(0.25, 0.25, 7, 8);
    for (const sd of [-1, 1]) {
      const pm = new THREE.Mesh(post, postMat); pm.position.set(sd * 13, base(z) + 3.5, z); pm.castShadow = true; course.add(pm);
    }
    const tex = textTex(text, bg, '#ffffff', 1024, 128);
    for (const ry of [0, Math.PI]) {     // two faces so the text reads the right way from both sides
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshBasicMaterial({ map: tex }));
      banner.position.set(0, base(z) + 6.2, z); banner.rotation.y = ry; course.add(banner);
    }
  };
  gate(-2, 'RAIL4', '#2f6fed');
  gate(LEN, 'FINISH', '#ff7a3d');
}

// is this spot clear of every kicker (and its landing), rail and obstacle?
function spotFree(x, z, pad = 3) {
  for (const k of kickers) if (Math.abs(x - k.x) < k.w / 2 + pad && z > k.z - 8 && z < k.z + k.len + (k.roller ? 4 : 22)) return false;
  for (const r of rails) if (Math.abs(x - r.x) < 2.5 + pad && z > r.z1 - 8 && z < r.z2 + 10) return false;
  for (const o of obstacles) if (Math.hypot(x - o.x, z - o.z) < o.r + pad + 2) return false;
  return Math.abs(x) < HALF_W - 3 && z > 45 && z < LEN - 25;
}
function addExtras(map) {
  // more jumps: side hits and rolling bumps in the gaps
  for (let z = 50; z < LEN - 60; z += 20 + rnd() * 18) {
    const x = jit(HALF_W * 1.5);
    if (rnd() < 0.45 && spotFree(x, z, 2)) addKicker(rnd() < 0.7 ? 'S' : 'M', x, z);
    else if (rnd() < 0.35 && spotFree(x, z, 2)) addRoller(x, z, 10 + rnd() * 8, 8 + rnd() * 4, 0.9 + rnd() * 0.8);
  }
  // things to crash into
  const types = ['rock', 'pine', 'snowman', 'pad', 'rock', 'pine'];
  for (let z = 50; z < LEN - 30; z += 7 + rnd() * 9) {
    if (rnd() > map.obstacles) continue;
    const x = jit(HALF_W * 1.8), type = types[Math.floor(rnd() * types.length)];
    const o = { type, x, z, r: { rock: 1.1, pine: 0.9, snowman: 0.6, pad: 0.55 }[type], h: { rock: 1.3, pine: 5.5, snowman: 1.8, pad: 2.2 }[type], s: 0.8 + rnd() * 0.5 };
    o.r *= o.s; o.h *= o.s;
    if (spotFree(x, z, 1.5)) obstacles.push(o);
  }
}
function buildObstacles() {
  const by = t => obstacles.filter(o => o.type === t);
  const at = (o, dy, s = o.s) => place(o.x, base(o.z) + dy * o.s, o.z, o.x * 7.1, s);
  const rocks = by('rock'), pines = by('pine'), men = by('snowman'), pads = by('pad');
  instanced(new THREE.DodecahedronGeometry(1.15, 0), stoneMat, rocks.map(o => at(o, 0.45)), { shadow: true });
  instanced(new THREE.SphereGeometry(0.85, 10, 6, 0, TAU, 0, 1.1), roofMat, rocks.map(o => at(o, 0.7)));
  const pineMat = new THREE.MeshLambertMaterial({ color: '#24584c', flatShading: true });
  instanced(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 6), darkWoodMat, pines.map(o => at(o, 0.8)));
  instanced(new THREE.ConeGeometry(1.6, 2.6, 8), pineMat, pines.map(o => at(o, 2.3)), { shadow: true });
  instanced(new THREE.ConeGeometry(1.2, 2.2, 8), pineMat, pines.map(o => at(o, 3.6)), { shadow: true });
  instanced(new THREE.ConeGeometry(0.55, 0.9, 8), roofMat, pines.map(o => at(o, 4.9)));
  const snowMan = new THREE.MeshLambertMaterial({ color: '#fbfbff' });
  instanced(new THREE.SphereGeometry(0.55, 14, 10), snowMan, men.map(o => at(o, 0.5)), { shadow: true });
  instanced(new THREE.SphereGeometry(0.4, 14, 10), snowMan, men.map(o => at(o, 1.2)), { shadow: true });
  instanced(new THREE.SphereGeometry(0.28, 14, 10), snowMan, men.map(o => at(o, 1.7)), { shadow: true });
  const nose = new THREE.ConeGeometry(0.05, 0.25, 6); nose.rotateX(Math.PI / 2); nose.translate(0, 0, 0.32);
  instanced(nose, lipMat, men.map(o => at(o, 1.7)));
  const scarf = new THREE.TorusGeometry(0.3, 0.06, 6, 14); scarf.rotateX(Math.PI / 2);
  instanced(scarf, boxTopMat, men.map(o => at(o, 1.45)));
  const padMat = new THREE.MeshLambertMaterial({ color: '#2f6fed' }), stripeMat = new THREE.MeshLambertMaterial({ color: '#ff7a3d' });
  instanced(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 14), padMat, pads.map(o => at(o, 1.1)), { shadow: true });
  instanced(new THREE.CylinderGeometry(0.51, 0.51, 0.3, 14), stripeMat, pads.map(o => at(o, 1.5)));
}
// hit something? you bail
function hitObstacle() {
  for (const o of obstacles) {
    if (Math.abs(P.pos.z - o.z) > o.r + 0.5) continue;
    if (Math.hypot(P.pos.x - o.x, P.pos.z - o.z) < o.r + 0.35 && P.pos.y < base(o.z) + o.h) {
      const away = Math.atan2(P.pos.x - o.x, P.pos.z - o.z);
      if (P.mode !== 'air') P.vel.set(Math.sin(P.hd) * P.speed, 0, Math.cos(P.hd) * P.speed);
      P.vel.multiplyScalar(0.35); P.vel.x += Math.sin(away) * 3;
      P.pos.x += Math.sin(away) * 0.6;
      crash();
      return true;
    }
  }
  return false;
}
function drawMini() {
  const c = document.getElementById('miniMap'); if (!c) return;
  const g = c.getContext('2d'), W = c.width, H = c.height, top = 8, len = H - 16;
  const X = x => W / 2 + (x / HALF_W) * (W / 2 - 6), Y = z => top + (clamp(z, 0, LEN) / LEN) * len;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(10,14,34,.45)'; g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(4, 2, W - 8, H - 4, 10); g.fill(); g.stroke();
  for (const k of kickers) { g.fillStyle = '#ff7a3d'; g.fillRect(X(k.x) - k.w / 4, Y(k.z), k.w / 2, 3); }
  for (const o of obstacles) { g.fillStyle = 'rgba(200,205,220,.75)'; g.fillRect(X(o.x) - 1, Y(o.z) - 1, 2, 2); }
  for (const r of rails) { g.strokeStyle = '#8fb4ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(r.x), Y(r.z1)); g.lineTo(X(r.x), Y(r.z2)); g.stroke(); }
  g.fillStyle = '#fff'; g.fillRect(8, Y(LEN) - 1, W - 16, 2);
}
function buildCourse(id) {
  if (!MAPS[id]) id = 'park';
  if (id === currentMap) return;
  currentMap = id;
  const map = MAPS[id];
  clearCourse();
  LEN = map.len; seed = map.seed;
  map.gen();
  addExtras(map);
  lift.x = 0;
  const blocked = [];
  buildGround(); buildKickers(); buildRails(); buildObstacles();
  if (map.lift) buildLift();
  buildVillages(map, blocked);
  buildForest(map.pines, blocked);
  buildDecor();
  drawMini();
}

// ---------- the rider (original low-poly skier) ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function makeRider() {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, ...o });
  // jacket: two-tone panels, chest stripe, zip, pocket and a small R4 badge
  const jacketTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#2f6fed'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f4fc0'; g.fillRect(0, h * 0.72, w, h * 0.28);
    g.fillStyle = '#ff7a3d'; g.fillRect(0, h * 0.2, w, h * 0.09);
    g.fillStyle = '#ffd2b0'; g.fillRect(0, h * 0.29, w, h * 0.02);
    g.fillStyle = '#16233f'; g.fillRect(w / 2 - 2, 0, 4, h);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(w * 0.6, h * 0.5, w * 0.25, h * 0.14);
    g.fillStyle = '#fff'; g.font = 'italic 900 16px system-ui, sans-serif'; g.fillText('R4', w * 0.14, h * 0.48);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  const sleeveTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#2f6fed'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff7a3d'; g.fillRect(0, h * 0.35, w, h * 0.08);
    g.fillStyle = '#1f4fc0'; g.fillRect(0, h * 0.8, w, h * 0.2);
  });
  const pantsTex = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#262c40'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#323a55'; g.fillRect(0, h * 0.42, w, h * 0.16);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.fillStyle = '#ff7a3d'; g.fillRect(0, h * 0.9, w, h * 0.04);
  });
  const skiTex = canvasTex(32, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff9a4a'); gr.addColorStop(1, '#ff5e3a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d2236'; g.lineWidth = 3;
    g.beginPath(); for (let y = 30; y < h - 30; y += 16) { g.lineTo(y % 32 ? 6 : w - 6, y); } g.stroke();
    g.fillStyle = '#1d2236'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
    g.save(); g.translate(w / 2 + 5, h * 0.78); g.rotate(-Math.PI / 2); g.fillStyle = '#fff'; g.font = 'italic 900 15px system-ui, sans-serif'; g.fillText('RAIL4', 0, 0); g.restore();
  });
  const goggleTex = canvasTex(64, 16, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff6ad5'); gr.addColorStop(0.5, '#ffb347'); gr.addColorStop(1, '#5ad1ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(6, 3, 18, 3);
  });

  const jacket = std({ map: jacketTex }), sleeve = std({ map: sleeveTex }), pants = std({ map: pantsTex });
  const ski = std({ map: skiTex, roughness: 0.4 }), skiBase = std({ color: '#1d2236' });
  const helmet = std({ color: '#f4f5fb', roughness: 0.35 }), helmetStripe = std({ color: '#2f6fed', roughness: 0.35 });
  const dark = std({ color: '#191c27' }), grey = std({ color: '#9aa3b5', metalness: 0.6, roughness: 0.35 });
  const goggles = new THREE.MeshStandardMaterial({ map: goggleTex, metalness: 0.8, roughness: 0.15, emissive: '#331a33', emissiveMap: goggleTex, emissiveIntensity: 0.25 });
  const gaiter = std({ color: '#ff7a3d' }), glove = std({ color: '#20242f', roughness: 0.9 });
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

  const root = new THREE.Group();
  const pivot = new THREE.Group(); pivot.position.y = 0.95; root.add(pivot);
  const body = new THREE.Group(); body.position.y = -0.95; pivot.add(body);

  const skis = [];
  for (const sx of [-0.16, 0.16]) {
    const sg = new THREE.Group(); sg.position.set(sx, 0, 0); body.add(sg);
    const deck = mesh(new THREE.BoxGeometry(0.11, 0.03, 1.7), [skiBase, skiBase, ski, skiBase, skiBase, skiBase]); deck.position.set(0, 0.02, 0.05); sg.add(deck);
    const tip = mesh(new THREE.BoxGeometry(0.11, 0.03, 0.26), ski); tip.position.set(0, 0.075, 0.99); tip.rotation.x = -0.5; sg.add(tip);
    const tail = mesh(new THREE.BoxGeometry(0.11, 0.03, 0.22), ski); tail.position.set(0, 0.065, -0.89); tail.rotation.x = 0.45; sg.add(tail);
    const bind = mesh(new THREE.BoxGeometry(0.1, 0.05, 0.36), grey); bind.position.set(0, 0.055, 0.02); sg.add(bind);
    skis.push(sg);
    const boot = mesh(new THREE.BoxGeometry(0.15, 0.22, 0.3), dark); boot.position.set(sx, 0.16, 0.02); body.add(boot);
    for (const by of [0.11, 0.19]) { const b = mesh(new THREE.BoxGeometry(0.155, 0.025, 0.12), grey); b.position.set(sx, by, 0.09); body.add(b); }
  }
  const legs = new THREE.Group(); body.add(legs);
  for (const sx of [-0.14, 0.14]) {
    const l = mesh(new THREE.CapsuleGeometry(0.095, 0.48, 4, 10), pants); l.position.set(sx, 0.55, 0); legs.add(l);
  }
  const torso = new THREE.Group(); torso.position.y = 0.86; body.add(torso);
  const chest = mesh(new THREE.BoxGeometry(0.48, 0.6, 0.3), [sleeve, sleeve, jacket, jacket, jacket, jacket]); chest.position.y = 0.3; torso.add(chest);
  const hem = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.32), sleeve); hem.position.y = 0.02; torso.add(hem);
  const hood = mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, TAU, 0, Math.PI / 2), jacket); hood.position.set(0, 0.6, -0.12); hood.rotation.x = -0.5; torso.add(hood);
  const neck = mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 12), gaiter); neck.position.y = 0.66; torso.add(neck);
  const head = mesh(new THREE.SphereGeometry(0.17, 18, 12), helmet); head.position.y = 0.8; torso.add(head);
  const ridge = mesh(new THREE.BoxGeometry(0.06, 0.03, 0.3), helmetStripe); ridge.position.set(0, 0.965, 0); torso.add(ridge);
  const strap = mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.055, 18, 1, true), dark); strap.position.y = 0.78; torso.add(strap);
  const gog = mesh(new THREE.BoxGeometry(0.27, 0.085, 0.07), goggles); gog.position.set(0, 0.78, 0.15); torso.add(gog);
  const arms = [], poles = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.3, 0.55, 0); torso.add(sh);
    const a = mesh(new THREE.CapsuleGeometry(0.065, 0.42, 4, 10), sleeve); a.position.y = -0.27; sh.add(a);
    const hand = mesh(new THREE.BoxGeometry(0.12, 0.12, 0.13), glove); hand.position.y = -0.58; sh.add(hand);
    const pole = new THREE.Group(); pole.position.set(0, -0.6, 0.05); pole.rotation.x = 1.25; sh.add(pole);
    const shaft = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.15, 6), grey); pole.add(shaft);
    const grip = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), dark); grip.position.y = 0.5; pole.add(grip);
    const basket = mesh(new THREE.TorusGeometry(0.045, 0.01, 5, 12), dark); basket.position.y = -0.48; basket.rotation.x = Math.PI / 2; pole.add(basket);
    sh.rotation.set(-0.35, 0, sx * 0.25);
    arms.push(sh); poles.push(pole);
  }
  return { root, pivot, legs, torso, arms, skis, poles };
}
const rider = makeRider();
scene.add(rider.root);

// ---------- yard sale: skis and poles fly off when you bail ----------
const debris = [];
function yardSale() {
  const v = P.vel.clone(); if (!v.lengthSq()) v.set(Math.sin(P.hd) * P.speed, 0, Math.cos(P.hd) * P.speed);
  rider.root.updateMatrixWorld(true);
  for (const part of [...rider.skis, ...rider.poles]) {
    const obj = part.clone();
    part.matrixWorld.decompose(obj.position, obj.quaternion, obj.scale);
    scene.add(obj);
    debris.push({
      obj, life: 9,
      vel: new THREE.Vector3(v.x * (0.5 + Math.random() * 0.5) + (Math.random() - 0.5) * 5, Math.max(1, v.y * 0.3) + 2 + Math.random() * 4, v.z * (0.5 + Math.random() * 0.5) + (Math.random() - 0.5) * 3),
      spin: new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18),
      flat: rider.skis.includes(part),
    });
    part.visible = false;
  }
}
function regear() { for (const part of [...rider.skis, ...rider.poles]) part.visible = true; }
function clearDebris() { for (const d of debris) scene.remove(d.obj); debris.length = 0; regear(); }
const dq = new THREE.Quaternion(), de = new THREE.Euler();
function updateDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.vel.y -= G * dt;
    d.obj.position.addScaledVector(d.vel, dt);
    dq.setFromEuler(de.set(d.spin.x * dt, d.spin.y * dt, d.spin.z * dt));
    d.obj.quaternion.premultiply(dq);
    const gy = ground(d.obj.position.x, d.obj.position.z) + 0.03;
    if (d.obj.position.y < gy) {             // bounce, then skid to a stop
      d.obj.position.y = gy;
      if (d.vel.y < 0) d.vel.y *= -0.3;
      d.vel.x *= 0.82; d.vel.z *= 0.82; d.spin.multiplyScalar(0.6);
      if (d.vel.length() < 1.2) { d.vel.set(0, 0, 0); d.spin.set(0, 0, 0); }
    }
    d.life -= dt;
    if (d.life < 0) { scene.remove(d.obj); debris.splice(i, 1); }
  }
}


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
  KeyQ: 'q', KeyE: 'e', ShiftLeft: 'grab', ShiftRight: 'grab', KeyG: 'truck', KeyF: 'daffy', KeyV: 'spread', Space: 'jump',
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
  steer: 0, yaw0: 0, butter: 0, fromRail: false, grabName2: '', grabbing: false, press: { nose: 0, tail: 0 },
};
let state = 'menu', paused = false, score = 0, combo = 0, comboT = 0, runTime = 0, finishT = 0, introT = 0, cdT = 0, bestTrick = { name: '', pts: 0 };
const anyGrab = () => K.grab || K.truck || K.daffy || K.spread;
const grabFromKeys = () => K.daffy ? 'Daffy' : K.spread ? 'Spread Eagle' : K.truck ? 'Truck Driver' : K.left ? 'Mute' : K.right ? 'Japan' : K.up ? 'Tip' : K.down ? 'Tail' : 'Safety';
const BEST_KEY = 'rail4_best';
const getBest = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } };

function resetRider() {
  P.butter = 0; P.yaw0 = 0; P.fromRail = false;
  P.pos.set(0, base(4), 4); P.vel.set(0, 0, 0); P.speed = 0; P.hd = 0; P.mode = 'ground'; P.sw = false; P.lastVy = 0;
  P.spin = P.flip = P.roll = 0; P.charge = 0; P.charging = false; P.absorb = 0; P.rail = null;
}

function jumpDown() { if (state === 'play' && (P.mode === 'ground' || P.mode === 'grind')) { P.charging = true; P.charge = 0; } }
function jumpUp() {
  if (state !== 'play' || !P.charging) return;
  P.charging = false;
  if (P.mode === 'ground') takeOff(P.lastVy + 3.6 + P.charge * 3.2);
  else if (P.mode === 'grind') { endGrind(); takeOff(-SL * P.speed + 3.8 + P.charge * 2, true); }
  P.charge = 0;
}

function takeOff(vy, fromRail = false) {
  P.mode = 'air';
  P.vel.set(Math.sin(P.hd) * P.speed, vy, Math.cos(P.hd) * P.speed);
  P.spin = P.butter; P.butter = 0;                // a butter carries straight into the spin
  P.flip = P.roll = 0; P.spinV = P.flipV = P.rollV = 0;
  P.air = 0; P.grabT = 0; P.grabName = ''; P.grabName2 = ''; P.takeoffSw = P.sw;
  P.fromRail = fromRail; P.yaw0 = fromRail ? Math.PI / 2 : 0;   // off a rail you start sideways
  P.airYaw = P.hd + (P.sw ? Math.PI : 0) + P.yaw0;
}

const wrapDist = (a, m) => { a = ((a % m) + m) % m; return Math.min(a, m - a); };
const upright = () => wrapDist(P.flip, TAU) < 0.95 && wrapDist(P.roll, TAU) < 0.95 && wrapDist(P.spin + P.yaw0, Math.PI) < 1.1;
const railReady = () => wrapDist(P.flip, TAU) < 0.95 && wrapDist(P.roll, TAU) < 0.95 && wrapDist(P.spin + P.yaw0, Math.PI / 2) < 0.65;

function trick() {
  const step = P.fromRail ? Math.PI / 2 : Math.PI;           // off a rail, spins count in 90s
  const spinDeg = Math.round(Math.abs(P.spin) / step) * (P.fromRail ? 90 : 180);
  const flips = Math.round(Math.abs(P.flip) / TAU), rolls = Math.round(Math.abs(P.roll) / TAU);
  const times = n => n === 2 ? 'Double ' : n === 3 ? 'Triple ' : n > 3 ? n + 'x ' : '';
  let name = '';
  if (rolls && spinDeg >= 360 && P.flip < -1.5) name = times(rolls) + 'Bio ' + spinDeg;
  else if (rolls && spinDeg >= 360) name = times(rolls) + 'Cork ' + spinDeg;
  else if (rolls) name = times(rolls) + 'Sideflip' + (spinDeg ? ' ' + spinDeg : '');
  else if (flips && spinDeg >= 360) name = times(flips) + (P.flip > 0 ? 'Misty ' : 'Rodeo ') + spinDeg;
  else if (flips) name = times(flips) + (P.flip > 0 ? 'Frontflip' : 'Backflip') + (spinDeg ? ' ' + spinDeg : '');
  else if (spinDeg >= (P.fromRail ? 90 : 180)) name = (P.spin > 0 ? 'Left ' : 'Right ') + spinDeg;
  if (P.fromRail && name) name += ' Off';
  const grabbed = P.grabT > 0.25;
  if (grabbed) {
    let g = (P.grabT > 1.1 ? 'Tweaked ' : '') + P.grabName + (P.grabName2 ? ' to ' + P.grabName2 : '');
    name = name ? name + ' ' + g : g + (/Daffy|Spread Eagle/.test(g) ? '' : ' Grab');
  }
  if (!name && P.air < 0.6) return null;
  if (!name) name = P.air > 1.2 ? 'Big Air' : 'Air';
  if (P.takeoffSw) name = 'Switch ' + name;
  const pts = Math.round((P.air * 80 + spinDeg * 1.4 + flips * 450 + rolls * 650 + Math.min(P.grabT, 2) * 260 + (P.grabName2 ? 200 : 0) + (P.grabT > 1.1 ? 150 : 0)) * (P.takeoffSw ? 1.2 : 1));
  return { name, pts };
}

function addTrick(t, grade) {
  if (!t || t.pts <= 0) return;
  combo = comboT > 0 ? combo + 1 : 1; comboT = 3.2;
  const mult = 1 + (combo - 1) * 0.25;
  const pts = Math.round(t.pts * mult);
  const bonus = grade ? Math.round(pts * grade.bonus) : 0;
  score += pts + bonus;
  if (pts + bonus > bestTrick.pts) bestTrick = { name: t.name, pts: pts + bonus };
  popup(t.name, '+' + pts.toLocaleString(), false, combo > 1 ? `combo ×${mult.toFixed(2)}` : '', grade && grade.label ? { label: grade.label, bonus, ok: grade.bonus < 0.2 } : null);
}
// how cleanly you landed: closer to perfectly lined up = bigger bonus
function landingGrade() {
  const dev = Math.max(wrapDist(P.flip, TAU), wrapDist(P.roll, TAU), wrapDist(P.spin, Math.PI) * 0.8);
  if (dev < 0.22) return { label: 'Perfect landing', bonus: 0.35 };
  if (dev < 0.5) return { label: 'Clean', bonus: 0.12 };
  return { label: 'Sketchy', bonus: 0 };
}

function land(h) {
  const n = groundNormal(P.pos.x, P.pos.z);
  const impact = P.vel.dot(n);
  if (!upright() || impact < -18) { crash(); return; }
  const s = (((P.spin + P.yaw0) % TAU) + TAU) % TAU;
  if (s > Math.PI / 2 && s < Math.PI * 1.5) P.sw = !P.sw;
  P.speed = Math.hypot(P.vel.x, P.vel.z) * 0.96;
  P.hd = clamp(Math.atan2(P.vel.x, P.vel.z), -1.3, 1.3);
  P.pos.y = h; P.mode = 'ground'; P.lastVy = -SL * Math.cos(P.hd) * P.speed;
  P.absorb = clamp(-impact / 12, 0.25, 1);
  const t = trick();
  addTrick(t, t ? landingGrade() : null);
  P.spin = P.flip = P.roll = 0;
  emitSpray(P.pos, new THREE.Vector3(Math.sin(P.hd), 0, Math.cos(P.hd)), 26, 3);
}

function crash() {
  yardSale();
  P.mode = 'crash'; P.crashT = 1.6; combo = 0; comboT = 0;
  P.speed = Math.hypot(P.vel.x, P.vel.z) * 0.55;
  if (P.vel.x || P.vel.z) P.hd = Math.atan2(P.vel.x, P.vel.z);
  P.pos.y = ground(P.pos.x, P.pos.z);
  P.tumble.set(P.flip, P.airYaw + P.spin, P.roll);
  P.tumbleV.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14);
  P.rail = null; P.charging = false;
  popup('BAIL', 'Combo lost', true);
  emitSpray(P.pos, new THREE.Vector3(Math.sin(P.hd), 0, Math.cos(P.hd)), 40, 4);
}

function startGrind(r, fromAir) {
  P.spinOn = 0;
  if (fromAir) {
    if (Math.abs(P.spin) > 2.3) P.spinOn = Math.round(Math.abs(P.spin) / (Math.PI / 2)) * 90;   // e.g. "270 On"
    else addTrick(trick());
  }
  P.press.nose = P.press.tail = 0;
  P.mode = 'grind'; P.rail = r; P.railT = 0; P.bal = (Math.random() - 0.5) * 0.25;
  P.speed = Math.max(5, fromAir ? Math.hypot(P.vel.x, P.vel.z) : P.speed);
  P.hd = 0; P.spin = P.flip = P.roll = 0; P.sw = false;
}
function endGrind() {
  const r = P.rail; if (!r) return;
  if (P.railT > 0.3) {
    const pressed = Math.max(P.press.nose, P.press.tail) > P.railT * 0.5;
    let kind = pressed ? (P.press.nose > P.press.tail ? 'Nose Press' : 'Tail Press') : r.type === 'box' ? 'Box Slide' : 'Rail Slide';
    if (P.spinOn) kind = P.spinOn + ' On ' + kind;
    addTrick({ name: (P.railT > 1.4 ? 'Long ' : '') + kind, pts: Math.round(P.railT * (pressed ? 290 : 230) + P.spinOn * 1.3) });
  }
  P.rail = null;
}

// ---------- physics ----------
function stepGround(dt) {
  const arrows = (K.left ? 1 : 0) - (K.right ? 1 : 0);
  const buttering = K.grab && arrows && P.speed > 3;          // Shift + left/right on the snow
  if (buttering) P.butter += arrows * 4.4 * dt;
  else if (P.butter) {
    const n = Math.round(P.butter / Math.PI);
    if (n) { if (n % 2) P.sw = !P.sw; addTrick({ name: 'Butter ' + Math.abs(n) * 180, pts: Math.abs(n) * 210 }); }
    P.butter = 0;
  }
  const steer = buttering ? 0 : arrows;
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
  if (hitObstacle()) return;

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
  if (anyGrab()) {
    const g = grabFromKeys();
    if (!P.grabbing) {                         // a new grab: first one, or a second for "X to Y"
      if (!P.grabName) P.grabName = g; else if (g !== P.grabName && !P.grabName2) P.grabName2 = g;
    }
    P.grabbing = true; P.grabT += dt;
  } else P.grabbing = false;

  P.vel.y -= G * dt;
  P.pos.addScaledVector(P.vel, dt);
  P.air += dt;
  if (Math.abs(P.pos.x) > HALF_W - 1) { P.pos.x = Math.sign(P.pos.x) * (HALF_W - 1); P.vel.x *= -0.3; }

  if (P.vel.y <= 0) {
    for (const r of rails) {
      if (P.pos.z < r.z1 || P.pos.z > r.z2 || Math.abs(P.pos.x - r.x) > r.w / 2 + 0.4) continue;
      const top = railTop(r, P.pos.z);
      if (P.pos.y <= top + 0.12 && P.pos.y >= top - 0.7) {
        if (railReady()) { P.pos.y = top; startGrind(r, true); } else crash();
        return;
      }
    }
  }
  if (hitObstacle()) return;
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
  if (K.up) P.press.nose += dt; else if (K.down) P.press.tail += dt;
  if (Math.abs(P.bal) > 1) {
    const side = Math.sign(P.bal);
    endGrind(); takeOff(-SL * P.speed, true); P.vel.x = side * 3;
    return;
  }
  if (P.pos.z > r.z2) { endGrind(); takeOff(-SL * P.speed + 0.8, true); return; }
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
    regear();
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
    target.multiply(qA.setFromAxisAngle(UP, P.hd + (P.sw ? Math.PI : 0) + P.butter));
    if (P.butter) target.multiply(qB.setFromAxisAngle(X, 0.22));
    target.multiply(qB.setFromAxisAngle(Z, -P.steer * 0.32 * (P.sw ? -1 : 1)));
  } else if (P.mode === 'air') {
    target.setFromAxisAngle(UP, P.airYaw + P.spin);
    target.multiply(qA.setFromAxisAngle(X, P.flip));
    target.multiply(qB.setFromAxisAngle(Z, P.roll));
  } else if (P.mode === 'grind') {
    groundNormal(P.pos.x, P.pos.z, vN).set(0, 1, SL).normalize();
    target.setFromUnitVectors(UP, vN);
    const press = K.up ? 1 : K.down ? -1 : 0;
    target.multiply(qA.setFromAxisAngle(UP, press ? 0 : Math.PI / 2));
    if (press) target.multiply(qB.setFromAxisAngle(X, press * 0.32));
    target.multiply(qB.setFromAxisAngle(Z, P.bal * 0.5));
  } else if (P.mode === 'crash') {
    target.setFromEuler(tmpE.set(P.tumble.x, P.tumble.y, P.tumble.z));
  }
  rider.pivot.quaternion.slerp(target, Math.min(1, dt * (P.mode === 'air' ? 30 : 14)));

  let crouch = K.up && P.mode === 'ground' ? 0.55 : 0.15;
  if (P.charging) crouch = 0.35 + P.charge;
  if (P.mode === 'air' && P.grabbing && !/Daffy|Spread/.test(P.grabName2 || P.grabName)) crouch = 0.95;
  if (P.mode === 'grind') crouch = 0.35;
  crouch = Math.max(crouch, P.absorb);
  rider.legs.scale.y += ((1 - crouch * 0.32) - rider.legs.scale.y) * Math.min(1, dt * 12);
  rider.torso.position.y = 0.3 + 0.56 * rider.legs.scale.y;
  rider.torso.rotation.x += (crouch * 0.45 - rider.torso.rotation.x) * Math.min(1, dt * 12);
  // grab poses: [right arm x, right arm z, left arm x, left arm z, ski spread, ski scissor]
  const g = P.mode === 'air' && P.grabbing ? (P.grabName2 || P.grabName) : '';
  const POSE = {
    '': [-0.35, 0.25, P.mode === 'grind' ? -0.2 + P.bal : -0.35, -0.25, 0, 0],
    Safety: [0.9, 0.25, -0.35, -1.1, 0, 0], Mute: [-0.35, 0.6, 1.0, 0.45, 0, 0], Japan: [-0.35, 0.9, 1.1, 0.35, 0, 0.25],
    Tip: [1.4, 0.15, -0.3, -1.2, 0, 0], Tail: [-1.0, 0.3, -0.3, -1.1, 0, 0], 'Truck Driver': [1.05, 0.1, 1.05, -0.1, 0, 0],
    Daffy: [-0.2, 1.4, -0.2, -1.4, 0, 0.75], 'Spread Eagle': [0, 2.3, 0, -2.3, 0.55, 0],
  }[g] || [0.9, 0.25, -0.35, -1.1, 0, 0];
  const L = Math.min(1, dt * 14), lerpTo = (o, k, v) => { o[k] += (v - o[k]) * L; };
  lerpTo(rider.arms[1].rotation, 'x', POSE[0]); lerpTo(rider.arms[1].rotation, 'z', POSE[1]);
  lerpTo(rider.arms[0].rotation, 'x', POSE[2]); lerpTo(rider.arms[0].rotation, 'z', POSE[3]);
  lerpTo(rider.skis[0].rotation, 'z', -POSE[4]); lerpTo(rider.skis[1].rotation, 'z', POSE[4]);
  lerpTo(rider.skis[0].rotation, 'x', -POSE[5]); lerpTo(rider.skis[1].rotation, 'x', POSE[5]);
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
spray.material.map = flakeTex; spray.material.size = 0.3; spray.material.needsUpdate = true;
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
  glowMat.emissiveIntensity = T.night ? 1.8 : time === 'dawn' ? 0.7 : 0.25;
  flakes.visible = W.flakes > 0;
  flakeGeo.setDrawRange(0, W.flakes);
  flakes.material.size = weather === 'blizzard' ? 0.13 : 0.17;
  env.wind = W.wind * (Math.random() < 0.5 ? -1 : 1);
  renderer.toneMappingExposure = T.night ? 1.25 : 1;
  try { localStorage.setItem('rail4_env', JSON.stringify(choice)); } catch (e) { }
}

// menu choices ("random" picks a new one every run)
let choice = { map: 'park', time: 'sunset', weather: 'clear' };
try { Object.assign(choice, JSON.parse(localStorage.getItem('rail4_env') || '{}')); } catch (e) { }
const pick = (key, table) => choice[key] === 'random' ? Object.keys(table)[Math.floor(Math.random() * Object.keys(table).length)] : (table[choice[key]] ? choice[key] : Object.keys(table)[0]);
function applyChoice(newMap) {
  if (newMap) { buildCourse(pick('map', MAPS)); resetRider(); }
  applyEnv(pick('time', TIMES), pick('weather', WEATHERS));
}
function buildChips(id, key, table) {
  const box = document.getElementById(id);
  const opts = [...Object.entries(table).map(([k, v]) => [k, v.label]), ['random', 'Random']];
  const isMap = key === 'map';
  for (const [k, label] of opts) {
    const b = document.createElement('button');
    b.className = 'chip'; b.textContent = label; b.dataset.k = k;
    b.onclick = () => { choice[key] = k; refreshChips(); applyChoice(isMap); };
    box.appendChild(b);
  }
}
function refreshChips() {
  for (const [id, key] of [['mapChips', 'map'], ['timeChips', 'time'], ['weatherChips', 'weather']])
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
  const ty = P.pos.y + 1;
  for (const f of [0.2, 0.4, 0.6, 0.8]) {   // rise so a kicker never blocks the view of the rider
    const mx = camPos.x + (P.pos.x - camPos.x) * f, mz = camPos.z + (P.pos.z - camPos.z) * f;
    const need = (ground(mx, mz) + 0.4 - ty * f) / (1 - f);
    if (need > camPos.y) camPos.y = need;
  }
  camera.position.lerp(camPos, 1 - Math.exp(-dt * 6));
  lookAt.set(P.pos.x + camDir.x * 5, P.pos.y + 0.9, P.pos.z + camDir.z * 5);
  camera.lookAt(lookAt);
  camera.fov += ((64 + Math.min(P.speed, 30) * 0.35) - camera.fov) * Math.min(1, dt * 2);
  camera.updateProjectionMatrix();
}

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const hud = { score: $('score'), combo: $('combo'), time: $('time'), speed: $('speed'), prog: $('progFill'), bal: $('bal'), balDot: $('balDot'), trick: $('trick'), trickName: $('trickName'), trickPts: $('trickPts'), trickMult: $('trickMult'), trickGrade: $('trickGrade'), dist: $('dist'), left: $('left'), dot: $('miniDot') };
let popTimer = 0;
function popup(name, pts, bad, mult = '', grade = null) {
  hud.trickName.textContent = name; hud.trickPts.textContent = pts; hud.trickMult.textContent = mult;
  hud.trickGrade.innerHTML = '';
  if (grade) {
    hud.trickGrade.textContent = grade.label;
    if (grade.bonus) { const b = document.createElement('b'); b.textContent = '+' + grade.bonus.toLocaleString(); hud.trickGrade.appendChild(b); }
    hud.trickGrade.classList.toggle('ok', grade.ok);
  }
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
  hud.speed.textContent = Math.round(sp * 3.6);
  const zz = clamp(P.pos.z, 0, LEN);
  hud.dist.textContent = Math.round(zz).toLocaleString() + ' m';
  const left = LEN - zz;
  hud.left.textContent = (left >= 1000 ? (left / 1000).toFixed(1) + ' km' : Math.round(left) + ' m') + ' to go';
  hud.dot.style.top = 8 + (zz / LEN) * 174 + 'px';
  hud.dot.style.left = 28 + clamp(P.pos.x / HALF_W, -1, 1) * 16 + 'px';
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

// ---------- trick meters ----------
const meter = { box: $('meter'), name: $('mName'), land: $('mLand'), combo: $('comboFill'),
  bars: { spin: $('mSpin'), flip: $('mFlip'), cork: $('mCork'), grab: $('mGrab') },
  vals: { spin: $('vSpin'), flip: $('vFlip'), cork: $('vCork'), grab: $('vGrab') } };
function updateMeters() {
  meter.combo.style.width = (state === 'play' && combo > 0 ? clamp(comboT / 3.2, 0, 1) * 100 : 0) + '%';
  const on = state === 'play' && P.mode === 'air' && P.air > 0.12;
  meter.box.classList.toggle('on', on);
  if (!on) return;
  const set = (k, frac, txt) => { meter.bars[k].style.width = clamp(frac, 0, 1) * 100 + '%'; meter.vals[k].textContent = txt; };
  const sp = Math.abs(P.spin), fl = Math.abs(P.flip), ro = Math.abs(P.roll);
  set('spin', (sp % Math.PI) / Math.PI, Math.round(sp / Math.PI) * 180 + '°');
  set('flip', (fl % TAU) / TAU, '×' + Math.round(fl / TAU));
  set('cork', (ro % TAU) / TAU, '×' + Math.round(ro / TAU));
  set('grab', P.grabT / 2, P.grabT > 0.25 ? P.grabName : '—');
  const t = trick();
  meter.name.textContent = t ? `${t.name}  +${t.pts}` : '';
  const ok = upright();
  meter.land.textContent = ok ? 'READY TO LAND' : 'KEEP ROTATING';
  meter.land.classList.toggle('bad', !ok);
}

// ---------- game flow ----------
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function startRun(skipCutscene) {
  clearDebris();
  setTimeout(() => { $('mapName').textContent = MAPS[currentMap].label; $('mapEnv').textContent = `${TIMES[env.time].label} · ${WEATHERS[env.weather].label}`; }, 0);
  resetRider(); score = 0; combo = 0; comboT = 0; runTime = 0; bestTrick = { name: '', pts: 0 };
  paused = false;
  applyChoice(choice.map === 'random');
  resetRider();
  show('menu', false); show('results', false); show('pause', false); show('hud', false);
  camDir.set(0, 0, 1);
  if (skipCutscene) beginCountdown();
  else {
    state = 'intro'; introT = 0; buildIntro();
    cine(true, MAPS[currentMap].label, `${TIMES[env.time].label} · ${WEATHERS[env.weather].label}`, true);
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
$('pauseBtn').onclick = () => togglePause();
$('cine').onclick = skipIntro;
$('menuBest').textContent = getBest().toLocaleString();
buildChips('mapChips', 'map', MAPS);
buildChips('timeChips', 'time', TIMES);
buildChips('weatherChips', 'weather', WEATHERS);
refreshChips();
applyChoice(true);

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
    updateLift(dt);
    updateDebris(dt);
    updateMeters();
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
window.__rail4 = { trick, endGrind, obstacles, crash, buildCourse, get map() { return currentMap; }, P, K, get state() { return state; }, get score() { return score; }, startRun, skipIntro, applyEnv, kickers, rails, ground };
