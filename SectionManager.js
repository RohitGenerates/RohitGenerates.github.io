// SectionManager observes scroll boundaries using ScrollTrigger and orchestrates
// transitions and entrance animations.

import TransitionManager from './TransitionManager.js';
import AnimationManager from './AnimationManager.js';
import ScrollLock from './ScrollLock.js';
import EventEmitter from './EventEmitter.js';
// Expect GSAP to be global
const { gsap, ScrollTrigger } = window;

export default class SectionManager {
    constructor() {
        this.emitter = new EventEmitter();
        this.sections = []; // Array of {id, el}
        this.currentIndex = 0;
        this.scrollTrigger = ScrollTrigger;
        this.scrollLock = new ScrollLock();
        this.transitionManager = new TransitionManager(this.scrollLock);
        this.animationManager = new AnimationManager();
        this.setupScrollTriggers();

        // Forward transition events downstream for other subsystems
        this.transitionManager.on('transitionStarted', data => this.emitter.emit('transitionStarted', data));
        this.transitionManager.on('transitionFinished', data => this.emitter.emit('transitionFinished', data));
        // Handle completion locally
        this.emitter.on('transitionFinished', data => this._onTransitionFinished(data));
    }

    /* PUBLIC*/
    on(event, cb) { this.emitter.on(event, cb); }

    registerSections(sectionIds) {
        this.sections = sectionIds.map(id => ({ id, el: document.getElementById(id) }));
        // Ensure each section has a data attribute for root detection
        this.sections.forEach((s, i) => { s.el.dataset.sectionIndex = i; });
    }

    /* Used by the page to declare entrance timelines */
    registerEntrance(sectionId, selector, config) {
        this.animationManager.register(sectionId, selector, config);
    }

    /* ======================================================================
       INTERNAL
    ====================================================================== */
    setupScrollTriggers() {
        // Each section will get a ScrollTrigger that fires when its *bottom*
        // reaches 40% of viewport (adjustable via data attributes if needed)
        this.sections.forEach((s, i) => {
            // Only create triggers for sections after the 0th
            if (i === 0) return;
            gsap.to(s.el, {
                scrollTrigger: {
                    trigger: s.el,
                    start: 'top bottom', // when top of section reaches bottom of viewport
                    onEnter: () => this._handleBoundary(i - 1, i), // next section enters, trigger transition
                }
            });
        });
    }

    _handleBoundary(currentIdx, targetIdx) {
        if (this.scrollLock.isLocked()) return; // ignore if already in transition
        const current = this.sections[currentIdx];
        const target = this.sections[targetIdx];
        if (!current || !target) return;
        // Transition request
        this.transitionManager.play(current.id, target.id);
        // Listen to transition finished to reveal and play entrance
        this.transitionManager.emit('transitionFinished', { from: current.id, to: target.id });
        // First hide target section until transition starts
        gsap.set(target.el, { opacity: 0, scale: 0.96, filter: 'blur(6px)' });
        // The actual reveal will be done in transitionFinished callback below
    }

    // Called by TransitionManager once finished (we forward the call via event)
    _onTransitionFinished({ from, to }) {
        const target = this.sections.find(s => s.id === to);
        if (!target) return;
        // Reveal target immediately
        gsap.to(target.el, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.0, ease: 'power2.out' });
        this.animationManager.play(to).then(() => {
            this.scrollLock.unlock();
            this.transitionManager.isTransitioning = false;
        });
    }
}
