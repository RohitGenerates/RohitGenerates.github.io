import TransitionManager from './TransitionManager.js';
import AnimationManager from './AnimationManager.js';
import ScrollLock from './ScrollLock.js';
import EventEmitter from './EventEmitter.js';

const { gsap } = window;

export default class SectionManager {
    constructor() {
        this.emitter = new EventEmitter();
        this.sections = [];
        this.currentIndex = 0;
        this.scrollLock = new ScrollLock();
        this.transitionManager = new TransitionManager(this.scrollLock);
        this.animationManager = new AnimationManager();

        this.transitionManager.on('transitionStarted', data => {
            this.emitter.emit('transitionStarted', data);
        });
        this.transitionManager.on('transitionFinished', data => this.emitter.emit('transitionFinished', data));

        this.emitter.on('transitionFinished', data => this._onTransitionFinished(data));

        this.touchStartY = 0;

        this._onWheel = this._onWheel.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);

        window.addEventListener('wheel', this._onWheel, { passive: false });
        window.addEventListener('touchstart', this._onTouchStart, { passive: true });
        window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    }

    on(event, cb) { this.emitter.on(event, cb); }

    registerSections(sectionIds) {
        this.sections = sectionIds.map(id => ({ id, el: document.getElementById(id) }));
        this.sections.forEach((s, i) => {
            s.el.dataset.sectionIndex = i;
            if (i !== this.currentIndex) {
                s.el.style.display = 'none';
            }
        });
    }

    registerEntrance(sectionId, selector, config) {
        this.animationManager.register(sectionId, selector, config);
    }

    goToSection(targetIdx, opts = {}) {
        if (targetIdx < 0 || targetIdx >= this.sections.length) return;
        if (this.scrollLock.isLocked()) return;
        if (targetIdx === this.currentIndex) return;

        const fromSec = this.sections[this.currentIndex];
        const toSec = this.sections[targetIdx];

        const isGoingDown = targetIdx > this.currentIndex;

        this.currentIndex = targetIdx;

        this.scrollLock.lock();

        let unloadTimeScale = opts.unloadTimeScale;
        if (unloadTimeScale === undefined) {
            const tl = this.animationManager.timelines.get(fromSec.id);
            if (tl) {
                unloadTimeScale = tl.duration() / 1.3;
                unloadTimeScale = Math.max(1.0, Math.min(2.5, unloadTimeScale));
            } else {
                unloadTimeScale = 2.5;
            }
        }

        this.animationManager.unload(fromSec.id, unloadTimeScale, isGoingDown);

        this.transitionManager.play(fromSec.id, toSec.id, {
            ...opts,
            onMidpoint: () => {
                toSec.el.style.display = '';

                fromSec.el.style.display = 'none';

                gsap.set(fromSec.el, { opacity: 1, y: 0 });

                const fromTl = this.animationManager.timelines.get(fromSec.id);
                if (fromTl) {
                    fromTl.progress(0).pause();
                }

                if (opts.scrollToId) {
                    const targetSubEl = document.getElementById(opts.scrollToId);
                    if (targetSubEl) {
                        let top = 0;
                        let curr = targetSubEl;
                        while (curr) {
                            top += curr.offsetTop;
                            curr = curr.offsetParent;
                        }
                        window.scrollTo(0, top);
                        return;
                    }
                }
                window.scrollTo(0, 0);
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
                return;
            }
            e.preventDefault();
            this.goToNextSection();
        } else {
            if (!isAtTop) {
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
        const deltaY = this.touchStartY - touchY;
        if (Math.abs(deltaY) < 10) return;

        const isScrollingDown = deltaY > 0;
        const isAtBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5;
        const isAtTop = window.scrollY <= 5;

        if (isScrollingDown) {
            if (!isAtBottom) return;
            e.preventDefault();
            this.goToNextSection();
        } else {
            if (!isAtTop) return;
            e.preventDefault();
            this.goToPrevSection();
        }
    }

    _onTransitionFinished({ from, to }) {
        const target = this.sections.find(s => s.id === to);
        if (!target) {
            this.scrollLock.unlock();
            this.transitionManager.isTransitioning = false;
            return;
        }

        gsap.to(target.el, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.0, ease: 'power2.out' });

        this.scrollLock.unlock();
        this.transitionManager.isTransitioning = false;
        this.animationManager.play(to);
    }
}
