// Fond 3D : un nuage de particules qui change de forme selon la section visible,
// un noyau organique au centre, du bloom, une onde de choc au clic et un effet warp au défilement.
// 0 sphère · 1 galaxie · 2 double hélice · 3 nœud torique · 4 vague · 5 anneau
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.documentElement;
const canvas = document.getElementById('scene');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const smallScreen = () => window.innerWidth < 860;
const LITE = smallScreen();
const COUNT = LITE ? 2800 : 6000;

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
} catch (e) {
    root.classList.add('no-webgl');
    window.dispatchEvent(new Event('scene:ready'));
    throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, LITE ? 1.75 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#07060f');
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7.5);

// ---------- Formes ----------
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function rotateX([x, y, z], a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [x, y * c - z * s, y * s + z * c];
}
function rotateZ([x, y, z], a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [x * c - y * s, x * s + y * c, z];
}

function sphere(i) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2.3 + gauss() * 0.05;
    return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

function galaxy(i) {
    const arms = 3;
    const r = Math.pow(Math.random(), 0.85) * 3.6 + 0.12;
    const a = (i % arms) / arms * Math.PI * 2 + r * 1.3;
    const spread = 0.38 * (1.1 - r / 4);
    const p = [Math.cos(a) * r + gauss() * spread, gauss() * 0.08 * (4 - r), Math.sin(a) * r + gauss() * spread];
    return rotateX(p, 0.95);
}

function helix(i) {
    const t = (i / COUNT) * 2 - 1;
    const R = 1.15;
    const kind = i % 5;
    let p;
    if (kind < 2) {
        const ang = t * Math.PI * 4 + kind * Math.PI;
        p = [Math.cos(ang) * R + gauss() * 0.06, t * 3.3, Math.sin(ang) * R + gauss() * 0.06];
    } else {
        // Barreaux entre les deux brins
        const tq = Math.round(t * 22) / 22;
        const ang = tq * Math.PI * 4;
        const u = Math.random();
        p = [Math.cos(ang) * R * (1 - 2 * u), tq * 3.3 + gauss() * 0.02, Math.sin(ang) * R * (1 - 2 * u)];
    }
    return rotateZ(p, 0.5);
}

function knot(i) {
    const t = (i / COUNT) * Math.PI * 2;
    const r = 0.78 * (2 + Math.cos(3 * t));
    const c = [r * Math.cos(2 * t), r * Math.sin(2 * t), -0.95 * Math.sin(3 * t)];
    const tr = 0.3 * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    return [c[0] + tr * Math.sin(b) * Math.cos(a), c[1] + tr * Math.sin(b) * Math.sin(a), c[2] + tr * Math.cos(b)];
}

const side = Math.ceil(Math.sqrt(COUNT));
function wave(i) {
    const gx = i % side, gz = Math.floor(i / side);
    const x = (gx / (side - 1) - 0.5) * 11;
    const z = (gz / (side - 1) - 0.5) * 8;
    return rotateX([x, -1.2, z], 0.35);
}

function ring(i) {
    const a = Math.random() * Math.PI * 2;
    const halo = i % 6 === 0 ? Math.random() * 1.6 - 0.9 : 0;
    const r = 2.25 + gauss() * 0.16 + halo;
    return rotateX([Math.cos(a) * r, gauss() * 0.07, Math.sin(a) * r], 1.25);
}

const builders = [sphere, galaxy, helix, knot, wave, ring];
const targets = builders.map(build => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) arr.set(build(i), i * 3);
    return arr;
});

// Palette par forme : [A, B, C]
// (définies dans script.js pour que l'interface suive les mêmes couleurs)
const palettes = (window.sectionPalettes || Array(6).fill(['#22d3ee', '#a78bfa', '#f472b6']))
    .map(p => p.map(c => new THREE.Color(c)));

