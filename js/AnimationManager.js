export default class AnimationManager {
    constructor() {
        this.timelines = new Map();
        this.resolves = new Map();
    }

    register(sectionId, selector, config = {}) {
        const { duration = 1.2, ease = 'power2.out', stagger = 0.1, ...rest } = config;
        const elements = gsap.utils.toArray(selector);
        if (!elements.length) return;

        const tl = gsap.timeline({ paused: true });

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
        tl.pause();
        this.timelines.set(sectionId, tl);
    }

    play(sectionId) {
        const tl = this.timelines.get(sectionId);
        if (!tl) return Promise.resolve();

        if (!this.resolves.has(sectionId)) {
            this.resolves.set(sectionId, []);
        }

        const promise = new Promise(resolve => {
            this.resolves.get(sectionId).push(resolve);
        });

        tl.eventCallback('onComplete', () => {
            const list = this.resolves.get(sectionId) || [];
            this.resolves.set(sectionId, []);
            list.forEach(resolve => resolve());
        });

        tl.timeScale(1.0);

        if (tl.isActive()) {
            return promise;
        }

        tl.restart();
        return promise;
    }

    unload(sectionId, timeScale = 2.5, isGoingDown = true) {
        const tl = this.timelines.get(sectionId);
        if (!tl) return Promise.resolve();

        if (!this.resolves.has(sectionId)) {
            this.resolves.set(sectionId, []);
        }

        const promise = new Promise(resolve => {
            this.resolves.get(sectionId).push(resolve);
        });

        if (isGoingDown) {
            tl.eventCallback('onReverseComplete', () => {
                const list = this.resolves.get(sectionId) || [];
                this.resolves.set(sectionId, []);
                list.forEach(resolve => resolve());
                tl.eventCallback('onReverseComplete', null);
            });

            tl.timeScale(timeScale);
            tl.reverse();
        } else {
            tl.pause();
            const sectionEl = document.getElementById(sectionId);
            if (sectionEl && window.gsap) {
                window.gsap.to(sectionEl, {
                    opacity: 0,
                    y: 30,
                    duration: 0.8,
                    ease: 'power2.out',
                    onComplete: () => {
                        const list = this.resolves.get(sectionId) || [];
                        this.resolves.set(sectionId, []);
                        list.forEach(resolve => resolve());
                    }
                });
            } else {
                tl.timeScale(timeScale * 1.5);
                tl.reverse();
                setTimeout(() => {
                    const list = this.resolves.get(sectionId) || [];
                    this.resolves.set(sectionId, []);
                    list.forEach(resolve => resolve());
                }, 800);
            }
        }

        return promise;
    }
}
