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

        this.triggerMode =
            element.getAttribute('data-hacker-image') || 'single';

        /*
         * Direction the rows travel:
         *
         * left-to-right
         * right-to-left
         */
        this.scanDirection =
            element.getAttribute('data-hacker-scan') || 'left-to-right';

        /*
         * Direction the rows are processed:
         *
         * top-to-bottom
         * bottom-to-top
         */
        this.rowDirection =
            element.getAttribute('data-hacker-direction') || 'top-to-bottom';

        /*
         * Show the amber scanner cursor.
         */
        this.showCursor =
            element.getAttribute('data-hacker-cursor') !== 'false';

        if (!this.img) return;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'hacker-image-canvas';

        Object.assign(this.canvas.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '20',
            opacity: '1'
        });

        this.element.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');

        /*
         * Hide original image.
         * Canvas will reveal it progressively.
         */
        this.img.style.opacity = '0';
        this.img.style.transition = 'opacity 0.4s ease';

        /*
         * Animation state
         */
        this.progress = 0;
        this.lastTime = performance.now();

        this.isAnimating = false;
        this.hasPlayed = false;
        this.isIntersecting = false;
        this.processedByQueue = false;

        this.playPromise = null;
        this.resolvePlay = null;

        this.loopTimeout = null;

        /*
         * ------------------------------------------
         * TERMINAL EFFECT SETTINGS
         * ------------------------------------------
         */

        // Height of each decoded line in pixels.
        this.rowHeight = 15;

        // Total animation duration.
        this.duration = 7000;

        // Dark amber static intensity.
        this.staticOpacity = 0.95;

        // Amount of static generated per cell.
        this.staticDensity = 0.42;

        // Size of static characters.
        this.staticFontSize = 8;

        // Amber used by the terminal effect.
        this.amber = '#e9c400';

        // Dark background.
        this.background = '#11100b';

        /*
         * Intersection observer
         */
        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                this.isIntersecting = entry.isIntersecting;

                if (this.isIntersecting) {
                    this.checkAndPlay();
                } else if (this.triggerMode === 'loop') {
                    this.stop();
                }
            },
            {
                threshold: 0.1
            }
        );

        this.intersectionObserver.observe(this.element);

        this._renderLoop = this._renderLoop.bind(this);

        /*
         * Keep canvas dimensions synchronized.
         */
        this.resizeObserver = new ResizeObserver(() => {
            if (!this.isAnimating) {
                this._resizeCanvas();
            }
        });

        this.resizeObserver.observe(this.element);
    }

    /*
     * ------------------------------------------
     * RESIZE
     * ------------------------------------------
     */

    _resizeCanvas() {
        const width = this.element.clientWidth || 300;
        const height = this.element.clientHeight || 300;

        if (
            this.canvas.width !== width ||
            this.canvas.height !== height
        ) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    /*
     * ------------------------------------------
     * PLAY
     * ------------------------------------------
     */

    play() {
        if (this.isAnimating) {
            return this.playPromise || Promise.resolve();
        }

        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
            this.loopTimeout = null;
        }

        this.progress = 0;
        this.isAnimating = true;

        this.playPromise = new Promise((resolve) => {
            this.resolvePlay = resolve;
        });

        this.img.style.opacity = '0';
        this.canvas.style.opacity = '1';

        this._resizeCanvas();

        this.lastTime = performance.now();

        requestAnimationFrame(this._renderLoop);

        return this.playPromise;
    }

    /*
     * ------------------------------------------
     * STOP
     * ------------------------------------------
     */

    stop() {
        this.isAnimating = false;
        this.progress = 0;

        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
            this.loopTimeout = null;
        }

        this.img.style.opacity = '1';
        this.canvas.style.opacity = '0';

        if (
            this.canvas.width > 0 &&
            this.canvas.height > 0
        ) {
            this.ctx.clearRect(
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );
        }

        if (this.resolvePlay) {
            this.resolvePlay();
            this.resolvePlay = null;
        }
    }

    /*
     * ------------------------------------------
     * CHECK / PLAY
     * ------------------------------------------
     */

    checkAndPlay() {
        if (!this.isIntersecting) return;

        if (
            this.triggerMode === 'single' &&
            this.hasPlayed
        ) {
            return;
        }

        const sectionEl = this.element.closest('section');
        const sectionId = sectionEl ? sectionEl.id : null;

        if (!sectionId) {
            this.play();

            if (this.triggerMode === 'single') {
                this.hasPlayed = true;
            }

            return;
        }

        const isSectionActive =
            window.activeSections &&
            window.activeSections.has(sectionId);

        if (!isSectionActive) return;

        const isQueueRunning =
            window.activeSectionQueues &&
            window.activeSectionQueues[sectionId];

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

    /*
     * ------------------------------------------
     * RESET
     * ------------------------------------------
     */

    reset() {
        this.stop();

        this.hasPlayed = false;
        this.processedByQueue = false;

        this.img.style.opacity = '0';
    }

    /*
     * ------------------------------------------
     * ANIMATION LOOP
     * ------------------------------------------
     */

    _renderLoop(time) {
        if (!this.isAnimating) return;

        const dt = time - this.lastTime;

        this.lastTime = time;

        this.progress += dt / this.duration;

        if (this.progress >= 1) {
            this.progress = 1;

            this._draw();

            this.isAnimating = false;

            /*
             * Animation finished.
             * Let the real image take over.
             */
            this.img.style.opacity = '1';
            this.canvas.style.opacity = '0';

            if (this.resolvePlay) {
                this.resolvePlay();
                this.resolvePlay = null;
            }

            /*
             * LOOP MODE
             */
            if (
                this.triggerMode === 'loop' &&
                this.isIntersecting
            ) {
                this.loopTimeout = setTimeout(() => {
                    if (
                        this.triggerMode === 'loop' &&
                        this.isIntersecting
                    ) {
                        this.play();
                    }
                }, 4000);
            }

            return;
        }

        this._draw();

        requestAnimationFrame(this._renderLoop);
    }

    /*
     * ------------------------------------------
     * MAIN DRAW
     * ------------------------------------------
     */

    _draw() {
        const W = this.canvas.width;
        const H = this.canvas.height;

        if (W <= 0 || H <= 0) return;

        this.ctx.clearRect(0, 0, W, H);

        /*
         * Background.
         */
        this.ctx.fillStyle = this.background;

        this.ctx.fillRect(
            0,
            0,
            W,
            H
        );

        /*
         * Draw the terminal static first.
         */
        this._drawStatic(W, H);

        /*
         * Draw the progressively revealed image.
         */
        this._drawImageReveal(W, H);

        /*
         * Draw scanning cursor last.
         */
        if (this.showCursor) {
            this._drawCursor(W, H);
        }
    }

    /*
     * ------------------------------------------
     * TERMINAL STATIC
     * ------------------------------------------
     *
     * This replaces the old 0/1 matrix.
     *
     * It fills the entire unrevealed image with
     * subtle dark amber terminal noise.
     */

    _drawStatic(W, H) {
        this.ctx.save();

        /*
         * Dark amber base.
         */
        this.ctx.fillStyle =
            `rgba(55, 47, 5, ${this.staticOpacity})`;

        this.ctx.fillRect(
            0,
            0,
            W,
            H
        );

        /*
         * Tiny amber terminal characters.
         */
        this.ctx.font =
            `bold ${this.staticFontSize}px monospace`;

        this.ctx.textBaseline = 'top';

        const cellW = 9;
        const cellH = 8;

        /*
         * Deterministic noise.
         *
         * We don't use Math.random() here because that
         * would make the static completely change every
         * frame.
         */
        for (
            let y = 0;
            y < H;
            y += cellH
        ) {
            for (
                let x = 0;
                x < W;
                x += cellW
            ) {
                const noise =
                    Math.sin(
                        x * 12.9898 +
                        y * 78.233
                    ) *
                    43758.5453;

                const random =
                    noise -
                    Math.floor(noise);

                if (
                    random <
                    this.staticDensity
                ) {
                    /*
                     * Mostly very subtle amber.
                     */
                    const brightness =
                        0.08 +
                        random * 0.35;

                    this.ctx.fillStyle =
                        `rgba(233, 196, 0, ${brightness})`;

                    /*
                     * Terminal characters.
                     *
                     * More varied than just 0/1.
                     */
                    const chars =
                        '01+*/<>[]{}$#@%:;';

                    const index =
                        Math.floor(
                            random *
                            chars.length
                        );

                    this.ctx.fillText(
                        chars[index],
                        x,
                        y
                    );
                }
            }
        }

        /*
         * Very subtle horizontal CRT lines.
         */
        this.ctx.fillStyle =
            'rgba(233, 196, 0, 0.035)';

        for (
            let y = 0;
            y < H;
            y += 4
        ) {
            this.ctx.fillRect(
                0,
                y,
                W,
                1
            );
        }

        this.ctx.restore();
    }

    /*
     * ------------------------------------------
     * IMAGE REVEAL
     * ------------------------------------------
     *
     * The important part.
     *
     * We divide the image into horizontal rows.
     *
     * Each row gets completely revealed from one
     * side before the next row begins.
     */

    _drawImageReveal(W, H) {
        if (
            !this.img.complete ||
            this.img.naturalWidth === 0
        ) {
            return;
        }

        const rowHeight = this.rowHeight;

        const totalRows =
            Math.ceil(H / rowHeight);

        /*
         * Overall progress mapped to rows.
         */
        const exactRow =
            this.progress * totalRows;

        const completedRows =
            Math.floor(exactRow);

        const currentRowProgress =
            exactRow - completedRows;

        this.ctx.save();

        /*
         * Draw completed rows.
         */
        if (completedRows > 0) {
            this._drawCompletedRows(
                W,
                H,
                completedRows,
                totalRows
            );
        }

        /*
         * Draw the currently scanning row.
         */
        if (
            completedRows < totalRows
        ) {
            this._drawCurrentRow(
                W,
                H,
                completedRows,
                currentRowProgress
            );
        }

        this.ctx.restore();
    }

    /*
     * ------------------------------------------
     * COMPLETED ROWS
     * ------------------------------------------
     */

    _drawCompletedRows(
        W,
        H,
        completedRows,
        totalRows
    ) {
        this.ctx.save();

        /*
         * Create clipping region containing
         * every completed row.
         */

        this.ctx.beginPath();

        if (
            this.rowDirection ===
            'bottom-to-top'
        ) {
            const completedHeight =
                completedRows *
                this.rowHeight;

            this.ctx.rect(
                0,
                H - completedHeight,
                W,
                completedHeight
            );
        } else {
            const completedHeight =
                completedRows *
                this.rowHeight;

            this.ctx.rect(
                0,
                0,
                W,
                completedHeight
            );
        }

        this.ctx.clip();

        this.ctx.drawImage(
            this.img,
            0,
            0,
            W,
            H
        );

        this.ctx.restore();
    }

    /*
     * ------------------------------------------
     * CURRENT ROW
     * ------------------------------------------
     */

    _drawCurrentRow(
        W,
        H,
        rowIndex,
        rowProgress
    ) {
        const rowHeight = this.rowHeight;

        let y;

        if (
            this.rowDirection ===
            'bottom-to-top'
        ) {
            y =
                H -
                ((rowIndex + 1) * rowHeight);
        } else {
            y =
                rowIndex * rowHeight;
        }

        /*
         * Prevent the final row from exceeding canvas.
         */
        const actualHeight =
            Math.min(
                rowHeight,
                H - y
            );

        if (actualHeight <= 0) return;

        /*
         * Convert progress to width.
         */
        const revealWidth =
            W * rowProgress;

        if (revealWidth <= 0) return;

        this.ctx.save();

        this.ctx.beginPath();

        if (
            this.scanDirection ===
            'right-to-left'
        ) {
            this.ctx.rect(
                W - revealWidth,
                y,
                revealWidth,
                actualHeight
            );
        } else {
            this.ctx.rect(
                0,
                y,
                revealWidth,
                actualHeight
            );
        }

        this.ctx.clip();

        this.ctx.drawImage(
            this.img,
            0,
            0,
            W,
            H
        );

        this.ctx.restore();
    }

    /*
     * ------------------------------------------
     * SCANNER CURSOR
     * ------------------------------------------
     */

    _drawCursor(W, H) {
        const totalRows =
            Math.ceil(H / this.rowHeight);

        const exactRow =
            this.progress * totalRows;

        const rowIndex =
            Math.floor(exactRow);

        /*
         * Animation progress within current row.
         */
        const rowProgress =
            exactRow - rowIndex;

        if (
            rowIndex >= totalRows
        ) {
            return;
        }

        let y;

        if (
            this.rowDirection ===
            'bottom-to-top'
        ) {
            y =
                H -
                ((rowIndex + 1) *
                    this.rowHeight);
        } else {
            y =
                rowIndex *
                this.rowHeight;
        }

        /*
         * Cursor position across current row.
         */
        let x;

        if (
            this.scanDirection ===
            'right-to-left'
        ) {
            x =
                W -
                (W * rowProgress);
        } else {
            x =
                W * rowProgress;
        }

        this.ctx.save();

        /*
         * Main cursor.
         */
        this.ctx.fillStyle =
            this.amber;

        /*
         * Vertical scanner head.
         */
        this.ctx.fillRect(
            x - 1,
            y - 2,
            2,
            this.rowHeight + 4
        );

        /*
         * Small glow.
         */
        this.ctx.shadowColor =
            this.amber;

        this.ctx.shadowBlur = 8;

        this.ctx.fillRect(
            x - 1,
            y - 1,
            2,
            this.rowHeight + 2
        );

        this.ctx.shadowBlur = 0;

        this.ctx.restore();
    }

    /*
     * ------------------------------------------
     * DESTROY
     * ------------------------------------------
     */

    destroy() {
        this.stop();

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
            this.loopTimeout = null;
        }

        if (
            this.canvas &&
            this.canvas.parentNode
        ) {
            this.canvas.parentNode.removeChild(
                this.canvas
            );
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
