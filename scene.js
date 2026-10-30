import * as THREE from "three";

const canvasHost = document.getElementById("hero-canvas");
if (canvasHost) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        canvasHost.setAttribute("data-reduced", "true");
    } else {
        initHeroScene(canvasHost);
    }
}

function isDarkTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark";
}

function initHeroScene(host) {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const nodeCount = isMobile ? 48 : 90;
    const shapeCount = isMobile ? 4 : 7;

    const renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.2, 9.5);

    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(4, 6, 8);
    scene.add(key);
    const accentLight = new THREE.PointLight(0xe85d04, 1.2, 18);
    accentLight.position.set(-3, 2, 4);
    scene.add(accentLight);

    const palette = {
        light: {
            ink: 0x2a323a,
            accent: 0xe85d04,
            mist: 0x6a7f8f,
            ambient: 0.85,
            key: 0.55,
            accentIntensity: 1.2,
            lineOpacity: 0.18,
            wireOpacity: 0.38,
            wireAccentOpacity: 0.7,
        },
        dark: {
            ink: 0xc5d0da,
            accent: 0xf06d1a,
            mist: 0x7a8f9f,
            ambient: 0.45,
            key: 0.35,
            accentIntensity: 1.55,
            lineOpacity: 0.28,
            wireOpacity: 0.5,
            wireAccentOpacity: 0.85,
        },
    };

    const shapes = [];
    const geometries = [
        () => new THREE.IcosahedronGeometry(0.55, 0),
        () => new THREE.OctahedronGeometry(0.5, 0),
        () => new THREE.TetrahedronGeometry(0.55, 0),
        () => new THREE.BoxGeometry(0.7, 0.7, 0.7),
        () => new THREE.TorusGeometry(0.38, 0.12, 12, 28),
        () => new THREE.DodecahedronGeometry(0.48, 0),
        () => new THREE.ConeGeometry(0.4, 0.75, 5),
    ];

    for (let i = 0; i < shapeCount; i++) {
        const geo = geometries[i % geometries.length]();
        const isAccent = i % 3 === 0;
        const wire = new THREE.Mesh(
            geo,
            new THREE.MeshBasicMaterial({
                color: isAccent ? palette.light.accent : palette.light.ink,
                wireframe: true,
                transparent: true,
                opacity: isAccent ? 0.7 : 0.38,
            })
        );
        wire.userData.isAccent = isAccent;
        const angle = (i / shapeCount) * Math.PI * 2;
        const radius = 2.2 + (i % 3) * 0.55;
        wire.position.set(
            Math.cos(angle) * radius + (i % 2 ? 1.8 : 2.6),
            Math.sin(angle * 1.3) * 1.4,
            Math.sin(angle) * 1.2 - 0.5
        );
        wire.rotation.set(angle, angle * 0.6, 0);
        wire.userData.spin = new THREE.Vector3(
            0.002 + Math.random() * 0.004,
            0.003 + Math.random() * 0.005,
            0.001 + Math.random() * 0.003
        );
        wire.userData.base = wire.position.clone();
        wire.userData.phase = Math.random() * Math.PI * 2;
        root.add(wire);
        shapes.push(wire);
    }

    const positions = new Float32Array(nodeCount * 3);
    const nodeMeshes = [];
    const spreadX = 5.5;
    const spreadY = 3.2;
    const spreadZ = 3.5;

    for (let i = 0; i < nodeCount; i++) {
        const x = (Math.random() - 0.35) * spreadX + 1.2;
        const y = (Math.random() - 0.5) * spreadY;
        const z = (Math.random() - 0.5) * spreadZ;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const isAccent = Math.random() > 0.82;
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(isAccent ? 0.045 : 0.028, 8, 8),
            new THREE.MeshBasicMaterial({
                color: isAccent ? palette.light.accent : palette.light.mist,
                transparent: true,
                opacity: isAccent ? 0.9 : 0.55,
            })
        );
        dot.userData.isAccent = isAccent;
        dot.position.set(x, y, z);
        root.add(dot);
        nodeMeshes.push(dot);
    }

    const linkPositions = [];
    const maxDist = isMobile ? 1.55 : 1.75;
    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            const dx = positions[i * 3] - positions[j * 3];
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d < maxDist) {
                linkPositions.push(
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2],
                    positions[j * 3],
                    positions[j * 3 + 1],
                    positions[j * 3 + 2]
                );
            }
        }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linkPositions, 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
        color: palette.light.ink,
        transparent: true,
        opacity: 0.18,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    root.add(lines);

    const dustCount = isMobile ? 80 : 160;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.2) * 10;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
        color: palette.light.accent,
        size: 0.035,
        transparent: true,
        opacity: 0.45,
        sizeAttenuation: true,
        depthWrite: false,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    root.add(dust);

    function applySceneTheme(dark) {
        const p = dark ? palette.dark : palette.light;
        ambient.intensity = p.ambient;
        key.intensity = p.key;
        accentLight.color.setHex(p.accent);
        accentLight.intensity = p.accentIntensity;
        lineMat.color.setHex(p.ink);
        lineMat.opacity = p.lineOpacity;
        dustMat.color.setHex(p.accent);

        shapes.forEach((mesh) => {
            mesh.material.color.setHex(mesh.userData.isAccent ? p.accent : p.ink);
            mesh.material.opacity = mesh.userData.isAccent ? p.wireAccentOpacity : p.wireOpacity;
        });

        nodeMeshes.forEach((node) => {
            node.material.color.setHex(node.userData.isAccent ? p.accent : p.mist);
        });
    }

    applySceneTheme(isDarkTheme());
    window.addEventListener("kevram-theme", (e) => {
        applySceneTheme(e.detail?.theme === "dark");
    });

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e) => {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        pointer.tx = (x / window.innerWidth) * 2 - 1;
        pointer.ty = -(y / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    function resize() {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let inView = true;
    let running = false;
    const io = new IntersectionObserver(
        ([entry]) => {
            inView = entry.isIntersecting;
            syncLoop();
        },
        { threshold: 0.05 }
    );
    io.observe(host);

    const clock = new THREE.Clock();
    let frame = 0;

    function tick() {
        frame = requestAnimationFrame(tick);
        if (!inView || document.hidden) return;

        const t = clock.getElapsedTime();
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;

        root.rotation.y = pointer.x * 0.22 + t * 0.04;
        root.rotation.x = pointer.y * 0.12;
        root.position.x = pointer.x * 0.35;
        root.position.y = pointer.y * 0.2;

        shapes.forEach((mesh, i) => {
            const { spin, base, phase } = mesh.userData;
            mesh.rotation.x += spin.x;
            mesh.rotation.y += spin.y;
            mesh.rotation.z += spin.z;
            mesh.position.y = base.y + Math.sin(t * 0.7 + phase) * 0.18;
            mesh.position.x = base.x + Math.cos(t * 0.45 + phase + i) * 0.08;
        });

        nodeMeshes.forEach((node, i) => {
            const pulse = 0.92 + Math.sin(t * 1.4 + i * 0.35) * 0.08;
            node.scale.setScalar(pulse);
        });

        dust.rotation.y = t * 0.03;
        dust.rotation.x = Math.sin(t * 0.2) * 0.05;
        const base = isDarkTheme() ? palette.dark.accentIntensity : palette.light.accentIntensity;
        accentLight.intensity = base + Math.sin(t * 1.2) * 0.25;

        renderer.render(scene, camera);
    }

    function syncLoop() {
        const shouldRun = inView && !document.hidden;
        if (shouldRun && !running) {
            running = true;
            clock.start();
            tick();
        } else if (!shouldRun && running) {
            running = false;
            cancelAnimationFrame(frame);
        }
    }

    document.addEventListener("visibilitychange", syncLoop);
    syncLoop();
}