// ---------- Particules ----------
const positions = new Float32Array(COUNT * 3);
const scales = new Float32Array(COUNT);
const seeds = new Float32Array(COUNT);
const speeds = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
    if (reduceMotion) {
        positions.set(targets[0].subarray(i * 3, i * 3 + 3), i * 3);
    } else {
        // Départ dispersé : les particules convergent vers la sphère à la fin du chargement
        const r = 9 + Math.random() * 12;
        const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
        positions.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3);
    }
    scales[i] = Math.random() < 0.06 ? 1.6 + Math.random() : 0.35 + Math.random() * 0.75;
    seeds[i] = Math.random();
    speeds[i] = 0.55 + Math.random() * 0.9;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

const uniforms = {
    uTime: { value: 0 },
    uSize: { value: LITE ? 52 : 44 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uColorA: { value: palettes[0][0].clone() },
    uColorB: { value: palettes[0][1].clone() },
    uColorC: { value: palettes[0][2].clone() },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uWave: { value: 0 },
    uAlpha: { value: 1 },
    uScatter: { value: 0 },
    uPulseOrigin: { value: new THREE.Vector3(0, 0, 0) },
    uPulseStart: { value: -100 }
};

const vertexShader = /* glsl */`
    uniform float uTime;
    uniform float uSize;
    uniform float uPixelRatio;
    uniform vec3 uMouse;
    uniform float uWave;
    uniform float uScatter;
    uniform vec3 uPulseOrigin;
    uniform float uPulseStart;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    attribute float aScale;
    attribute float aSeed;
    varying vec3 vColor;
    varying float vTwinkle;
    varying float vPulse;

    void main() {
        vec3 p = position;
        float t = uTime;
        // Respiration organique
        p += 0.045 * vec3(
            sin(t * 0.9 + position.y * 2.1 + aSeed * 6.0),
            cos(t * 0.8 + position.x * 1.9 + aSeed * 5.0),
            sin(t * 0.7 + position.z * 2.3 + aSeed * 4.0)
        );
        // Ondulation pour la forme "vague"
        p.y += uWave * (sin(position.x * 0.9 + t * 1.1) * 0.35 + cos(position.z * 1.2 + t * 0.8) * 0.3);
        // Warp : la forme se disperse quand on défile vite
        p += normalize(position + 0.0001) * uScatter * (0.3 + aSeed * 1.4);

        vec4 world = modelMatrix * vec4(p, 1.0);

        // Répulsion autour du pointeur
        vec2 d = world.xy - uMouse.xy;
        world.xy += normalize(d + 0.0001) * smoothstep(1.6, 0.0, length(d)) * 0.55;

        // Onde de choc au clic
        float age = uTime - uPulseStart;
        vec2 pd = world.xy - uPulseOrigin.xy;
        float ring = exp(-pow(length(pd) - age * 5.0, 2.0) * 2.0) * exp(-age * 1.3);
        world.xy += normalize(pd + 0.0001) * ring * 0.8;
        world.z += ring * 0.6;
        vPulse = ring;

        vec4 mv = viewMatrix * world;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aScale * uPixelRatio * (1.0 + ring * 0.8) / -mv.z;

        // Dégradé à trois teintes, légèrement décalé par particule pour éviter les aplats
        float g = smoothstep(-3.2, 3.2, p.x * 0.55 + p.y + (aSeed - 0.5) * 1.6);
        vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.6, g));
        col = mix(col, uColorC, smoothstep(0.55, 1.0, g));
        // Éclats : quelques particules prennent la 3e teinte ou deviennent presque blanches
        col = mix(col, uColorC, step(0.88, aSeed) * 0.75);
        col = mix(col, vec3(1.0, 0.97, 0.94), step(0.975, aSeed) * 0.7);
        vColor = col;
        vTwinkle = 0.65 + 0.35 * sin(t * (1.5 + aSeed * 2.5) + aSeed * 40.0);
    }
`;

const fragmentShader = /* glsl */`
    uniform float uAlpha;
    varying vec3 vColor;
    varying float vTwinkle;
    varying float vPulse;

    void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.5, 0.0, d);
        float alpha = pow(core, 1.6) * vTwinkle * uAlpha;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor * 0.85 + core * 0.15 + vPulse * 0.6, alpha);
    }
`;

const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const outer = new THREE.Group();   // position + inclinaison suivant la souris
const inner = new THREE.Group();   // rotation continue
const points = new THREE.Points(geometry, material);
inner.add(points);
outer.add(inner);
scene.add(outer);

// ---------- Noyau organique ----------
// Bruit simplex 3D (Ashima Arts / Stefan Gustavson, licence MIT)
const noiseGLSL = /* glsl */`
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
`;

const coreUniforms = {
    uTime: uniforms.uTime,
    uColorA: uniforms.uColorA,
    uColorB: uniforms.uColorB,
    uColorC: uniforms.uColorC,
    uDistort: { value: 1 },
    uPulse: { value: 0 }
};

const coreMaterial = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: noiseGLSL + /* glsl */`
        uniform float uTime;
        uniform float uDistort;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vView;
        varying float vNoise;
        void main() {
            float n = snoise(position * 1.3 + uTime * 0.32);
            float n2 = snoise(position * 3.2 - uTime * 0.5) * 0.35;
            float disp = (n + n2) * 0.26 * uDistort + uPulse * 0.25;
            vec3 p = position * (1.0 + disp);
            vNoise = n;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
        }
    `,
    fragmentShader: /* glsl */`
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        varying vec3 vNormal;
        varying vec3 vView;
        varying float vNoise;
        void main() {
            float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
            vec3 col = mix(uColorB * 0.12, uColorA, fres);
            col += uColorC * smoothstep(0.25, 0.95, vNoise) * 0.45;
            gl_FragColor = vec4(col * 0.8, 0.1 + fres * 0.6);
        }
    `,
    transparent: true,
    depthWrite: false
});

