const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';

class HackerText {
    constructor(element) {
        this.element = element;
        this.triggerMode = element.getAttribute('data-hacker-text') || 'single'; // single, loop
        this.renderMode = element.getAttribute('data-hacker-mode') || 'terminal'; // scramble, terminal
        this.isActive = false;

        this.chars = [];
        this.originalText = '';
        this._initStructure();

        // loop
        this.animationPhase = 'render'; // render | pauseAfterRender | unrender | pauseAfterUnrender
        this.animationDirection = 1;

        // Animation state
        this.progress = 0; // 0 to 1
        this.lastTime = performance.now();
        this.isAnimating = false;
        this.loopTimeoutId = null;
        this.cursor = null;

        this.hasPlayed = false;
        this.isIntersecting = false;
        this.processedByQueue = false;
        this.playPromise = null;
        this.resolvePlay = null;

        this.intersectionObserver = new IntersectionObserver((entries) => {
            const entry = entries[0];
            this.isIntersecting = entry.isIntersecting;

            if (this.isIntersecting) {
                this.checkAndPlay();
            } else {
                if (this.triggerMode === 'loop') {
                    this.stop();
                }
            }
        }, { threshold: 0.1 });

        this.intersectionObserver.observe(this.element);

        this._renderLoop = this._renderLoop.bind(this);
    }

    _initStructure() {
        const text = this.element.textContent.trim();
        if (!text) {
            this.chars = [];
            return;
        }

        // Check if already initialized and text hasn't changed
        const hasSpans = this.element.querySelector('.hacker-char') !== null;
        if (hasSpans && this.originalText === text) {
            // Retrieve existing spans
            this.chars = [];
            const charElements = this.element.querySelectorAll('.hacker-char');
            charElements.forEach(el => {
                const orig = el.getAttribute('data-orig') || el.textContent;
                this.chars.push({
                    element: el,
                    original: orig,
                    current: el.textContent,
                    resolved: false
                });
            });
            return;
        }

        // Otherwise, wrap text nodes recursively
        this.originalText = text;
        this.chars = [];
        this._wrapTextNodes(this.element);
    }

    _wrapTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    // Don't traverse inside already processed hacker-word/hacker-char/hacker-cursor
                    if (parent.classList.contains('hacker-char') || parent.classList.contains('hacker-word') ||
                        parent.classList.contains('hacker-cursor') || parent.classList.contains('hacker-ignore')) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const tag = parent.tagName.toUpperCase();
                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent;

            // If the text node is inside the element but it's just pure whitespace, we can leave it as is
            if (/^\s*$/.test(text)) {
                continue;
            }

            const parts = text.split(/(\s+)/);
            const fragment = document.createDocumentFragment();

