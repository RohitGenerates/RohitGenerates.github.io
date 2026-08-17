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

        // Allows modals/other UI to temporarily disable section navigation
        this.scrollEnabled = true;

        // --------------------------------------------------
        // Edge-scroll state
        // --------------------------------------------------
        this.edgeArmed = false;
        this.edgeDirection = null;
        this.edgeStretch = 0;

        // --------------------------------------------------
        // Wheel gesture state
        // --------------------------------------------------
        this.wheelActive = false;
        this.wheelDebounce = null;

        // --------------------------------------------------
        // Touch gesture state
        // --------------------------------------------------
        this.touchStartY = 0;
        this.touchEdgeGestureCompleted = false;

        // --------------------------------------------------
        // Event bindings
        // --------------------------------------------------
        this._onWheel = this._onWheel.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);

        // --------------------------------------------------
        // Transition events
        // --------------------------------------------------
        this.transitionManager.on('transitionStarted', data => {
            this.emitter.emit('transitionStarted', data);
        });

        this.transitionManager.on('transitionFinished', data => {
            this.emitter.emit('transitionFinished', data);
        });

        this.emitter.on('transitionFinished', data => {
            this._onTransitionFinished(data);
        });

        // --------------------------------------------------
        // Global input listeners
        // --------------------------------------------------
        window.addEventListener('wheel', this._onWheel, {
            passive: false
        });

        window.addEventListener('touchstart', this._onTouchStart, {
            passive: true
        });

        window.addEventListener('touchmove', this._onTouchMove, {
            passive: false
        });

        window.addEventListener('touchend', this._onTouchEnd, {
            passive: true
        });

        this.scrollToast = document.getElementById('scroll-toast');
        this.toastVisible = false;
    }

    setEdgeArmed(value, direction = null) {
        if (this.edgeArmed === value) return;
        this.edgeArmed = value;
        if (value) {
            if (!this.scrollToast || this.toastVisible) return;
            if (
                direction === 'up' &&
                this.currentIndex === 0
            ) {
                return;
            }
            if (
                direction === 'down' &&
                this.currentIndex === this.sections.length - 1
            ) {
                return;
            }
            this.toastVisible = true;
            if (direction === 'up') {
                this.scrollToast.classList.remove('bottom-8');
                this.scrollToast.classList.add('top-8');
            } else {
                this.scrollToast.classList.remove('top-8');
                this.scrollToast.classList.add('bottom-8');
            }

            const yOffset = direction === 'up' ? 10 : -10;

            gsap.to(this.scrollToast, {
                opacity: 1,
                y: yOffset,
                duration: 0.3,
                ease: 'power2.out',
                overwrite: true
            });
        } else {
            if (!this.scrollToast || !this.toastVisible) return;

            this.toastVisible = false;

            const isTop = this.scrollToast.classList.contains('top-8');
            const yOffset = isTop ? -10 : 10;

            gsap.to(this.scrollToast, {
                opacity: 0,
                y: yOffset,
                duration: 0.3,
                ease: 'power2.in',
                overwrite: true
            });
        }
    }

    on(event, cb) {
        this.emitter.on(event, cb);
    }

    registerSections(sectionIds) {
        this.sections = sectionIds.map(id => ({
            id,
            el: document.getElementById(id)
        }));

        this.sections.forEach((s, i) => {
            if (!s.el) return;

            s.el.dataset.sectionIndex = i;

            if (i !== this.currentIndex) {
                s.el.style.display = 'none';
            }
        });
    }

    registerEntrance(sectionId, selector, config) {
        this.animationManager.register(sectionId, selector, config);
    }

    /* ======================================================================
       SECTION NAVIGATION
    ====================================================================== */

    goToSection(targetIdx, opts = {}) {
        if (targetIdx < 0 || targetIdx >= this.sections.length) return;
        if (this.scrollLock.isLocked()) return;
        if (targetIdx === this.currentIndex) return;

        const fromSec = this.sections[this.currentIndex];
        const toSec = this.sections[targetIdx];

        if (!fromSec || !toSec) return;

        const isGoingDown = targetIdx > this.currentIndex;

        // Make absolutely sure the edge stretch is gone
        this._resetEdgeResistance();

        // Reset edge state
        this.setEdgeArmed(false);
        this.edgeDirection = null;
        this.touchEdgeGestureCompleted = false;

        this.currentIndex = targetIdx;

        this.scrollLock.lock();

        if (window.stopHackerTextsInSection) {
            window.stopHackerTextsInSection(fromSec.id);
        }

        let unloadTimeScale = opts.unloadTimeScale;

        if (unloadTimeScale === undefined) {
            const tl = this.animationManager.timelines.get(fromSec.id);

            if (tl) {
                unloadTimeScale = tl.duration() / 1.3;
                unloadTimeScale = Math.max(
                    1.0,
                    Math.min(2.5, unloadTimeScale)
                );
            } else {
                unloadTimeScale = 2.5;
            }
        }

        this.animationManager.unload(
            fromSec.id,
            unloadTimeScale,
            isGoingDown
        );

        this.transitionManager.play(
            fromSec.id,
            toSec.id,
            {
                ...opts,

                onMidpoint: () => {
                    toSec.el.style.display = '';
                    fromSec.el.style.display = 'none';

                    gsap.set(fromSec.el, {
                        opacity: 1,
                        y: 0
                    });

                    const fromTl =
                        this.animationManager.timelines.get(fromSec.id);

                    if (fromTl) {
                        fromTl.progress(0).pause();
                    }

                    if (window.resetHackerTextsInSection) {
                        window.resetHackerTextsInSection(fromSec.id);
                    }

                    if (opts.scrollToId) {
                        const targetSubEl =
                            document.getElementById(opts.scrollToId);

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
            }
        );
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
       EDGE RESISTANCE
    ====================================================================== */

    _accumulateEdgeResistance(direction, deltaY) {
        const currentSec = this.sections[this.currentIndex];

        if (!currentSec || !currentSec.el) return;

        const maxStretch = 50;

        // Smaller multiplier = softer resistance
        // Larger multiplier = stronger stretch
        const resistance = 0.25;

        this.edgeStretch += Math.abs(deltaY) * resistance;

        this.edgeStretch = Math.min(
            this.edgeStretch,
            maxStretch
        );

        // Scrolling down:
        // pull the section upward.
        //
        // Scrolling up:
        // pull the section downward.
        const yOffset =
            direction === 'down'
                ? -this.edgeStretch
                : this.edgeStretch;

        gsap.to(currentSec.el, {
            y: yOffset,
            duration: 0.12,
            ease: 'power2.out',
            overwrite: true
        });
    }

    _releaseEdgeResistance() {
        const currentSec = this.sections[this.currentIndex];

        if (!currentSec || !currentSec.el) return;

        gsap.to(currentSec.el, {
            y: 0,
            duration: 0.6,
            ease: 'elastic.out(1, 0.45)',
            overwrite: true
        });

        this.edgeStretch = 0;
    }

    _resetEdgeResistance() {
        const currentSec = this.sections[this.currentIndex];

        if (!currentSec || !currentSec.el) {
            this.edgeStretch = 0;
            return;
        }

        gsap.killTweensOf(currentSec.el, 'y');

        gsap.set(currentSec.el, {
            y: 0
        });

        this.edgeStretch = 0;
    }

    /* ======================================================================
       WHEEL
    ====================================================================== */

    _onWheel(e) {
        if (!this.scrollEnabled) return;

        if (this.scrollLock.isLocked()) {
            e.preventDefault();
            return;
        }

        const delta = e.deltaY;

        if (Math.abs(delta) < 1) return;

        // --------------------------------------------------
        // Detect physical wheel/trackpad gestures.
        //
        // Multiple wheel events close together belong to
        // the same physical gesture.
        // --------------------------------------------------
        clearTimeout(this.wheelDebounce);

        const isNewGesture = !this.wheelActive;

        this.wheelActive = true;

        this.wheelDebounce = setTimeout(() => {
            this.wheelActive = false;

            // First gesture has finished.
            // Release the stretch, but KEEP edgeArmed true.
            //
            // This is important:
            // the next separate gesture is what causes
            // the actual section transition.
            if (this.edgeArmed) {
                this._releaseEdgeResistance();
            }
        }, 180);

        const isScrollingDown = delta > 0;

        const isAtBottom =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 20;

        const isAtTop =
            window.scrollY <= 20;

        const isAtEdge = isScrollingDown
            ? isAtBottom
            : isAtTop;

        const currentDirection =
            isScrollingDown ? 'down' : 'up';

        /* --------------------------------------------------
           Normal scrolling inside section
        -------------------------------------------------- */

        if (!isAtEdge) {
            this.setEdgeArmed(false);
            this.edgeDirection = null;
            this.edgeStretch = 0;

            return;
        }

        /* --------------------------------------------------
           We're at an edge.

           Prevent the browser from continuing to scroll
           the page / rubber-band.
        -------------------------------------------------- */

        e.preventDefault();

        /* --------------------------------------------------
           Direction changed while armed
        -------------------------------------------------- */

        if (
            this.edgeArmed &&
            currentDirection !== this.edgeDirection
        ) {
            this.setEdgeArmed(false);
            this.edgeDirection = null;

            this._releaseEdgeResistance();

            return;
        }

        /* --------------------------------------------------
           FIRST physical gesture at the edge
        -------------------------------------------------- */

        if (!this.edgeArmed) {
            this.setEdgeArmed(true, currentDirection);
            this.edgeDirection = currentDirection;
            this.edgeStretch = 0;

            this._accumulateEdgeResistance(
                currentDirection,
                delta
            );

            return;
        }

        /* --------------------------------------------------
           SECOND physical gesture
           
           wheelActive is false only after the previous
           gesture has stopped for ~180ms.
        -------------------------------------------------- */

        if (isNewGesture) {
            const direction = this.edgeDirection;

            this.setEdgeArmed(false);
            this.edgeDirection = null;

            this._resetEdgeResistance();

            if (direction === 'down') {
                this.goToNextSection();
            } else {
                this.goToPrevSection();
            }

            return;
        }

        /* --------------------------------------------------
           Still inside the FIRST gesture.
           
           Continue accumulating the stretch.
        -------------------------------------------------- */

        this._accumulateEdgeResistance(
            currentDirection,
            delta
        );
    }

    /* ======================================================================
       TOUCH
    ====================================================================== */

    _onTouchStart(e) {
        if (!this.scrollEnabled) return;

        if (this.scrollLock.isLocked()) return;

        this.touchStartY = e.touches[0].clientY;

        // This flag tells us whether a previous edge swipe
        // has already completed.
        //
        // false = first swipe
        // true  = second swipe is now allowed
    }

    _onTouchMove(e) {
        if (!this.scrollEnabled) return;

        if (this.scrollLock.isLocked()) {
            e.preventDefault();
            return;
        }

        const touchY = e.touches[0].clientY;

        const deltaY =
            this.touchStartY - touchY;

        if (Math.abs(deltaY) < 10) return;

        const isScrollingDown = deltaY > 0;

        const isAtBottom =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 20;

        const isAtTop =
            window.scrollY <= 20;

        const isAtEdge = isScrollingDown
            ? isAtBottom
            : isAtTop;

        /* --------------------------------------------------
           Normal scrolling inside section
        -------------------------------------------------- */

        if (!isAtEdge) {
            this.setEdgeArmed(false);
            this.edgeDirection = null;
            this.touchEdgeGestureCompleted = false;

            this._resetEdgeResistance();

            return;
        }

        // We're at an edge, so prevent native rubber-banding.
        e.preventDefault();

        const direction =
            isScrollingDown ? 'down' : 'up';

        /* --------------------------------------------------
           Direction changed
        -------------------------------------------------- */

        if (
            this.edgeArmed &&
            direction !== this.edgeDirection
        ) {
            this.setEdgeArmed(false);
            this.edgeDirection = null;
            this.touchEdgeGestureCompleted = false;

            this._releaseEdgeResistance();

            return;
        }

        /* --------------------------------------------------
           SECOND SWIPE
           
           First swipe has already finished.
           
           This is the new physical swipe, so transition.
        -------------------------------------------------- */

        if (
            this.edgeArmed &&
            this.touchEdgeGestureCompleted
        ) {
            const transitionDirection =
                this.edgeDirection;

            this.setEdgeArmed(false);
            this.edgeDirection = null;
            this.touchEdgeGestureCompleted = false;

            this._resetEdgeResistance();

            if (transitionDirection === 'down') {
                this.goToNextSection();
            } else {
                this.goToPrevSection();
            }

            return;
        }

        /* --------------------------------------------------
           FIRST SWIPE
        -------------------------------------------------- */

        if (!this.edgeArmed) {
            this.setEdgeArmed(true, direction);
            this.edgeDirection = direction;
            this.edgeStretch = 0;
        }

        /* --------------------------------------------------
           Continue stretching during first swipe
        -------------------------------------------------- */

        this._accumulateEdgeResistance(
            direction,
            Math.abs(deltaY)
        );
    }

    _onTouchEnd(e) {
        if (!this.scrollEnabled) return;

        if (this.scrollLock.isLocked()) return;

        const touchEndY =
            e.changedTouches[0].clientY;

        const deltaY =
            this.touchStartY - touchEndY;

        // Ignore tiny gestures
        if (Math.abs(deltaY) < 30) return;

        const direction =
            deltaY > 0 ? 'down' : 'up';

        /* --------------------------------------------------
           No edge gesture
        -------------------------------------------------- */

        if (!this.edgeArmed) {
            return;
        }

        /* --------------------------------------------------
           Direction changed
        -------------------------------------------------- */

        if (direction !== this.edgeDirection) {
            this.setEdgeArmed(false);
            this.edgeDirection = null;
            this.touchEdgeGestureCompleted = false;

            this._releaseEdgeResistance();

            return;
        }

        /* --------------------------------------------------
           FIRST SWIPE FINISHED
           
           Release the stretch.
           
           Keep edgeArmed = true.
           This means the next separate swipe will
           trigger the transition.
        -------------------------------------------------- */

        this.touchEdgeGestureCompleted = true;

        this._releaseEdgeResistance();
    }

    /* ======================================================================
       TRANSITION FINISHED
    ====================================================================== */

    _onTransitionFinished({ from, to }) {
        const target =
            this.sections.find(s => s.id === to);

        if (!target) {
            this.scrollLock.unlock();
            this.transitionManager.isTransitioning = false;
            return;
        }

        gsap.to(target.el, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 1.0,
            ease: 'power2.out'
        });

        this.scrollLock.unlock();
        this.transitionManager.isTransitioning = false;

        this.animationManager.play(to).then(() => {
            if (window.playHackerTextsInSection) {
                window.playHackerTextsInSection(to);
            }
        });
    }

    /* ======================================================================
       SCROLL ENABLE / DISABLE
       
       Used by modals.
    ====================================================================== */

    setScrollEnabled(enabled) {
        this.scrollEnabled = enabled;

        if (!enabled) {
            this.setEdgeArmed(false);
            this.edgeDirection = null;
            this.touchEdgeGestureCompleted = false;

            this._resetEdgeResistance();
        }
    }
}