const core = new THREE.Group();
const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, LITE ? 32 : 48), coreMaterial);
const coreWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.45, 1)),
    new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
);
core.add(coreMesh, coreWire);
core.scale.setScalar(0.001);
outer.add(core);

// ---------- Champ d'étoiles ----------
const STARS = LITE ? 500 : 1200;
const starPos = new Float32Array(STARS * 3);
for (let i = 0; i < STARS; i++) {
    const r = 14 + Math.random() * 26;
    const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    starPos.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a) - 10], i * 3);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xb9b6ff,
    size: 0.07,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
}));
scene.add(stars);

// ---------- Post-traitement ----------
let composer = null;
let bloom = null;
if (!LITE) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 0.12);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
}

// ---------- Pointeur ----------
const pointer = new THREE.Vector2(0, 0);
const pointerSmooth = new THREE.Vector2(0, 0);
const mouseWorld = new THREE.Vector3(99, 99, 0);
const pulseWorld = new THREE.Vector3();
let pointerActive = false;
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const toNdc = e => new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);

window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pointer.copy(toNdc(e));
    pointerActive = true;
}, { passive: true });
document.addEventListener('pointerleave', () => { pointerActive = false; });

// Onde de choc : clic n'importe où hors des éléments interactifs
window.addEventListener('pointerdown', e => {
    if (reduceMotion || e.target.closest('a, button, input, textarea, label')) return;
    raycaster.setFromCamera(toNdc(e), camera);
    if (raycaster.ray.intersectPlane(plane, pulseWorld)) {
        uniforms.uPulseOrigin.value.copy(pulseWorld);
        uniforms.uPulseStart.value = uniforms.uTime.value;
    }
});

// ---------- Redimensionnement ----------
function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    // Recule la caméra sur les écrans étroits pour garder la forme entière
    camera.position.z = w / h < 0.8 ? 10.5 : 7.5;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Boucle ----------
const clock = new THREE.Clock();
let elapsed = 0;
let lastScroll = window.scrollY;
let scrollEnergy = 0;
let readySent = false;
const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));
const coreScale = [0.9, 0, 0, 0, 0, 0];
const white = new THREE.Color('#ffffff');