            for (const part of parts) {
                if (!part) continue;
                if (/^\s+$/.test(part)) {
                    fragment.appendChild(document.createTextNode(part));
                } else {
                    const wordSpan = document.createElement('span');
                    wordSpan.className = 'hacker-word';

                    for (let i = 0; i < part.length; i++) {
                        const char = part[i];
                        const charSpan = document.createElement('span');
                        charSpan.className = 'hacker-char';
                        charSpan.setAttribute('data-orig', char);
                        charSpan.textContent = char;

                        // Start invisible
                        charSpan.style.opacity = '0';

                        wordSpan.appendChild(charSpan);
                        this.chars.push({
                            element: charSpan,
                            original: char,
                            current: char,
                            resolved: false
                        });
                    }
                    fragment.appendChild(wordSpan);
                }
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        }
    }

    // play() {
    //     if (this.isAnimating) return;
    //     this.progress = 0;
    //     this.isAnimating = true;
    //     this.chars.forEach(c => {
    //         c.resolved = false;
    //         c.currentGlyph = '';
    //         c.element.style.opacity = '0';
    //     });

    //     if (this.loopTimeoutId) {
    //         clearTimeout(this.loopTimeoutId);
    //         this.loopTimeoutId = null;
    //     }

    //     this.lastTime = performance.now();
    //     requestAnimationFrame(this._renderLoop);
    // }

    play() {
        if (this.isAnimating) {
            return this.playPromise || Promise.resolve();
        }

        if (this.loopTimeoutId) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }

        this.progress = 0;
        this.isAnimating = true;

        this.playPromise = new Promise(resolve => {
            this.resolvePlay = resolve;
        });

        // Only reset to hidden when STARTING a render phase
        this.chars.forEach(c => {
            c.resolved = false;
            c.currentGlyph = '';
            c.element.textContent = c.original;
            c.element.style.opacity = '0';
        });

        this.lastTime = performance.now();
        requestAnimationFrame(this._renderLoop);

        return this.playPromise;
    }

    stop() {
        this.isAnimating = false;
        if (this.loopTimeoutId) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }
        this.progress = 0;
        this._removeCursor();
        // Resolve all characters back to original
        this.chars.forEach(c => {
            c.element.textContent = c.original;
            c.element.style.opacity = '1';
            c.resolved = true;
        });

        if (this.resolvePlay) {
            this.resolvePlay();
            this.resolvePlay = null;
        }
    }

    checkAndPlay() {
        if (!this.isIntersecting) return;
        if (this.triggerMode === 'single' && this.hasPlayed) return;

        const sectionEl = this.element.closest('section');
        const sectionId = sectionEl ? sectionEl.id : null;
        if (!sectionId) {
            this.play();
            if (this.triggerMode === 'single') {
                this.hasPlayed = true;
            }
            return;
        }

        const isSectionActive = window.activeSections && window.activeSections.has(sectionId);
        if (isSectionActive) {
            const isQueueRunning = window.activeSectionQueues && window.activeSectionQueues[sectionId];
            if (isQueueRunning) {
                if (this.processedByQueue) {
                    this.play();
                    if (this.triggerMode === 'single') {
                        this.hasPlayed = true;
                    }
                }
            } else {
                this.play();
                if (this.triggerMode === 'single') {
                    this.hasPlayed = true;
                }
            }
        }
    }

    reset() {
        this.stop();
        this.hasPlayed = false;
        this.processedByQueue = false;
        this.chars.forEach(c => {
            c.resolved = false;
            c.currentGlyph = '';
            c.element.textContent = c.original;
            c.element.style.opacity = '0';
        });
    }

    _renderLoop(time) {
        if (!this.isAnimating) return;

        const dt = time - this.lastTime;
        this.lastTime = time;

        const duration = this.renderMode === 'terminal' ? 1500 : 1750;
        this.progress += dt / duration;

        if (this.progress >= 1) {
            this.progress = 1;
            this._tick();

            this.isAnimating = false;
            this._removeCursor();

            if (this.resolvePlay) {
                this.resolvePlay();
                this.resolvePlay = null;
            }

            if (this.triggerMode === 'loop') {
                // RENDER COMPLETE → wait 3 seconds
                this.loopTimeoutId = setTimeout(() => {
                    this._startUnrender();
                }, 3000);
            }

            return;
        }

        this._tick();
        requestAnimationFrame(this._renderLoop);
    }

    // _renderLoop(time) {
    //     if (!this.isAnimating) return;

    //     const dt = time - this.lastTime;
    //     this.lastTime = time;

    //     const duration = this.renderMode === 'terminal' ? 1500 : 1750; // Terminal is a bit slower
    //     this.progress += dt / duration;

    //     if (this.progress >= 1) {
    //         this.progress = 1;
    //         this._tick();

    //         this._removeCursor();

    //         if (this.triggerMode === 'loop' && this.isAnimating) {
    //             this.isAnimating = false;
    //             this.loopTimeoutId = setTimeout(() => this.play(), 3000); // Wait 3s before looping
    //         } else {
    //             this.isAnimating = false;
    //         }
    //         return;
    //     }

    //     this._tick();
    //     requestAnimationFrame(this._renderLoop);
    // }

    _tick() {
        if (this.renderMode === 'scramble') {
            this._tickScramble();
        } else if (this.renderMode === 'terminal') {
            this._tickTerminal();
        }
    }

    _tickScramble() {
        const totalChars = this.chars.length;
        const resolvedCount = Math.floor(this.progress * totalChars);

        for (let i = 0; i < totalChars; i++) {
            const c = this.chars[i];
            const span = c.element;

            if (i < resolvedCount) {
                // Resolved character
                if (!c.resolved) {
                    span.textContent = c.original;
                    span.style.opacity = '1';
                    c.resolved = true;
                }
            } else if (i < resolvedCount + 10) {
                // Scrambling character
                if (Math.random() > 0.3 || !c.currentGlyph) {
                    c.currentGlyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                }
                span.textContent = c.currentGlyph;
                span.style.opacity = (0.5 + Math.random() * 0.5).toString();
                c.resolved = false;
            } else {
                // Unresolved character
                if (span.style.opacity !== '0') {
                    span.textContent = c.original;
                    span.style.opacity = '0';
                }
                c.resolved = false;
            }
        }
    }

    _tickTerminal() {
        const totalChars = this.chars.length;
        const visibleCount = Math.floor(this.progress * totalChars);

        for (let i = 0; i < totalChars; i++) {
            const c = this.chars[i];
            const span = c.element;

            if (i < visibleCount) {
                span.style.opacity = '1';
                span.textContent = c.original;
            } else {
                span.style.opacity = '0';
            }
        }

        // Draw Terminal Cursor
        if (this.progress < 1 && totalChars > 0) {
            this._updateCursor(visibleCount);
        } else {
            this._removeCursor();
        }
    }

    _updateCursor(visibleCount) {
        if (!this.cursor) {
            this.cursor = document.createElement('span');
            this.cursor.className = 'hacker-cursor';
        }

        const totalChars = this.chars.length;
        if (visibleCount > 0 && visibleCount <= totalChars) {
            const prevCharSpan = this.chars[visibleCount - 1].element;
            if (this.cursor.previousSibling !== prevCharSpan) {
                prevCharSpan.after(this.cursor);
            }
        } else if (visibleCount === 0 && totalChars > 0) {
            const firstCharSpan = this.chars[0].element;
            if (this.cursor.nextSibling !== firstCharSpan) {
                firstCharSpan.before(this.cursor);
            }
        }
    }

    _removeCursor() {
        if (this.cursor && this.cursor.parentNode) {
            this.cursor.parentNode.removeChild(this.cursor);
        }
    }

    destroy() {
        this.stop();
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        this._removeCursor();
        this.element.textContent = this.originalText;
    }

    _tickUnrender() {
        const totalChars = this.chars.length;

        // Remove from RIGHT → LEFT
        const visibleCount = Math.ceil(
            totalChars * (1 - this.progress)
        );

        for (let i = 0; i < totalChars; i++) {
            const c = this.chars[i];

            if (i < visibleCount) {
                c.element.textContent = c.original;
                c.element.style.opacity = '1';
            } else {
                c.element.textContent = c.original;
                c.element.style.opacity = '0';
            }
        }
    }

    _unrender() {
        if (this.triggerMode !== 'loop') return;

        const duration = this.renderMode === 'terminal' ? 1500 : 1750;
        const startTime = performance.now();

        const animateUnrender = (time) => {
            if (this.triggerMode !== 'loop') return;

            const progress = Math.min(
                (time - startTime) / duration,
                1
            );

            // RIGHT → LEFT
            const visibleCount = Math.ceil(
                this.chars.length * (1 - progress)
            );

            for (let i = 0; i < this.chars.length; i++) {
                const c = this.chars[i];

                if (i < visibleCount) {
                    c.element.textContent = c.original;
                    c.element.style.opacity = '1';
                } else {
                    c.element.style.opacity = '0';
                }
            }

            if (progress < 1) {
                requestAnimationFrame(animateUnrender);
            } else {
                // Completely hidden.
                // Wait 3 seconds, then render again.
                this.loopTimeoutId = setTimeout(() => {
                    this.play();
                }, 3000);
            }
        };

        animateUnrender(startTime);
    }

    _unrenderLoop(time) {
        if (!this.isAnimating) return;

        const dt = time - this.lastTime;
        this.lastTime = time;

        const duration = this.renderMode === 'terminal' ? 1500 : 1750;
        this.progress += dt / duration;

        if (this.progress >= 1) {
            this.progress = 1;
            this._tickUnrender();

            this.isAnimating = false;

            // UNRENDER COMPLETE → wait 3 seconds
            this.loopTimeoutId = setTimeout(() => {
                // IMPORTANT:
                // Restore the characters to their starting state
                // before beginning the next render.
                this.chars.forEach(c => {
                    c.resolved = false;
                    c.currentGlyph = '';
                    c.element.textContent = c.original;
                    c.element.style.opacity = '0';
                });

                this.progress = 0;
                this.isAnimating = true;
                this.lastTime = performance.now();

                requestAnimationFrame(this._renderLoop);
            }, 3000);

            return;
        }

        this._tickUnrender();
        requestAnimationFrame(this._unrenderLoop);
    }

    _startUnrender() {
        if (this.triggerMode !== 'loop') return;

        this.isAnimating = true;
        this.progress = 0;
        this.lastTime = performance.now();

        requestAnimationFrame(this._unrenderLoop);
    }
}

