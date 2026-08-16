import SectionManager from './SectionManager.js';
import { initParticles } from './particles.js';
import { initHackerText } from './hackerRenderer.js';

document.addEventListener('DOMContentLoaded', () => {
    const sectionMgr = new SectionManager();
    initParticles('particles-canvas');
    initHackerText();

    // 0. Email Copy
    const email = document.getElementById('email-copy');
    email.addEventListener('click', async () => {
        const originalText = email.textContent.trim();
        try {
            await navigator.clipboard.writeText(originalText);
            email.textContent = 'Copied!';
            setTimeout(() => {
                email.textContent = originalText;
            }, 1500);
        } catch (error) {
            console.error('Failed to copy email:', error);
        }
    });

    const sectionOrder = [
        'home-section',
        'about-section',
        'projects-section',
        'contact-section'
    ];
    sectionMgr.registerSections(sectionOrder);

    const { gsap } = window;

    // 1. Home Section Entrance Timeline
    const homeTl = gsap.timeline();
    homeTl
        .fromTo('#main-glass', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out' })
        .fromTo('#home-section h1', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power4.out' }, '-=0.8')
        .fromTo('.project-hover-card', { scale: 0.8, opacity: 0 }, {
            scale: 1, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'back.out(1.7)'
        }, '-=0.6')
        .fromTo('#bento-section', { opacity: 0, y: 60, scale: 0.96, filter: 'blur(6px)' }, {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out'
        }, '-=0.4');
    sectionMgr.animationManager.registerTimeline('home-section', homeTl);

    // 2. About Section Entrance Timeline
    const aboutTl = gsap.timeline();
    aboutTl
        .fromTo('.about-hero-text > *', { y: 50, opacity: 0 }, {
            y: 0, opacity: 1, duration: 1, stagger: 0.15, ease: 'power4.out'
        })
        .fromTo('.about-hero-image', { scale: 0.9, opacity: 0 }, {
            scale: 1, opacity: 1, duration: 1.5, ease: 'expo.out'
        }, '-=0.8')
        .fromTo('#about-details', { opacity: 0, y: 60, scale: 0.96, filter: 'blur(6px)' }, {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out'
        }, '-=0.6');
    sectionMgr.animationManager.registerTimeline('about-section', aboutTl);

    // 3. Projects Section Entrance Timeline
    const projectsTl = gsap.timeline();
    projectsTl
        .fromTo('#projects-section > div:not(#project-grid)', { opacity: 0, y: 30 }, {
            opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out'
        })
        .fromTo('.project-card', { opacity: 0, scale: 0.95, y: 30 }, {
            opacity: 1, scale: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out'
        }, '-=0.6');
    sectionMgr.animationManager.registerTimeline('projects-section', projectsTl);

    // 4. Contact Section Entrance Timeline
    const contactTl = gsap.timeline({ paused: true });
    contactTl
        .fromTo('#contact-section .grid > div:first-child > *', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.15, ease: 'power4.out' })
        .fromTo('#contact-section .grid > div:last-child', { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'expo.out' }, '-=0.6');
    sectionMgr.animationManager.registerTimeline('contact-section', contactTl);

    window.sectionMgr = sectionMgr;

    // Boot/Entrance Loader Logic
    const bootScreen = document.getElementById('boot-screen');
    const bootPercent = document.getElementById('boot-percent');
    const bootStatus = document.getElementById('boot-status');
    const bootCursor = document.getElementById('boot-cursor');

    let isLoaded = false;
    let progress = { val: 0 };

    // Function to update status text depending on count value
    function updateStatus(val) {
        if (!bootStatus) return;
        if (val < 25) {
            bootStatus.textContent = '> initializing...';
        } else if (val < 60) {
            bootStatus.textContent = '> loading interface...';
        } else if (val < 95) {
            bootStatus.textContent = '> preparing assets...';
        } else if (val >= 100) {
            bootStatus.textContent = '> system ready_';
        }
    }

    // Set listener for window load
    window.addEventListener('load', () => {
        isLoaded = true;
    });
    // Fallback if load has already fired or completes immediately
    if (document.readyState === 'complete') {
        isLoaded = true;
    }

    // Initial progress count animation from 0% to 95%
    gsap.to(progress, {
        val: 95,
        duration: 1.2,
        ease: 'power1.out',
        onUpdate: () => {
            const currentPct = Math.floor(progress.val);
            if (bootPercent) bootPercent.textContent = currentPct + '%';
            updateStatus(currentPct);
        },
        onComplete: () => {
            // Check if page has finished loading
            checkCompletion();
        }
    });

    function checkCompletion() {
        if (isLoaded) {
            // Smoothly complete the loading to 100%
            gsap.to(progress, {
                val: 100,
                duration: 0.3,
                ease: 'power1.in',
                onUpdate: () => {
                    const currentPct = Math.floor(progress.val);
                    if (bootPercent) bootPercent.textContent = currentPct + '%';
                    updateStatus(currentPct);
                },
                onComplete: () => {
                    // Blink cursor off/hide it for clean entrance
                    if (bootCursor) bootCursor.style.display = 'none';

                    // Smooth exit: fade out and slide up
                    const exitTl = gsap.timeline({
                        onComplete: () => {
                            if (bootScreen) bootScreen.style.display = 'none';

                            // Initialize portfolio landing section animation
                            sectionMgr.animationManager.play('home-section').then(() => {
                                if (window.playHackerTextsInSection) {
                                    window.playHackerTextsInSection('home-section');
                                }
                            });
                        }
                    });

                    exitTl.to(bootScreen, {
                        opacity: 0,
                        yPercent: -100,
                        duration: 0.8,
                        ease: 'power3.inOut',
                        delay: 0.3
                    });
                }
            });
        } else {
            // Keep checking until page is ready
            setTimeout(checkCompletion, 50);
        }
    }
});
