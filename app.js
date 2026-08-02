// Entry point – wires together the managers and initialises the site
import SectionManager from './SectionManager.js';

// Initialise after DOM ready and GSAP is available
document.addEventListener('DOMContentLoaded', () => {
    // Create SectionManager
    const sectionMgr = new SectionManager();

    // Register all sections based on the DOM order
    const sectionOrder = ['home-section', 'about-section', 'projects-section', 'contact-section'];
    sectionMgr.registerSections(sectionOrder);

    // Entrance timelines are handled by script.js directly via ScrollTrigger
    // so we don't register them here in AnimationManager.
    window.sectionMgr = sectionMgr;
});
