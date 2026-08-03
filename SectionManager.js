// SectionManager observes scroll boundaries using wheel/touch events and orchestrates
// transitions and entrance animations.

import TransitionManager from './TransitionManager.js';
import AnimationManager from './AnimationManager.js';
import ScrollLock from './ScrollLock.js';
import EventEmitter from './EventEmitter.js';

const { gsap } = window;

export default class SectionManager {
    constructor() {
        this.emitter = new EventEmitter();
        this.sections = []; // Array of {id, el}
        this.currentIndex = 0;
        this.scrollLock = new ScrollLock();
        this.scrollLock.lock(); // Lock initially until home animation finishes
        this.transitionManager = new TransitionManager(this.scrollLock);
        this.animationManager = new AnimationManager();

        // Forward transition events downstream for other subsystems
        this.transitionManager.on('transitionStarted', data => {
            this.emitter.emit('transitionStarted', data);
        });
        this.transitionManager.on('transitionFinished', data => this.emitter.emit('transitionFinished', data));
        
        // Handle completion locally
        this.emitter.on('transitionFinished', data => this._onTransitionFinished(data));

        this.touchStartY = 0;

        // Bind events
        this._onWheel = this._onWheel.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);

        window.addEventListener('wheel', this._onWheel, { passive: false });
        window.addEventListener('touchstart', this._onTouchStart, { passive: true });
        window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    }

    /* PUBLIC */
    on(event, cb) { this.emitter.on(event, cb); }

    registerSections(sectionIds) {
        this.sections = sectionIds.map(id => ({ id, el: document.getElementById(id) }));
        // Ensure each section has a data attribute for root detection
        this.sections.forEach((s, i) => {
            s.el.dataset.sectionIndex = i;
            if (i !== this.currentIndex) {
                s.el.style.display = 'none'; // Unload inactive sections
            }
        });
    }

    registerEntrance(sectionId, selector, config) {
        this.animationManager.register(sectionId, selector, config);
    }

    goToSection(targetIdx, opts = {}) {
        if (targetIdx < 0 || targetIdx >= this.sections.length) return;
        if (this.scrollLock.isLocked()) return;

        const fromSec = this.sections[this.currentIndex];
        const toSec = this.sections[targetIdx];
        const isDown = targetIdx > this.currentIndex;

        this.currentIndex = targetIdx;

        // Reveal the target section display so it's active in layout
        toSec.el.style.display = '';

        // Play the fullscreen transition
        this.transitionManager.play(fromSec.id, toSec.id, {
            ...opts,
            onMidpoint: () => {
                // Midpoint: screen is covered by opaque video.
                // Safely hide the old section and reset scroll offset.
                fromSec.el.style.display = 'none';

                if (isDown) {
                    window.scrollTo(0, 0);
                } else {
                    const scrollTarget = toSec.el.scrollHeight - window.innerHeight;
                    window.scrollTo(0, Math.max(0, scrollTarget));
                }
            }
        });
    }

    goToNextSection() {
        if (this.currentIndex < this.sections.length - 1) {
            this.goToSection(this.currentIndex + 1);
        }
    }

    goToPrevSection() {
        if (this.currentIndex > 0) {
            this.goToSection(this.currentIndex - 1);
        }
    }

    /* ======================================================================
       INTERNAL
    ====================================================================== */
    _onWheel(e) {
        if (this.scrollLock.isLocked()) {
            e.preventDefault();
            return;
        }

        const delta = e.deltaY;
        if (delta === 0) return;

        const isScrollingDown = delta > 0;
        const isAtBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5;
        const isAtTop = window.scrollY <= 5;

        if (isScrollingDown) {
            if (!isAtBottom) {
                // Let normal browser scrolling happen inside the section
                return;
            }
            e.preventDefault();
            this.goToNextSection();
        } else {
            if (!isAtTop) {
                // Let normal browser scrolling happen inside the section
                return;
            }
            e.preventDefault();
            this.goToPrevSection();
        }
    }

    _onTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
    }

    _onTouchMove(e) {
        if (this.scrollLock.isLocked()) {
            e.preventDefault();
            return;
        }

        const touchY = e.touches[0].clientY;
        const deltaY = this.touchStartY - touchY; // positive deltaY = swipe up (scrolling down)
        if (Math.abs(deltaY) < 10) return; // ignore minor drifts

        const isScrollingDown = deltaY > 0;
        const isAtBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5;
        const isAtTop = window.scrollY <= 5;

        if (isScrollingDown) {
            if (!isAtBottom) return; // let natural touch scroll occur
            e.preventDefault();
            this.goToNextSection();
        } else {
            if (!isAtTop) return; // let natural touch scroll occur
            e.preventDefault();
            this.goToPrevSection();
        }
    }

    _onTransitionFinished({ from, to }) {
        const target = this.sections.find(s => s.id === to);
        if (!target) {
            // Unlocked if target not registered
            this.scrollLock.unlock();
            this.transitionManager.isTransitioning = false;
            return;
        }

        // Reveal target immediately
        gsap.to(target.el, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.0, ease: 'power2.out' });
        
        this.animationManager.play(to).then(() => {
            this.scrollLock.unlock();
            this.transitionManager.isTransitioning = false;
        });
    }
}