class HackerImage {
    constructor(element) {
        this.element = element;
        this.img = element.querySelector('img');
        this.triggerMode = element.getAttribute('data-hacker-image') || 'single';

        if (!this.img) return;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'hacker-image-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '20';
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Hide original image initially (with smooth transition for when canvas fades out)
        this.img.style.opacity = '0';
        this.img.style.transition = 'opacity 0.4s ease';

        this.progress = 0;
        this.lastTime = performance.now();
        this.isAnimating = false;
        this.hasPlayed = false;
        this.isIntersecting = false;
        this.processedByQueue = false;
        this.playPromise = null;
        this.resolvePlay = null;

        this.intersectionObserver = new IntersectionObserver((entries) => {
            const entry = entries[0];
            this.isIntersecting = entry.isIntersecting;

            if (this.isIntersecting) {
                this.checkAndPlay();
            } else {
                if (this.triggerMode === 'loop') {
                    this.stop();
                }
            }
        }, { threshold: 0.1 });

        this.intersectionObserver.observe(this.element);

        this._renderLoop = this._renderLoop.bind(this);
    }

    play() {
        if (this.isAnimating) {
            return this.playPromise || Promise.resolve();
        }

        this.progress = 0;
        this.isAnimating = true;
        this.playPromise = new Promise(resolve => {
            this.resolvePlay = resolve;
        });

        // Hide original image at the start of rendering
        this.img.style.opacity = '0';
        this.canvas.style.opacity = '1';

        // Prepare dimensions
        this.canvas.width = this.element.clientWidth || 300;
        this.canvas.height = this.element.clientHeight || 300;

        this.lastTime = performance.now();
        requestAnimationFrame(this._renderLoop);

        return this.playPromise;
    }

