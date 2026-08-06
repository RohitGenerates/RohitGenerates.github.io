document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    /* ==============================================================
       PROJECT DATA — powers the click-to-open detail cards
       ============================================================== */
    const projectsData = {
        'neon-genesis': {
            tag: 'Major Project / Security',
            title: 'NeuralArmor',
            image: 'assets/project-neuralmor.jpg',
            desc: 'Model-agnostic security reverse proxy for autonomous perception systems. Engineered in FastAPI with a CVPR 2025 Adversarial Consistency Distillation purifier, achieving 98% latency reduction (5s → 0.1s). Red Teaming scanner using ART against PGD/FGSM attacks with Grad-CAM XAI forensic visualization.',
            stack: ['FastAPI', 'Python', 'ART', 'CVPR 2025', 'Grad-CAM XAI']
        },
        'system-archive': {
            tag: 'Academic / Privacy',
            title: 'Digital Footprint Analyzer',
            image: 'assets/project-privacy-audit.jpg',
            desc: 'Real-time web privacy risk auditor built with mitmproxy, Flask, and a Manifest V3 Chrome extension. Tracks fingerprinting signals and cookies to compute live 0–100 domain risk scores via non-intrusive network analysis and PostgreSQL visualization.',
            stack: ['Python', 'Flask', 'mitmproxy', 'PostgreSQL', 'Chrome Extension']
        },
        'digital-soul': {
            tag: 'Hackathon / 2nd Place',
            title: 'ConnectNet',
            image: 'assets/project-connectnet.jpg',
            desc: 'Offline-first emergency rescue platform built in 6 hours at VIDYUT 2K25. Utilizes BLE/Wi-Fi Direct mesh networking with Room DB and Firebase for live SOS alert synchronization on a Google Maps dashboard—entirely offline-capable.',
            stack: ['Android', 'Kotlin', 'Room DB', 'Firebase', 'Google Maps']
        },
        'vibe-streamer': {
            tag: 'Research / Publication',
            title: 'Multi-Vector Guardrails',
            image: 'assets/project-research.jpg',
            desc: 'Peer-reviewed book chapter in IIP Proceedings Vol 6, Book 2. Authored original research on Knowledge Engineering for autonomous systems, proposing a dual-path processing architecture (Probabilistic AI vs. Deterministic Backend) for ethical alignment grounded in NeuralArmor empirical data.',
            stack: ['Research', 'Knowledge Engineering', 'Autonomous Systems']
        },
        'robotics': null,
        'smart-city': null,
        'creative-direction': null
    };

    /* ==============================================================
       NAV / SECTION SETUP (shared by scroll-spy + both scrub systems)
       ============================================================== */
    const navItems = document.querySelectorAll('.nav-item');

    function setActiveNav(activeItem) {
        if (!activeItem) return;
        navItems.forEach(nav => {
            nav.classList.remove('bg-primary', 'text-on-primary', 'shadow-[0_0_15px_rgba(233,196,0,0.4)]');
            nav.classList.add('text-on-surface-variant');
            nav.removeAttribute('aria-current');
        });
        activeItem.classList.remove('text-on-surface-variant');
        activeItem.classList.add('bg-primary', 'text-on-primary', 'shadow-[0_0_15px_rgba(233,196,0,0.4)]');
        activeItem.setAttribute('aria-current', 'page');
    }

    /* ==============================================================
       1. CARD HOVER MICRO-INTERACTIONS
       ============================================================== */
    document.querySelectorAll('.project-card, .project-hover-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, { y: -8, duration: 0.3, ease: 'power2.out' });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { y: 0, duration: 0.3, ease: 'power2.out' });
        });
    });

    /* ==============================================================
       2. NAVIGATION — transition-driven active-state sync
       ============================================================== */
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === targetId);
                if (targetIdx !== -1) {
                    window.sectionMgr.goToSection(targetIdx, { duration: 1.5, unloadTimeScale: 5 });
                }
            }
        });

        item.addEventListener('mouseenter', () => {
            if (!item.hasAttribute('aria-current')) {
                gsap.to(item, { scale: 1.08, duration: 0.3, ease: 'power2.out' });
            }
        });
        item.addEventListener('mouseleave', () => {
            if (!item.hasAttribute('aria-current')) {
                gsap.to(item, { scale: 1, duration: 0.3, ease: 'power2.out' });
            }
        });
    });

    setTimeout(() => {
        if (window.sectionMgr) {
            window.sectionMgr.on('transitionStarted', ({ from, to }) => {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === to);
                if (targetIdx !== -1) {
                    setActiveNav(navItems[targetIdx]);
                }
            });
        }
    }, 100);

    /* ==============================================================
       3. HERO CTA BUTTONS
       ============================================================== */
    const exploreBtn = document.getElementById('explore-works-btn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === 'projects-section');
                if (targetIdx !== -1) window.sectionMgr.goToSection(targetIdx);
            }
        });
    }

    const manifestoBtn = document.getElementById('view-manifesto-btn');
    if (manifestoBtn) {
        manifestoBtn.addEventListener('click', () => {
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === 'about-section');
                if (targetIdx !== -1) window.sectionMgr.goToSection(targetIdx, { scrollToId: 'about-details' });
            }
        });
    }

    const journeyBtn = document.getElementById('view-journey-btn');
    if (journeyBtn) {
        journeyBtn.addEventListener('click', () => {
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === 'about-section');
                if (targetIdx !== -1) window.sectionMgr.goToSection(targetIdx, { scrollToId: 'journey-card' });
            }
        });
    }

    /* ==============================================================
       4. PROJECT MODAL — click any project card to open its details
       ============================================================== */
    const modal = document.getElementById('project-modal');
    const modalBackdrop = document.getElementById('project-modal-backdrop');
    const modalPanel = document.getElementById('project-modal-panel');
    const modalClose = document.getElementById('project-modal-close');
    const modalImage = document.getElementById('project-modal-image');
    const modalTag = document.getElementById('project-modal-tag');
    const modalTitle = document.getElementById('project-modal-title');
    const modalDesc = document.getElementById('project-modal-desc');
    const modalStack = document.getElementById('project-modal-stack');

    function openProjectModal(id) {
        const data = projectsData[id];
        if (!data || !modal) return;

        modalImage.style.backgroundImage = `url('${data.image}')`;
        modalTag.textContent = data.tag;
        modalTitle.textContent = data.title;
        modalDesc.textContent = data.desc;
        modalStack.innerHTML = '';
        data.stack.forEach(tech => {
            const chip = document.createElement('span');
            chip.className = 'px-4 py-2 bg-white/5 rounded-full text-on-surface-variant font-label-sm text-[11px] uppercase';
            chip.textContent = tech;
            modalStack.appendChild(chip);
        });

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        gsap.fromTo(modalBackdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(modalPanel, { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' });
    }

    function closeProjectModal() {
        if (!modal) return;
        gsap.to(modalPanel, { opacity: 0, y: 20, scale: 0.97, duration: 0.25, ease: 'power2.in' });
        gsap.to(modalBackdrop, {
            opacity: 0, duration: 0.25, onComplete: () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                document.body.style.overflow = '';
            }
        });
    }

    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-project');
            openProjectModal(id);
        });
    });

    if (modalClose) modalClose.addEventListener('click', closeProjectModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeProjectModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeProjectModal();
    });

    /* ==============================================================
       5. GLOBAL BACKGROUND — parallax mouse drift (ref.md)
       ============================================================== */
    const scrubBg = document.getElementById('scrub-bg');
    if (scrubBg) {
        // Slightly scale up background to prevent black edges during drift
        gsap.set(scrubBg, { scale: 1.05 });
        window.addEventListener('mousemove', (e) => {
            const xPos = (e.clientX / window.innerWidth - 0.5) * 24; // subtle drift range
            const yPos = (e.clientY / window.innerHeight - 0.5) * 24;
            gsap.to(scrubBg, {
                x: xPos,
                y: yPos,
                duration: 2.2,
                ease: 'power2.out'
            });
        });
    }

    /* ==============================================================
       6. SEQUENCE BUTTON & STUB
       ============================================================== */
    window.sequence = function () {
        console.log('Sequence button triggered!');
    };

    const tokenBtn = document.getElementById('nav-logo-token');
    if (tokenBtn) {
        tokenBtn.addEventListener('click', () => {
            if (typeof window.sequence === 'function') {
                window.sequence();
            }
        });
    }
});
