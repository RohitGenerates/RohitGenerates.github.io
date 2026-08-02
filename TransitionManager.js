// Handles fullscreen transition between sections (video/image cross‑fade)
import EventEmitter from './EventEmitter.js';
import ScrollLock from './ScrollLock.js';

// Expect GSAP to be available globally (via CDN)
const { gsap, ScrollTrigger, ScrollToPlugin } = window;

export default class TransitionManager {
    constructor(scrollLock) {
        this.scrollLock = scrollLock;
        this.emitter = new EventEmitter();
        this.isTransitioning = false;
        this.queue = null; // { from, to, opts }
        this._setupVideoElements();
        this.scrollTrigger = ScrollTrigger;
    }

    /*=============================
      PUBLIC API
    =============================*/
    on(event, cb) { this.emitter.on(event, cb); }
    emit(event, data) { this.emitter.emit(event, data); }

    play(fromSectionId, toSectionId, opts = {}) {
        if (this.isTransitioning) {
            // Keep only the most recent request
            this.queue = { from: fromSectionId, to: toSectionId, opts };
            return;
        }

        this.isTransitioning = true;
        this.scrollLock.lock();
        this.emit('transitionStarted', { from: fromSectionId, to: toSectionId });

        // Grab the media elements
        const imgEl = document.getElementById('scrub-bg-img');
        const vidEl = document.getElementById('scrub-bg-video');

        if (!imgEl || !vidEl) {
            console.warn('TransitionManager: Required elements missing');
            this._transitionComplete(fromSectionId, toSectionId);
            return;
        }

        // Fire up the timeline
        const tl = gsap.timeline({
            onComplete: () => this._transitionComplete(fromSectionId, toSectionId)
        });

        // Ensure video is reset
        vidEl.pause();
        vidEl.currentTime = 0;

        // Phase 1 – bring video to front, fade it in
        const vidDuration = vidEl.duration || 3.0;
        const transitionDuration = opts.duration || 2.6; // default
        const duration = transitionDuration;
        const mid = transitionDuration * 0.54; // ~ 60% of range
        const snap = vidDuration >= transitionDuration ? transitionDuration : vidDuration;

        tl.set(imgEl, { opacity: 1 });
        tl.set(vidEl, { opacity: 0, zIndex: 60 });
        tl.to(vidEl, { duration: duration, currentTime: snap, ease: 'none' }, 0);
        tl.to(vidEl, { duration: duration - mid, opacity: 1, ease: 'none' }, 0);
        tl.to(imgEl, { duration: Math.min(1.0, duration - mid), opacity: 0, ease: 'none' }, 0); // fade out bg quickly

        // Phase 2 – fade back to image
        tl.to(vidEl, { duration: duration - mid, opacity: 0, ease: 'none' }, mid);
        tl.to(imgEl, { duration: duration - mid, opacity: 1, ease: 'none' }, mid);
        
        // Reset zIndex after completion
        tl.set(vidEl, { zIndex: 0 });

        return tl;
    }

    /*=============================
      INTERNAL
    =============================*/
    _transitionComplete(from, to) {
        this.emit('transitionFinished', { from, to });
        // We keep lock held until entrance animation completes
        // (SectionManager will unlock afterwards)
        // The queue handling is done here.
        if (this.queue) {
            const { from: nf, to: nt, opts } = this.queue;
            this.queue = null;
            this.play(nf, nt, opts);
        } else {
            this.isTransitioning = false;
        }
    }

    _setupVideoElements() {
        // we simply reference elements by id – this helper could add listeners
    }
}