    stop() {
        this.isAnimating = false;
        this.progress = 0;
        
        // Show original image fully
        this.img.style.opacity = '1';
        this.canvas.style.opacity = '0';
        
        const W = this.canvas.width;
        const H = this.canvas.height;
        if (W > 0 && H > 0) {
            this.ctx.clearRect(0, 0, W, H);
        }

        if (this.resolvePlay) {
            this.resolvePlay();
            this.resolvePlay = null;
        }
    }

    checkAndPlay() {
        if (!this.isIntersecting) return;
        if (this.triggerMode === 'single' && this.hasPlayed) return;

        const sectionEl = this.element.closest('section');
        const sectionId = sectionEl ? sectionEl.id : null;
        if (!sectionId) {
            this.play();
            if (this.triggerMode === 'single') {
                this.hasPlayed = true;
            }
            return;
        }

        const isSectionActive = window.activeSections && window.activeSections.has(sectionId);
        if (isSectionActive) {
            const isQueueRunning = window.activeSectionQueues && window.activeSectionQueues[sectionId];
            if (isQueueRunning) {
                if (this.processedByQueue) {
                    this.play();
                    if (this.triggerMode === 'single') {
                        this.hasPlayed = true;
                    }
                }
            } else {
                this.play();
                if (this.triggerMode === 'single') {
                    this.hasPlayed = true;
                }
            }
        }
    }

