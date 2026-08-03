document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    /* ==============================================================
       PROJECT DATA — powers the click-to-open detail cards
       ============================================================== */
    const projectsData = {
        'neon-genesis': {
            tag: 'Case Study / Interaction',
            title: 'Neon Genesis UI',
            image: 'assets/project-ai-assistant.jpg',
            desc: 'An interaction-first interface exploring how conversational AI can feel alive on screen — layered holographic panels, ambient audio-reactive glows, and micro-feedback on every input.',
            stack: ['TypeScript', 'Three.js', 'WebGL', 'GSAP']
        },
        'system-archive': {
            tag: 'Data Visualization',
            title: 'System Archive',
            image: 'assets/project-cyber-dashboard.jpg',
            desc: 'A data-visualization project focused on character mechanical design blueprints — turning static schematics into an explorable, filterable archive.',
            stack: ['React', 'D3.js', 'Node.js']
        },
        'digital-soul': {
            tag: 'Personal / Systems',
            title: 'Digital Soul',
            image: 'assets/project-developer.jpg',
            desc: 'A personal workspace dashboard built to track deep-work sessions, project momentum, and creative output over time.',
            stack: ['Next.js', 'Tailwind', 'SQLite']
        },
        'vibe-streamer': {
            tag: 'Mobile App',
            title: 'Vibe Streamer',
            image: 'assets/project-music-platform.jpg',
            desc: 'Redesigning the streaming experience for the next generation of anime fans — gesture-first navigation, live watch parties, and a queue that adapts to mood.',
            stack: ['Kotlin', 'Jetpack Compose', 'Firebase']
        },
        'robotics': {
            tag: 'Systems / Robotics',
            title: 'Autonomous Robotics Framework',
            image: 'assets/project-robotics.jpg',
            desc: 'A modular control framework for autonomous ground units — sensor fusion, path planning, and a real-time telemetry dashboard for monitoring fleet behavior.',
            stack: ['Python', 'ROS2', 'C++', 'OpenCV']
        },
        'smart-city': {
            tag: 'Data Viz / Infrastructure',
            title: 'Smart City Dashboard',
            image: 'assets/project-smart-city.jpg',
            desc: 'A city-scale monitoring dashboard aggregating traffic, air quality, and energy data into a single live operations view for municipal planners.',
            stack: ['Vue', 'MapboxGL', 'PostgreSQL']
        },
        'creative-direction': {
            tag: 'Direction',
            title: 'Creative Direction',
            image: 'assets/project-cyber-dashboard.jpg',
            desc: 'Crafting unique visual languages from scratch — art direction, motion systems, and design tokens built for teams shipping high-energy interactive products.',
            stack: ['Figma', 'After Effects', 'Design Systems']
        }
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
       4. CARD HOVER MICRO-INTERACTIONS
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
       5. NAVIGATION — transition-driven active-state sync
       ============================================================== */
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === targetId);
                if (targetIdx !== -1) {
                    window.sectionMgr.goToSection(targetIdx, { duration: 1.5 });
                }
            }
        });

        item.addEventListener('mouseenter', () => {
            if (!item.hasAttribute('aria-current')) {
                gsap.to(item, { backgroundColor: 'rgba(255, 255, 255, 0.1)', scale: 1.08, duration: 0.3 });
            }
        });
        item.addEventListener('mouseleave', () => {
            if (!item.hasAttribute('aria-current')) {
                gsap.to(item, { backgroundColor: 'transparent', scale: 1, duration: 0.3 });
            }
        });
    });

    // Reactively update nav bar active indicators based on current visible sections
    setTimeout(() => {
        if (window.sectionMgr) {
            window.sectionMgr.on('transitionStarted', ({ from, to }) => {
                // Map sections & subsections to their corresponding parent nav items
                let navIdx = 0;
                if (to === 'home-section' || to === 'bento-section') {
                    navIdx = 0;
                } else if (to === 'about-section' || to === 'about-details') {
                    navIdx = 1;
                } else if (to === 'projects-section') {
                    navIdx = 2;
                } else if (to === 'contact-section') {
                    navIdx = 3;
                }
                setActiveNav(navItems[navIdx]);
            });
        }
    }, 100);

    /* ==============================================================
       6. HERO CTA BUTTONS
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
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === 'about-details');
                if (targetIdx !== -1) window.sectionMgr.goToSection(targetIdx);
            }
        });
    }

    const journeyBtn = document.getElementById('view-journey-btn');
    if (journeyBtn) {
        journeyBtn.addEventListener('click', () => {
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === 'about-details');
                if (targetIdx !== -1) window.sectionMgr.goToSection(targetIdx);
            }
        });
    }

    /* ==============================================================
       7. PROJECT MODAL — click any project card to open its details
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
       8. GLOBAL BACKGROUND — parallax mouse drift (ref.md)
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
       9. SEQUENCE BUTTON & STUB
       ============================================================== */
    window.sequence = function () {
        console.log('Sequence button triggered!');
        // Sequence implementation stub
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
