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
       1. SCROLL REVEAL — the "fluid" motion used across every section
       ============================================================== */
    const revealTargets = gsap.utils.toArray('.page-subsection');

    gsap.set(revealTargets, { opacity: 0, y: 60, scale: 0.96, filter: 'blur(6px)' });

    revealTargets.forEach((el, i) => {
        gsap.to(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                end: 'top 40%',
                scrub: 1,
            },
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            ease: 'power2.out'
        });

        if (i < revealTargets.length - 1) {
            gsap.to(el, {
                scrollTrigger: {
                    trigger: el,
                    start: 'bottom 40%',
                    end: 'bottom 5%',
                    scrub: 1,
                },
                opacity: 0.3,
                scale: 0.96,
                filter: 'blur(8px)',
                ease: 'none'
            });
        }
    });

    // First section visible immediately on load
    gsap.to('#home-section', {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 1.4,
        ease: 'expo.out',
        delay: 0.15
    });

    /* ==============================================================
       NAV / SECTION SETUP (shared by scroll-spy + both scrub systems)
       ============================================================== */
    const navItems = document.querySelectorAll('.nav-item');
    const sectionOrder = ['home-section', 'about-section', 'projects-section', 'contact-section'];
    const sectionsForNav = sectionOrder.map(id => document.getElementById(id));

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

    function scrollToTarget(targetEl, duration) {
        if (!targetEl) return;
        gsap.to(window, {
            duration: duration,
            scrollTo: { y: targetEl, offsetY: 0 },
            ease: 'power3.inOut'
        });
    }

    /* ==============================================================
       2. SCRUB BACKGROUND — image <-> video crossfade
       ------------------------------------------------------------
       Two INDEPENDENT drivers control the same video/img pair:

       A) SCROLL-DRIVEN (scrub: tied 1:1 to scroll position). Runs once
          per section boundary — as you scroll past the end of one
          section into the next, the video comes forward and plays,
          then crossfades back to the still image once you land on
          the new section.

       B) NAV-DRIVEN (fast, fixed-duration, plays automatically when a
          sidebar nav button is clicked). While this plays, the
          scroll-driven ScrollTriggers for the crossfade are disabled
          so the two systems never fight over video.currentTime /
          opacity at the same time. They're re-enabled the moment the
          nav animation + programmatic scroll finish, at which point
          ScrollTrigger re-syncs itself to the arrived scroll position.
       ============================================================== */
    // Scrub background boundaries are now handled by TransitionManager.

    // B) Fast, nav-triggered version — independent of scroll.
    function playScrubFast(callback) {
        if (window.sectionMgr && window.sectionMgr.transitionManager) {
            window.sectionMgr.transitionManager.play('nav', 'nav', { duration: 0.85 });
        }
        if (callback) callback();
    }

    /* ==============================================================
       3. ENTRANCE ANIMATIONS
       ============================================================== */
    const entryTl = gsap.timeline({ delay: 0.3 });
    entryTl
        .from('#main-glass', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out' })
        .from('#home-section h1', { y: 40, opacity: 0, duration: 1, ease: 'power4.out' }, '-=0.8')
        .from('.project-hover-card', {
            scale: 0.8, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'back.out(1.7)'
        }, '-=0.6');

    gsap.from('.about-hero-text > *', {
        scrollTrigger: {
            trigger: '#about-section',
            start: 'top 60%',
            toggleActions: 'play reverse play reverse'
        },
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power4.out'
    });

    gsap.from('.about-hero-image', {
        scrollTrigger: {
            trigger: '#about-section',
            start: 'top 60%',
            toggleActions: 'play reverse play reverse'
        },
        scale: 0.9,
        opacity: 0,
        duration: 1.5,
        ease: 'expo.out'
    });

    gsap.set('.project-card', { opacity: 0, scale: 0.95, y: 30 });
    gsap.to('.project-card', {
        scrollTrigger: {
            trigger: '#project-grid',
            start: 'top 75%',
            toggleActions: 'play reverse play reverse'
        },
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 1,
        stagger: 0.08,
        ease: 'power3.out'
    });

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
       5. NAVIGATION — smooth scroll + active-state sync + fast scrub
       ============================================================== */
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            scrollToTarget(document.getElementById(targetId), 0.6);
            playScrubFast(); // independent fast crossfade, runs alongside the scroll
            setActiveNav(item);
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

    // ScrollSpy: keep nav in sync during free scrolling
    sectionsForNav.forEach((section, i) => {
        if (!section) return;
        ScrollTrigger.create({
            trigger: section,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => setActiveNav(navItems[i]),
            onEnterBack: () => setActiveNav(navItems[i]),
        });
    });

    /* ==============================================================
       6. HERO CTA BUTTONS
       ============================================================== */
    const exploreBtn = document.getElementById('explore-works-btn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            const target = document.getElementById('projects-section');
            scrollToTarget(target, 1.1);
            setActiveNav(document.querySelector('.nav-item[data-target="projects-section"]'));
        });
    }

    const manifestoBtn = document.getElementById('view-manifesto-btn');
    if (manifestoBtn) {
        manifestoBtn.addEventListener('click', () => {
            const target = document.getElementById('about-details');
            scrollToTarget(target, 1.1);
            setActiveNav(document.querySelector('.nav-item[data-target="about-section"]'));
        });
    }

    const journeyBtn = document.getElementById('view-journey-btn');
    if (journeyBtn) {
        journeyBtn.addEventListener('click', () => {
            const target = document.getElementById('journey-card');
            scrollToTarget(target, 1.1);
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
});