    reset() {
        this.stop();
        this.hasPlayed = false;
        this.processedByQueue = false;
        this.img.style.opacity = '0';
    }

    _renderLoop(time) {
        if (!this.isAnimating) return;

        const dt = time - this.lastTime;
        this.lastTime = time;

        const duration = 2000; // Sweep duration
        this.progress += dt / duration;

        if (this.progress >= 1) {
            this.progress = 1;
            this._draw();

            this.isAnimating = false;
            
            // Fade original image in, canvas out
            this.img.style.opacity = '1';
            this.canvas.style.opacity = '0';

            if (this.resolvePlay) {
                this.resolvePlay();
                this.resolvePlay = null;
            }

            if (this.triggerMode === 'loop') {
                // Wait 4 seconds, then reset and loop
                setTimeout(() => {
                    if (this.triggerMode === 'loop') {
                        this.play();
                    }
                }, 4000);
            }

            return;
        }

        this._draw();
        requestAnimationFrame(this._renderLoop);
    }

    _draw() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        if (W <= 0 || H <= 0) return;

        this.ctx.clearRect(0, 0, W, H);

        const Y = this.progress * H;

        // 1. Draw resolved/pixelated image above the sweep line
        if (Y > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(0, 0, W, Y);
            this.ctx.clip();

            if (this.img.complete && this.img.naturalWidth !== 0) {
                if (this.progress < 0.95) {
                    // Pixelated image: scale down and scale up
                    const p = this.progress;
                    const maxPixelSize = 32;
                    // Pixel size goes from maxPixelSize down to 1 as progress increases
                    const pixelSize = Math.max(1, Math.floor((1 - p) * maxPixelSize));
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = Math.max(1, Math.floor(W / pixelSize));
                    tempCanvas.height = Math.max(1, Math.floor(H / pixelSize));
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(this.img, 0, 0, tempCanvas.width, tempCanvas.height);

                    this.ctx.imageSmoothingEnabled = false;
                    this.ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, W, H);
                } else {
                    // Draw original sharp image
                    this.ctx.drawImage(this.img, 0, 0, W, H);
                }
            } else {
                // Fallback if image not loaded: solid dark green box
                this.ctx.fillStyle = 'rgba(233, 196, 0, 0.2)'; // theme color
                this.ctx.fillRect(0, 0, W, Y);
            }
            this.ctx.restore();
        }

        // 2. Draw black decryption static below the sweep line
        if (Y < H) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(0, Y, W, H - Y);
            this.ctx.clip();

            // Dark backdrop
            this.ctx.fillStyle = 'rgba(19, 19, 19, 0.92)';
            this.ctx.fillRect(0, Y, W, H - Y);

            // Matrix style binary code rain
            this.ctx.fillStyle = '#e9c400'; // primary theme yellow
            this.ctx.font = 'bold 9px monospace';
            const cellW = 16;
            const cellH = 16;
            for (let x = 0; x < W; x += cellW) {
                for (let y = Math.floor(Y / cellH) * cellH; y < H; y += cellH) {
                    const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                    const rand = noise - Math.floor(noise);
                    if (rand > 0.6) {
                        const char = rand > 0.8 ? '1' : '0';
                        this.ctx.fillText(char, x + 4, y + 10);
                    }
                }
            }
            this.ctx.restore();
        }

        // 3. Draw glowing horizontal scanline
        if (Y > 0 && Y < H) {
            this.ctx.fillStyle = '#e9c400';
            this.ctx.fillRect(0, Y - 2, W, 4);

            // Scanline glow
            this.ctx.shadowColor = '#e9c400';
            this.ctx.shadowBlur = 12;
            this.ctx.fillRect(0, Y - 1, W, 2);
            this.ctx.shadowBlur = 0; // reset
        }
    }

    destroy() {
        this.stop();
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.img.style.opacity = '1';
    }
}

export function applyHackerText(el) {
    if (el.__hackerTextInstance) {
        el.__hackerTextInstance.stop();
        el.__hackerTextInstance._initStructure();
        el.__hackerTextInstance.play();
    } else {
        el.__hackerTextInstance = new HackerText(el);
    }
}

