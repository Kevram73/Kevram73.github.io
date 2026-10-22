// Interface : langue, navigation, animations au défilement, formulaire.
// La scène Three.js vit dans scene.js et lit window.sceneTarget.
(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Langue ----------
    const translatable = document.querySelectorAll('[data-en]');
    translatable.forEach(el => { el.dataset.fr = el.innerHTML; });
    const placeholders = document.querySelectorAll('[data-en-placeholder]');
    placeholders.forEach(el => { el.dataset.frPlaceholder = el.placeholder; });
    const langBtn = document.getElementById('lang-btn');

    let lang = 'fr';
    try {
        lang = localStorage.getItem('lang') || (navigator.language || 'fr').slice(0, 2);
    } catch (e) { /* stockage indisponible */ }
    if (lang !== 'en') lang = 'fr';

    const rotatorWords = {
        fr: ['Full-stack web & mobile', 'Laravel & Flutter', 'Pipelines IA & OCR', '.NET & Azure', 'Paiements & Mobile Money'],
        en: ['Full-stack web & mobile', 'Laravel & Flutter', 'AI & OCR pipelines', '.NET & Azure', 'Payments & Mobile Money']
    };

    function setLang(next) {
        lang = next;
        root.lang = next;
        translatable.forEach(el => { el.innerHTML = next === 'en' ? el.dataset.en : el.dataset.fr; });
        placeholders.forEach(el => { el.placeholder = next === 'en' ? el.dataset.enPlaceholder : el.dataset.frPlaceholder; });
        langBtn.dataset.active = next;
        try { localStorage.setItem('lang', next); } catch (e) { /* ignoré */ }
    }
    setLang(lang);
    langBtn.addEventListener('click', () => setLang(lang === 'fr' ? 'en' : 'fr'));

    // ---------- Navigation ----------
    const nav = document.getElementById('nav');
    const menuBtn = document.getElementById('menu-btn');
    const navLinks = document.getElementById('nav-links');
    const progress = document.getElementById('progress');

    function toggleMenu(open) {
        navLinks.classList.toggle('open', open);
        nav.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
    }
    menuBtn.addEventListener('click', () => toggleMenu(!navLinks.classList.contains('open')));
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

    function onScroll() {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 20);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ---------- Texte brouillé ----------
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*<>/';
    function scramble(el, duration = 900) {
        if (reduceMotion) return;
        const startLang = lang;
        const final = el.textContent;
        const start = performance.now();
        (function frame(now) {
            if (lang !== startLang) return; // la langue a changé entre-temps
            const t = Math.min(1, (now - start) / duration);
            const settled = Math.floor(t * final.length);
            let out = '';
            for (let i = 0; i < final.length; i++) {
                out += i < settled || final[i] === ' ' ? final[i] : glyphs[(Math.random() * glyphs.length) | 0];
            }
            el.textContent = out;
            if (t < 1) requestAnimationFrame(frame);
            else el.textContent = final;
        })(start);
    }

    // ---------- Chargement ----------
    const loaderCount = document.getElementById('loader-count');
    const loaderBar = document.getElementById('loader-bar');
    const loadStart = performance.now();
    const minDuration = reduceMotion ? 0 : 1300;
    let sceneReady = !!window.sceneReady;
    window.addEventListener('scene:ready', () => { sceneReady = true; });
    setTimeout(() => { sceneReady = true; }, 4000); // si la 3D ne charge pas

    (function loading(now) {
        const t = Math.min(1, (now - loadStart) / Math.max(minDuration, 1));
        // Plafonne à 90 % tant que la scène n'est pas prête
        const shown = Math.round((sceneReady ? t : Math.min(t, 0.9)) * 100);
        loaderCount.textContent = shown;
        loaderBar.style.transform = `scaleX(${shown / 100})`;
        if (shown < 100) return requestAnimationFrame(loading);
        setTimeout(() => {
            root.classList.add('loaded');
            setTimeout(() => document.querySelectorAll('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el, 1100), i * 160)), 250);
        }, 150);
    })(loadStart);

    // ---------- Section courante (pilote la forme 3D et le HUD) ----------
    const sections = document.querySelectorAll('main section[data-shape]');
    const linkFor = id => navLinks.querySelector(`a[href="#${id}"]`);
    const hudIndex = document.getElementById('hud-index');
    const hudLabel = document.getElementById('hud-label');
    const shapeLabels = {
        fr: ['Sphère', 'Galaxie', 'Double hélice', 'Nœud torique', 'Onde', 'Anneau'],
        en: ['Sphere', 'Galaxy', 'Double helix', 'Torus knot', 'Wave', 'Ring']
    };
    let currentShape = 0;
    window.sceneTarget = { shape: 0, x: 1.9 };

    // Palettes [A, B, C] par section, partagées avec scene.js
    const palettes = window.sectionPalettes = [
        ['#22d3ee', '#a78bfa', '#f472b6'], // Aurore
        ['#fbbf24', '#fb7185', '#c084fc'], // Coucher de soleil
        ['#2dd4bf', '#60a5fa', '#818cf8'], // Océan
        ['#e879f9', '#8b5cf6', '#fb923c'], // Nébuleuse
        ['#a3e635', '#34d399', '#22d3ee'], // Lagon
        ['#5eead4', '#a78bfa', '#f9a8d4']  // Aurore douce
    ];
    function applyPalette(i) {
        const [a1, a2, a3] = palettes[i];
        root.style.setProperty('--a1', a1);
        root.style.setProperty('--a2', a2);
        root.style.setProperty('--a3', a3);
    }

    function updateHud() {
        hudIndex.textContent = String(currentShape + 1).padStart(2, '0') + ' / 06';
        hudLabel.textContent = shapeLabels[lang][currentShape];
    }
    langBtn.addEventListener('click', updateHud);
    updateHud();

    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const s = entry.target;
            currentShape = Number(s.dataset.shape);
            window.sceneTarget = { shape: currentShape, x: Number(s.dataset.x || 0) };
            applyPalette(currentShape);
            updateHud();
            scramble(hudLabel, 500);
            navLinks.querySelectorAll('a').forEach(a => a.classList.remove('active'));
            const link = linkFor(s.id);
            if (link) link.classList.add('active');
        });
    }, { rootMargin: '-45% 0px -45% 0px' });
    sections.forEach(s => sectionObserver.observe(s));

    // ---------- Apparition au défilement ----------
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
            const kicker = entry.target.querySelector('.kicker span:last-child');
            if (kicker) scramble(kicker, 700);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach((el, i) => {
        // Léger décalage entre éléments d'une même grille
        const siblings = el.parentElement.querySelectorAll(':scope > .reveal');
        if (siblings.length > 1) el.style.transitionDelay = `${Array.from(siblings).indexOf(el) % 3 * 90}ms`;
        revealObserver.observe(el);
    });

    // ---------- Compteurs ----------
    const counterObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            counterObserver.unobserve(el);
            const end = Number(el.dataset.count);
            if (reduceMotion) return;
            const start = performance.now();
            const duration = 1400;
            (function step(now) {
                const t = Math.min(1, (now - start) / duration);
                el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
                if (t < 1) requestAnimationFrame(step);
            })(start);
        });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

    // ---------- Mots qui défilent ----------
    const rotator = document.getElementById('rotator');
    let wordIndex = 0;
    if (!reduceMotion) {
        setInterval(() => {
            rotator.classList.add('out');
            setTimeout(() => {
                const words = rotatorWords[lang];
                wordIndex = (wordIndex + 1) % words.length;
                rotator.textContent = words[wordIndex];
                rotator.classList.remove('out');
            }, 350);
        }, 2800);
    }

    // ---------- Curseur, boutons magnétiques et coordonnées du HUD ----------
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (finePointer && !reduceMotion) {
        const cursor = document.getElementById('cursor');
        const hudCoords = document.getElementById('hud-coords');
        let cx = -100, cy = -100, tx = -100, ty = -100;
        window.addEventListener('pointermove', e => {
            tx = e.clientX; ty = e.clientY;
            cursor.classList.add('visible');
            const nx = (e.clientX / window.innerWidth) * 2 - 1;
            const ny = -(e.clientY / window.innerHeight) * 2 + 1;
            hudCoords.textContent = `x ${nx.toFixed(2)} · y ${ny.toFixed(2)}`;
        }, { passive: true });
        document.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
        window.addEventListener('pointerdown', () => cursor.classList.add('down'));
        window.addEventListener('pointerup', () => cursor.classList.remove('down'));
        document.addEventListener('pointerover', e => {
            cursor.classList.toggle('hover', !!e.target.closest('a, button, .project, input, textarea'));
        });
        (function follow() {
            cx += (tx - cx) * 0.2;
            cy += (ty - cy) * 0.2;
            cursor.style.transform = `translate(${cx}px, ${cy}px)`;
            requestAnimationFrame(follow);
        })();

        document.querySelectorAll('.btn, .nav-cta, .copy-btn, .lang-btn').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
    }

    // ---------- Cartes projets inclinables ----------
    if (finePointer && !reduceMotion) {
        document.querySelectorAll('.project').forEach(card => {
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                card.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
                card.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
                card.style.setProperty('--mx', `${px * 100}%`);
                card.style.setProperty('--my', `${py * 100}%`);
            });
            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
        });
    }

    // ---------- Copier l'e-mail ----------
    const email = 'eyramativon1@gmail.com';
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(email);
        } catch (e) {
            window.location.href = `mailto:${email}`;
            return;
        }
        const label = copyBtn.querySelector('span');
        copyBtn.classList.add('copied');
        label.textContent = lang === 'en' ? 'Copied!' : 'Copié !';
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            label.textContent = lang === 'en' ? 'Copy' : 'Copier';
        }, 1800);
    });

    // ---------- Formulaire (envoi via FormSubmit vers la boîte Gmail) ----------
    const form = document.getElementById('contact-form');
    const formNote = document.getElementById('form-note');
    const submitBtn = document.getElementById('form-submit');
    const formMessages = {
        fr: { sending: 'Envoi en cours…', ok: 'Message envoyé ! Je vous réponds très vite.', error: "L'envoi a échoué. Écrivez-moi directement à " + email + '.' },
        en: { sending: 'Sending…', ok: "Message sent! I'll get back to you shortly.", error: 'Sending failed. Please email me directly at ' + email + '.' }
    };
    function setNote(state) {
        formNote.className = 'form-note' + (state === 'sending' ? '' : ' ' + state);
        formNote.textContent = formMessages[lang][state];
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        let valid = true;
        form.querySelectorAll('[required]').forEach(input => {
            const ok = input.value.trim() !== '' && input.checkValidity();
            input.closest('.field').classList.toggle('invalid', !ok);
            if (!ok) valid = false;
        });
        if (!valid) return;

        const data = new FormData(form);
        if (data.get('_honey')) return; // robot
        const subject = data.get('subject').trim() || (lang === 'en' ? 'Project enquiry' : 'Demande de projet');

        submitBtn.disabled = true;
        setNote('sending');
        try {
            const res = await fetch(`https://formsubmit.co/ajax/${email}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    name: data.get('name').trim(),
                    email: data.get('email').trim(),
                    message: data.get('message').trim(),
                    _subject: `[kevram.tech] ${subject}`,
                    _replyto: data.get('email').trim(),
                    _template: 'table',
                    _captcha: 'false'
                })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.status);
            setNote('ok');
            form.reset();
        } catch (err) {
            setNote('error');
        } finally {
            submitBtn.disabled = false;
        }
    });
    form.addEventListener('input', e => {
        const field = e.target.closest('.field');
        if (field) field.classList.remove('invalid');
    });

    document.getElementById('year').textContent = new Date().getFullYear();
})();
