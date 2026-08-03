// Optimized manager for entrance timelines configured per section
export default class AnimationManager {
    constructor() {
        this.timelines = new Map(); // sectionId -> timeline
        this.resolves = new Map();  // sectionId -> Array of resolve functions
    }

    register(sectionId, selector, config = {}) {
        const { duration = 1.2, ease = 'power2.out', stagger = 0.1, ...rest } = config;
        const elements = gsap.utils.toArray(selector);
        if (!elements.length) return;

        const tl = gsap.timeline({ paused: true });

        // Use a single tween with GSAP's optimized stagger feature.
        // lazy: true defers DOM writes to reduce layout thrashing.
        // overwrite: 'auto' prevents conflicting animations on the same elements.
        tl.fromTo(
            elements,
            { opacity: 0, y: 20 },
            {
                opacity: 1,
                y: 0,
                duration,
                ease,
                stagger,
                overwrite: 'auto',
                lazy: true,
                ...rest
            }
        );

        this.timelines.set(sectionId, tl);
    }

    registerTimeline(sectionId, tl) {
        tl.pause(); // Ensure it starts paused
        this.timelines.set(sectionId, tl);
    }

    play(sectionId) {
        const tl = this.timelines.get(sectionId);
        if (!tl) return Promise.resolve();

        // Ensure we initialize the list of resolves for this section
        if (!this.resolves.has(sectionId)) {
            this.resolves.set(sectionId, []);
        }

        const promise = new Promise(resolve => {
            this.resolves.get(sectionId).push(resolve);
        });

        // Set the completion callback to resolve all pending promises for this section
        tl.eventCallback('onComplete', () => {
            const list = this.resolves.get(sectionId) || [];
            this.resolves.set(sectionId, []);
            list.forEach(resolve => resolve());
        });

        // If the timeline is already actively running, do not interrupt it with restart().
        // Let it run to completion for a smoother visual transition.
        if (tl.isActive()) {
            return promise;
        }

        tl.restart();
        return promise;
    }
}
