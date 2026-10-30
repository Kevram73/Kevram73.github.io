(() => {
    // Numéro WhatsApp Business en E.164 sans + (ex. 22890123456). Laisser vide pour masquer les CTA.
    const WHATSAPP_E164 = "";

    const html = document.documentElement;
    const header = document.querySelector(".site-header");
    const langBtn = document.getElementById("language-toggle");
    const themeBtn = document.getElementById("theme-toggle");
    const menuToggle = document.getElementById("menu-toggle");
    const mobileNav = document.getElementById("mobile-nav");
    const contactForm = document.getElementById("contact-form");
    const toastRegion = document.getElementById("toast-region");
    const yearEl = document.getElementById("year");
    const waLink = document.getElementById("whatsapp-link");
    const waCta = document.getElementById("whatsapp-cta");
    const waFloat = document.getElementById("float-whatsapp");
    const waLabel = document.getElementById("whatsapp-label");

    let lang = localStorage.getItem("kevram-lang") || "fr";

    function setupWhatsApp() {
        const phone = String(WHATSAPP_E164 || "").replace(/\D/g, "");
        if (!phone) return;
        const text = encodeURIComponent(
            lang === "en"
                ? "Hello Kevram Tech, I would like to discuss a project."
                : "Bonjour Kevram Tech, je souhaite discuter d’un projet."
        );
        const href = `https://wa.me/${phone}?text=${text}`;
        [waLink, waCta, waFloat].forEach((el) => {
            if (!el) return;
            el.hidden = false;
            el.setAttribute("href", href);
            el.setAttribute("target", "_blank");
            el.setAttribute("rel", "noopener noreferrer");
        });
        if (waLabel) {
            const pretty = phone.startsWith("228") && phone.length >= 11
                ? `+228 ${phone.slice(3, 5)} ${phone.slice(5, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`
                : `+${phone}`;
            waLabel.textContent = pretty;
        }
    }

    setupWhatsApp();

    function currentTheme() {
        return html.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }

    function applyTheme(theme) {
        const next = theme === "dark" ? "dark" : "light";
        html.setAttribute("data-theme", next);
        localStorage.setItem("kevram-theme", next);
        if (themeBtn) {
            const label = next === "dark"
                ? (lang === "en" ? "Switch to light theme" : "Passer en thème clair")
                : (lang === "en" ? "Switch to dark theme" : "Passer en thème sombre");
            themeBtn.setAttribute("aria-label", label);
            themeBtn.title = label;
        }
        window.dispatchEvent(new CustomEvent("kevram-theme", { detail: { theme: next } }));
    }

    applyTheme(currentTheme());

    themeBtn?.addEventListener("click", () => {
        applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });

    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    function applyLanguage(next) {
        lang = next;
        localStorage.setItem("kevram-lang", lang);
        html.lang = lang;
        const key = lang === "en" ? "en" : "fr";

        document.querySelectorAll("[data-fr]").forEach((el) => {
            const value = el.getAttribute(`data-${key}`);
            if (value != null) el.textContent = value;
        });

        document.querySelectorAll("[data-fr-placeholder]").forEach((el) => {
            const value = el.getAttribute(`data-${key}-placeholder`);
            if (value != null) el.setAttribute("placeholder", value);
        });

        const label = langBtn?.querySelector(".current-lang");
        if (label) label.textContent = lang.toUpperCase();
        applyTheme(currentTheme());
        setupWhatsApp();
    }

    applyLanguage(lang);

    langBtn?.addEventListener("click", () => {
        applyLanguage(lang === "fr" ? "en" : "fr");
    });

    function setMenuOpen(open) {
        if (!menuToggle || !mobileNav) return;
        menuToggle.setAttribute("aria-expanded", String(open));
        mobileNav.hidden = !open;
        document.body.style.overflow = open ? "hidden" : "";
    }

    menuToggle?.addEventListener("click", () => {
        const open = menuToggle.getAttribute("aria-expanded") !== "true";
        setMenuOpen(open);
    });

    mobileNav?.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setMenuOpen(false));
    });

    window.addEventListener(
        "scroll",
        () => {
            header?.classList.toggle("is-scrolled", window.scrollY > 24);
        },
        { passive: true }
    );

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (e) => {
            const id = anchor.getAttribute("href");
            if (!id || id === "#") return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - 64;
            window.scrollTo({ top, behavior: "smooth" });
        });
    });

    const revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
        );
        revealEls.forEach((el) => io.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    // Hero reveals on load
    requestAnimationFrame(() => {
        document.querySelectorAll(".hero .reveal").forEach((el) => {
            el.classList.add("is-visible");
        });
    });

    function showToast(message, type = "info") {
        if (!toastRegion) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastRegion.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("is-in"));
        setTimeout(() => {
            toast.classList.remove("is-in");
            setTimeout(() => toast.remove(), 350);
        }, 4200);
    }

    contactForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const btnText = btn?.querySelector(".btn-text");
        const original = btnText?.textContent;
        const sending = lang === "en" ? "Sending…" : "Envoi…";
        const ok = lang === "en" ? "Message sent successfully." : "Message envoyé avec succès.";
        const fail = lang === "en" ? "Something went wrong." : "Une erreur est survenue.";
        const invalid = lang === "en" ? "Please fill in all fields." : "Merci de remplir tous les champs.";

        if (!contactForm.reportValidity()) {
            showToast(invalid, "error");
            return;
        }

        const formData = new FormData(contactForm);
        const payload = {
            name: String(formData.get("name") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            subject: String(formData.get("subject") || "").trim(),
            message: String(formData.get("message") || "").trim(),
            website: String(formData.get("website") || "").trim(),
        };

        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = sending;

        try {
            // Honeypot filled → pretend success
            if (payload.website) {
                showToast(ok, "success");
                contactForm.reset();
                return;
            }

            const res = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            let data = {};
            try {
                data = await res.json();
            } catch {
                data = {};
            }

            if (!res.ok || data.ok !== true) {
                const detail = data.detail;
                throw new Error(typeof detail === "string" ? detail : fail);
            }

            showToast(ok, "success");
            contactForm.reset();
        } catch (err) {
            showToast(err instanceof Error && err.message ? err.message : fail, "error");
        } finally {
            if (btn) btn.disabled = false;
            if (btnText && original) btnText.textContent = original;
        }
    });
})();
