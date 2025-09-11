// Header professionnel avec effet de transparence
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.12)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
    }
});

// Pas d'animations de scroll - scroll normal uniquement

// Gestion du formulaire de contact
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        // Animation de chargement
        submitBtn.innerHTML = '<span class="loading"></span> Envoi en cours...';
        submitBtn.disabled = true;
        
        // Simulation d'envoi (remplacer par votre logique d'envoi)
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Message de succès
            showNotification('Message envoyé avec succès !', 'success');
            contactForm.reset();
            
        } catch (error) {
            showNotification('Erreur lors de l\'envoi du message', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Système de notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Styles pour la notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Fermeture automatique
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
    
    // Fermeture manuelle
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    });
}

// Navigation simple pour les liens d'ancrage
function initSimpleNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                const offsetTop = target.offsetTop - 100; // Compenser la hauteur du header
                
                // Scroll vers la section
                window.scrollTo(0, offsetTop);
                
                // Mettre à jour l'URL sans recharger la page
                history.pushState(null, null, targetId);
            }
        });
    });
}

// Pas d'animations de cartes flottantes - affichage normal

// Pas d'effets de parallaxe - scroll normal uniquement

// Pas d'animations de compteurs - affichage normal

// Gestion du thème sombre/clair
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Mettre à jour l'icône du bouton
    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Charger le thème sauvegardé
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.querySelector('#theme-toggle i');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    } else {
        if (themeIcon) themeIcon.className = 'fas fa-moon';
    }
    
    // Ajouter l'événement au bouton de thème
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

// Optimisation des performances - lazy loading des images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Gestion des erreurs JavaScript
window.addEventListener('error', (e) => {
    console.error('Erreur JavaScript:', e.error);
    // Ici vous pourriez envoyer l'erreur à un service de monitoring
});

// Service Worker pour le cache (PWA ready)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Fonction utilitaire pour le debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Pas d'optimisation de scroll - scroll normal uniquement

// Gestion du focus pour l'accessibilité
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
    }
});

document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
});

// Micro-interactions avancées
document.addEventListener('DOMContentLoaded', () => {
    // Pas d'animations d'icônes - interface simple
    
    // Pas d'effet de ripple - interface simple
    
    // Pas d'effet de tilt - interface simple
    
    // Pas d'effet de typing - affichage normal du titre
});

// Préchargement des ressources critiques
function preloadCriticalResources() {
    const criticalResources = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
    ];
    
    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = resource;
        document.head.appendChild(link);
    });
}

// Curseur personnalisé
function initCustomCursor() {
    const cursor = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    const customCursor = document.querySelector('.custom-cursor');
    
    if (!cursor || !cursorOutline) return;
    
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    });
    
    // Animation fluide pour l'outline
    function animateOutline() {
        outlineX += (mouseX - outlineX) * 0.1;
        outlineY += (mouseY - outlineY) * 0.1;
        
        cursorOutline.style.left = outlineX + 'px';
        cursorOutline.style.top = outlineY + 'px';
        
        requestAnimationFrame(animateOutline);
    }
    animateOutline();
    
    // Effets de hover
    const hoverElements = document.querySelectorAll('a, button, .service-card, .tech-category');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            customCursor.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            customCursor.classList.remove('hover');
        });
    });
}

// Pas d'écran de chargement - affichage direct

// Pas d'effets de particules - interface simple

// Pas d'effets de morphing - interface simple

// Pas d'animations de texte - affichage normal

// Pas d'effets 3D - interface simple

// Pas d'effets de liquide - interface simple

// Fonction supprimée - plus de navigation avancée

// Système de notifications avancé
function initNotificationSystem() {
    const container = document.getElementById('notification-container');
    
    function showNotification(title, message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <i class="${icon}"></i>
                    ${title}
                </div>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        container.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Fermeture automatique
        const autoClose = setTimeout(() => {
            closeNotification(notification);
        }, duration);
        
        // Fermeture manuelle
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(autoClose);
            closeNotification(notification);
        });
    }
    
    function closeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 300);
    }
    
    function getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    // Exposer la fonction globalement
    window.showNotification = showNotification;
}

// Pas de bouton de retour en haut - scroll normal uniquement

// Pas de système de son - interface silencieuse

// Pas d'effets de parallaxe multi-couches - scroll normal

// Pas d'effets de néon - interface simple

// Initialisation finale - fonctionnalités essentielles uniquement
document.addEventListener('DOMContentLoaded', () => {
    preloadCriticalResources();
    
    // Initialiser seulement les fonctionnalités essentielles
    initSimpleNavigation();
    initNotificationSystem();
    
    // Ajouter une classe pour indiquer que le JavaScript est chargé
    document.body.classList.add('js-loaded');
    
    // Performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        });
    }
});
