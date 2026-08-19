document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    /* ==============================================================
       PROJECT DATA — powers the click-to-open detail cards
       ============================================================== */
    const projectsData = {
        'neural-armor': {
            tag: 'Major Project / Cybersecurity',
            title: 'NeuralArmor',
            images: ['assets/project-ai-assistant.webp', 'assets/project-cyber-dashboard.webp', 'assets/project-developer.webp'],
            desc: 'Model-agnostic security reverse proxy for autonomous perception systems. Built with FastAPI, featuring OSCP-based adversarial purification, KL-divergence detection, and ART-based red teaming with PGD/FGSM attacks. Includes Grad-CAM forensic visualization and real-time security telemetry.',
            stack: ['FastAPI', 'Python', 'ART', 'CVPR 2025', 'Grad-CAM XAI']
        },
        'digital-footprint-analyzer': {
            tag: 'Cybersecurity / Privacy',
            title: 'Digital Footprint Analyzer',
            images: ['assets/project-cyber-dashboard.webp', 'assets/project-developer.webp', 'assets/project-music-platform.webp'],
            desc: 'Real-time web privacy risk auditor built with mitmproxy, Flask, and a Manifest V3 Chrome extension. Tracks fingerprinting signals and cookies to compute live 0–100 domain risk scores via non-intrusive network analysis and PostgreSQL visualization.',
            stack: ['Python', 'Flask', 'mitmproxy', 'PostgreSQL', 'Chrome Extension']
        },
        'connect-net': {
            tag: 'Emergency Tech / Hackathon',
            title: 'ConnectNet',
            images: ['assets/project-developer.webp', 'assets/project-music-platform.webp', 'assets/project-robotics.webp'],
            desc: 'Offline-first emergency rescue platform built in 6 hours at VIDYUT 2K25. Utilizes BLE/Wi-Fi Direct mesh networking with Room DB and Firebase for live SOS alert synchronization on a Google Maps dashboard—entirely offline-capable.',
            stack: ['Android', 'Kotlin', 'Room DB', 'Firebase', 'Google Maps']
        },
        'vibe-streamer': {
            tag: 'Research / Publication',
            title: 'Multi-Vector Guardrails',
            images: ['assets/project-music-platform.webp', 'assets/project-robotics.webp', 'assets/project-smart-city.webp'],
            desc: 'Peer-reviewed book chapter in IIP Proceedings Vol 6, Book 2. Authored original research on Knowledge Engineering for autonomous systems, proposing a dual-path processing architecture (Probabilistic AI vs. Deterministic Backend) for ethical alignment grounded in NeuralArmor empirical data.',
            stack: ['Research', 'Knowledge Engineering', 'Autonomous Systems']
        },
        'robotics': {
            tag: 'Systems / AI',
            title: 'Autonomous Robotics',
            images: ['assets/project-robotics.webp', 'assets/project-ai-assistant.webp', 'assets/project-cyber-dashboard.webp'],
            desc: 'A full-stack autonomous navigation system for mobile robots. Developed using ROS2 and C++, utilizing LiDAR-based SLAM and adaptive path planning algorithms to navigate complex dynamic environments.',
            stack: ['ROS2', 'C++', 'SLAM', 'Python', 'LiDAR']
        },
        'smart-city': {
            tag: 'Data Viz / IoT',
            title: 'Smart City Dashboard',
            images: ['assets/project-smart-city.webp', 'assets/project-cyber-dashboard.webp', 'assets/project-developer.webp'],
            desc: 'A real-time telemetry dashboard for city-wide IoT sensors. Visualizes traffic, air quality, and power consumption using WebSockets and Three.js, processing over 10,000 data points per second.',
            stack: ['React', 'Three.js', 'WebSockets', 'Go', 'InfluxDB']
        },
        'creative-direction': {
            tag: 'Brand / Design',
            title: 'Creative Direction',
            images: ['assets/hero-character.webp', 'assets/about-portrait.webp', 'assets/contact-background.webp'],
            desc: 'Conceptualized and executed the brand identity and digital assets for a next-generation technology studio. Defined the typographic hierarchy, modern dark-mode aesthetic, and 3D visual storytelling principles.',
            stack: ['Figma', 'Blender', 'Photoshop', 'Brand Strategy', 'UI/UX']
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
                if (targetIdx !== -1) window.sectionMgr.goToSection(targetIdx, { duration: 1.5, unloadTimeScale: 5 });
            }
        });
    }

    const manifestoBtn = document.getElementById('view-manifesto-btn');
    if (manifestoBtn) {
        manifestoBtn.addEventListener('click', () => {
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === 'about-section');
                if (targetIdx !== -1) window.sectionMgr.goToSection(targetIdx, { duration: 1.5, unloadTimeScale: 5, scrollToId: 'about-details' });
            }
        });
    }

    const journeyBtn = document.getElementById('view-journey-btn');
    if (journeyBtn) {
        journeyBtn.addEventListener('click', () => {
            if (window.sectionMgr) {
                const targetIdx = window.sectionMgr.sections.findIndex(s => s.id === 'about-section');
                if (window.sectionMgr.currentIndex === targetIdx) {
                    gsap.to(window, { duration: 1, scrollTo: '#about-details', ease: 'power2.out' });
                } else if (targetIdx !== -1) {
                    window.sectionMgr.goToSection(targetIdx, { duration: 1.5, unloadTimeScale: 5, scrollToId: 'about-details' });
                }
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

    // Gallery state variables
    let currentImages = [];
    let currentImageIndex = 0;
    let activeProjectId = null;

    function updateGalleryImage() {
        if (!currentImages || currentImages.length === 0) return;

        // Fade transition for the image gallery
        gsap.to(modalImage, {
            opacity: 0.1,
            duration: 0.15,
            onComplete: () => {
                modalImage.style.backgroundImage = `url('${currentImages[currentImageIndex]}')`;
                gsap.to(modalImage, { opacity: 1, duration: 0.25 });
            }
        });

        // Update dots
        const dots = document.getElementById('gallery-dots');
        if (dots) {
            const dotElements = dots.querySelectorAll('.gallery-dot');
            dotElements.forEach((dot, index) => {
                if (index === currentImageIndex) {
                    dot.classList.remove('bg-white/30', 'w-2');
                    dot.classList.add('bg-primary', 'w-6');
                } else {
                    dot.classList.remove('bg-primary', 'w-6');
                    dot.classList.add('bg-white/30', 'w-2');
                }
            });
        }
    }

    function renderDots() {
        const dotsContainer = document.getElementById('gallery-dots');
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';

        if (currentImages.length <= 1) {
            dotsContainer.classList.add('hidden');
            return;
        }
        dotsContainer.classList.remove('hidden');

        currentImages.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'gallery-dot h-2 rounded-full transition-all duration-300 ';
            if (index === currentImageIndex) {
                dot.className += 'bg-primary w-6';
            } else {
                dot.className += 'bg-white/30 w-2';
            }
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                currentImageIndex = index;
                updateGalleryImage();
            });
            dotsContainer.appendChild(dot);
        });
    }

    function openProjectModal(id, cardElement) {
        const data = projectsData[id];
        if (!data || !modal) return;
        activeProjectId = id;

        // Reset scroll position of the details content panel
        const contentScroll = document.getElementById('project-modal-content-scroll');
        if (contentScroll) contentScroll.scrollTop = 0;

        // Populate images and initialize gallery
        currentImages = data.images || [data.image];
        currentImageIndex = 0;
        modalImage.style.backgroundImage = `url('${currentImages[0]}')`;
        renderDots();

        // Control buttons visibility
        const controlsContainer = document.getElementById('gallery-controls');
        if (controlsContainer) {
            if (currentImages.length <= 1) {
                controlsContainer.classList.add('hidden');
            } else {
                controlsContainer.classList.remove('hidden');
            }
        }

        // Set standard text details
        modalTag.textContent = data.tag;
        modalTitle.textContent = data.title;
        modalDesc.textContent = data.desc;

        // Stack chips
        modalStack.innerHTML = '';
        data.stack.forEach(tech => {
            const chip = document.createElement('span');
            chip.className = 'px-4 py-2 bg-white/5 rounded-full text-on-surface-variant font-label-sm text-[11px] uppercase';
            chip.textContent = tech;
            modalStack.appendChild(chip);
        });

        modalTag.setAttribute('data-hacker-text', 'single');
        modalTag.setAttribute('data-hacker-mode', 'terminal');
        modalTitle.setAttribute('data-hacker-text', 'single');
        modalTitle.setAttribute('data-hacker-mode', 'scramble');
        modalDesc.setAttribute('data-hacker-text', 'single');
        modalDesc.setAttribute('data-hacker-mode', 'terminal');

        // Show modal layout temporarily to measure target dimension
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        if (window.applyHackerText) {
            window.applyHackerText(modalTag);
            window.applyHackerText(modalTitle);
            window.applyHackerText(modalDesc);
        }

        window.sectionMgr?.setScrollEnabled(false);

        // Zoom from element transition
        if (cardElement) {
            const cardRect = cardElement.getBoundingClientRect();
            const finalRect = modalPanel.getBoundingClientRect();

            const scaleX = cardRect.width / finalRect.width;
            const scaleY = cardRect.height / finalRect.height;
            const translateX = (cardRect.left + cardRect.width / 2) - (finalRect.left + finalRect.width / 2);
            const translateY = (cardRect.top + cardRect.height / 2) - (finalRect.top + finalRect.height / 2);

            // Hide inner elements momentarily during scale up for premium look
            gsap.set([modalImage, '#gallery-controls', '#gallery-dots', '#project-modal-content-scroll', modalClose], { opacity: 0 });

            gsap.set(modalPanel, {
                x: translateX,
                y: translateY,
                scaleX: scaleX,
                scaleY: scaleY,
                borderRadius: '24px', // match card border radius
                transformOrigin: 'center center'
            });

            gsap.fromTo(modalBackdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 });

            // Expand modal panel
            gsap.to(modalPanel, {
                x: 0,
                y: 0,
                scaleX: 1,
                scaleY: 1,
                borderRadius: '40px',
                duration: 0.6,
                ease: 'power3.inOut',
                onComplete: () => {
                    // Fade in all inner elements
                    gsap.to([modalImage, '#project-modal-content-scroll', modalClose], { opacity: 1, duration: 0.3 });
                    if (currentImages.length > 1) {
                        gsap.to(['#gallery-controls', '#gallery-dots'], { opacity: 1, duration: 0.3 });
                    }
                }
            });
        } else {
            // Fallback standard animation
            gsap.fromTo(modalBackdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 });
            gsap.fromTo(modalPanel, { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' });
            gsap.set([modalImage, '#gallery-controls', '#gallery-dots', '#project-modal-content-scroll', modalClose], { opacity: 1 });
        }
    }

    function closeProjectModal() {
        if (!modal) return;
        window.sectionMgr?.setScrollEnabled(true);

        const card = document.querySelector(`.project-card[data-project="${activeProjectId}"]`);
        if (card) {
            const cardRect = card.getBoundingClientRect();
            const finalRect = modalPanel.getBoundingClientRect();

            const scaleX = cardRect.width / finalRect.width;
            const scaleY = cardRect.height / finalRect.height;
            const translateX = (cardRect.left + cardRect.width / 2) - (finalRect.left + finalRect.width / 2);
            const translateY = (cardRect.top + cardRect.height / 2) - (finalRect.top + finalRect.height / 2);

            // Fade out inner elements first
            gsap.to([modalImage, '#gallery-controls', '#gallery-dots', '#project-modal-content-scroll', modalClose], {
                opacity: 0,
                duration: 0.15
            });

            // Shrink modal panel back to clicked card
            gsap.to(modalPanel, {
                x: translateX,
                y: translateY,
                scaleX: scaleX,
                scaleY: scaleY,
                borderRadius: '24px',
                duration: 0.5,
                ease: 'power3.inOut'
            });
        } else {
            gsap.to(modalPanel, { opacity: 0, y: 20, scale: 0.97, duration: 0.25, ease: 'power2.in' });
        }

        gsap.to(modalBackdrop, {
            opacity: 0, duration: 0.5, onComplete: () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                document.body.style.overflow = '';
            }
        });
    }

    // Set up gallery navigation actions
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentImages.length <= 1) return;
            currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
            updateGalleryImage();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentImages.length <= 1) return;
            currentImageIndex = (currentImageIndex + 1) % currentImages.length;
            updateGalleryImage();
        });
    }

    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const id = card.getAttribute('data-project');
            openProjectModal(id, card);
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