function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduceMotion) elapsed += dt;
    uniforms.uTime.value = elapsed;

    const st = window.sceneTarget || { shape: 0, x: 0 };
    const shape = st.shape;
    const loaded = reduceMotion || root.classList.contains('loaded');

    // Morphing vers la forme cible, chaque particule à sa propre vitesse
    if (loaded) {
        const target = targets[shape];
        const base = reduceMotion ? 1 : 1 - Math.exp(-dt * 2.1);
        for (let i = 0, j = 0; i < COUNT; i++, j += 3) {
            const k = Math.min(1, base * speeds[i]);
            positions[j] += (target[j] - positions[j]) * k;
            positions[j + 1] += (target[j + 1] - positions[j + 1]) * k;
            positions[j + 2] += (target[j + 2] - positions[j + 2]) * k;
        }
        geometry.attributes.position.needsUpdate = true;
    }

    // Couleurs de la section
    const kc = 1 - Math.exp(-dt * 1.6);
    const pal = palettes[shape];
    uniforms.uColorA.value.lerp(pal[0], kc);
    uniforms.uColorB.value.lerp(pal[1], kc);
    uniforms.uColorC.value.lerp(pal[2], kc);
    coreWire.material.color.copy(uniforms.uColorB.value);
    stars.material.color.copy(uniforms.uColorB.value).lerp(white, 0.55);

    uniforms.uWave.value = damp(uniforms.uWave.value, shape === 4 ? 1 : 0, 2, dt);
    uniforms.uAlpha.value = damp(uniforms.uAlpha.value, shape === 0 ? 1 : shape === 5 ? 0.8 : 0.6, 2, dt);

    // Warp au défilement
    const sy = window.scrollY;
    const velocity = Math.abs(sy - lastScroll) / Math.max(dt, 0.001);
    lastScroll = sy;
    scrollEnergy = damp(scrollEnergy, reduceMotion ? 0 : Math.min(velocity / 3000, 1), 5, dt);
    uniforms.uScatter.value = scrollEnergy;
    if (bloom) bloom.strength = 0.55 + scrollEnergy * 0.5;

    // Noyau
    const cs = damp(core.scale.x, loaded ? coreScale[shape] : 0.001, 2.4, dt);
    core.scale.setScalar(Math.max(cs, 0.001));
    core.visible = cs > 0.01;
    const pulseAge = elapsed - uniforms.uPulseStart.value;
    coreUniforms.uPulse.value = Math.exp(-pulseAge * 3) * (pulseAge >= 0 ? 1 : 0);
    if (!reduceMotion) {
        coreMesh.rotation.y += dt * 0.15;
        coreWire.rotation.y -= dt * 0.1;
        coreWire.rotation.x += dt * 0.05;
    }

    // Position latérale et inclinaison
    // Sur les écrans moyens, décale davantage la forme du hero pour libérer le texte
    const heroBoost = shape === 0 && window.innerWidth < 1200 ? 0.8 : 0;
    outer.position.x = damp(outer.position.x, smallScreen() ? 0 : st.x + heroBoost, 1.8, dt);
    outer.position.y = damp(outer.position.y, smallScreen() && shape === 0 ? -1.4 : 0, 1.8, dt);
    pointerSmooth.x = damp(pointerSmooth.x, pointer.x, 3, dt);
    pointerSmooth.y = damp(pointerSmooth.y, pointer.y, 3, dt);
    outer.rotation.y = pointerSmooth.x * 0.35;
    outer.rotation.x = -pointerSmooth.y * 0.25;

    if (!reduceMotion) {
        const spin = shape === 4 ? 0.02 : shape === 2 ? 0.25 : 0.09;
        inner.rotation.y += dt * (spin + scrollEnergy * 0.8);
        stars.rotation.y += dt * 0.006;
        stars.rotation.x = sy * 0.00008;
    }

    // Pointeur projeté sur le plan z = 0
    if (pointerActive && !reduceMotion) {
        raycaster.setFromCamera(pointer, camera);
        raycaster.ray.intersectPlane(plane, mouseWorld);
    } else {
        mouseWorld.set(99, 99, 0);
    }
    uniforms.uMouse.value.lerp(mouseWorld, 1 - Math.exp(-dt * 6));

    if (composer) composer.render(dt);
    else renderer.render(scene, camera);

    if (!readySent) {
        readySent = true;
        window.sceneReady = true;
        window.dispatchEvent(new Event('scene:ready'));
    }
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