export function initHackerText(container = document) {
    const textElements = container.querySelectorAll('[data-hacker-text]');
    textElements.forEach(el => {
        applyHackerText(el);
    });

    const imgElements = container.querySelectorAll('[data-hacker-image]');
    imgElements.forEach(el => {
        if (el.__hackerImageInstance) {
            el.__hackerImageInstance.stop();
            el.__hackerImageInstance.play();
        } else {
            el.__hackerImageInstance = new HackerImage(el);
        }
    });
}

window.activeSections = window.activeSections || new Set();
window.activeSectionQueues = window.activeSectionQueues || {};

export async function playHackerTextsInSection(sectionId) {
    window.activeSections = window.activeSections || new Set();
    window.activeSections.add(sectionId);

    window.activeSectionQueues = window.activeSectionQueues || {};
    window.activeSectionQueues[sectionId] = true;

    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) {
        window.activeSectionQueues[sectionId] = false;
        return;
    }

    const textElements = Array.from(sectionEl.querySelectorAll('[data-hacker-text]'));
    const imgElements = Array.from(sectionEl.querySelectorAll('[data-hacker-image]'));

    const instances = [
        ...textElements.map(el => el.__hackerTextInstance),
        ...imgElements.map(el => el.__hackerImageInstance)
    ].filter(inst => inst !== undefined);

    // Group by order
    const groups = {};
    instances.forEach(inst => {
        const orderAttr = inst.element.getAttribute('data-hacker-order');
        const order = orderAttr !== null ? parseFloat(orderAttr) : 999;
        if (!groups[order]) {
            groups[order] = [];
        }
        groups[order].push(inst);
    });

    // Sort orders ascending
    const sortedOrders = Object.keys(groups).map(Number).sort((a, b) => a - b);

    // Reset processed flags for all instances first
    instances.forEach(inst => {
        inst.processedByQueue = false;
    });

    // Process each group sequentially
    for (const order of sortedOrders) {
        const groupInstances = groups[order];
        
        // Mark as processed by queue
        groupInstances.forEach(inst => {
            inst.processedByQueue = true;
        });

        // Filter to eligible ones
        const eligible = groupInstances.filter(inst => {
            if (inst.triggerMode === 'single' && inst.hasPlayed) return false;
            return inst.isIntersecting;
        });

        if (eligible.length > 0) {
            const promises = eligible.map(inst => {
                if (inst.triggerMode === 'single') {
                    inst.hasPlayed = true;
                }
                return inst.play();
            });
            await Promise.all(promises);
        }
    }

    window.activeSectionQueues[sectionId] = false;
}

export function stopHackerTextsInSection(sectionId) {
    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) return;

    const textElements = sectionEl.querySelectorAll('[data-hacker-text]');
    textElements.forEach(el => {
        if (el.__hackerTextInstance) el.__hackerTextInstance.stop();
    });

    const imgElements = sectionEl.querySelectorAll('[data-hacker-image]');
    imgElements.forEach(el => {
        if (el.__hackerImageInstance) el.__hackerImageInstance.stop();
    });
}

export function resetHackerTextsInSection(sectionId) {
    if (window.activeSections) {
        window.activeSections.delete(sectionId);
    }
    if (window.activeSectionQueues) {
        window.activeSectionQueues[sectionId] = false;
    }

    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) return;

    const textElements = sectionEl.querySelectorAll('[data-hacker-text]');
    textElements.forEach(el => {
        if (el.__hackerTextInstance) el.__hackerTextInstance.reset();
    });

    const imgElements = sectionEl.querySelectorAll('[data-hacker-image]');
    imgElements.forEach(el => {
        if (el.__hackerImageInstance) el.__hackerImageInstance.reset();
    });
}

window.applyHackerText = applyHackerText;
window.initHackerText = initHackerText;
window.playHackerTextsInSection = playHackerTextsInSection;
window.stopHackerTextsInSection = stopHackerTextsInSection;
window.resetHackerTextsInSection = resetHackerTextsInSection;
