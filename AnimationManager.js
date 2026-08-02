// Simple manager for entrance timelines that can be configured per section
export default class AnimationManager {
    constructor() {
        this.timelines = new Map(); // sectionId -> timeline
    }

    register(sectionId, selector, config = {}) {
        const { duration = 1.2, ease = 'power2.out', stagger = 0.1, ...rest } = config;
        const elements = document.querySelectorAll(selector);
        if (!elements.length) return;
        const tl = gsap.timeline({ paused: true });

        elements.forEach((el, index) => {
            tl.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration, ease, delay: index * stagger }, '-=0.3');
        });
        this.timelines.set(sectionId, tl);
    }

    play(sectionId) {
        const tl = this.timelines.get(sectionId);
        if (!tl) return Promise.resolve();
        tl.restart();
        return new Promise(resolve => tl.eventCallback('onComplete', resolve));
    }
}
