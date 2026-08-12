const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';

class HackerText {
    constructor(element) {
        this.element = element;
        this.originalText = element.textContent.trim();
        if (!this.originalText) return;

        this.triggerMode = element.getAttribute('data-hacker-text') || 'single'; // single, loop
        this.renderMode = element.getAttribute('data-hacker-mode') || 'scramble'; // scramble, terminal
        this.isActive = false;
        
        // Wrap characters in spans for exact layout tracking
        this.chars = [];
        this._buildDOM();

        // Canvas setup
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Animation state
        this.progress = 0; // 0 to 1
        this.lastTime = performance.now();
        this.delay = 0;
        this.isAnimating = false;

        this.resizeObserver = new ResizeObserver(() => this._resize());
        this.resizeObserver.observe(this.element);

        this.intersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.play();
                if (this.triggerMode === 'single') {
                    this.intersectionObserver.disconnect();
                }
            } else if (this.triggerMode === 'loop') {
                this.stop();
            }
        }, { threshold: 0.1 });
        
        this.intersectionObserver.observe(this.element);
        
        this._resize();
        this._renderLoop = this._renderLoop.bind(this);
    }

    _buildDOM() {
        this.element.innerHTML = '';
        if (window.getComputedStyle(this.element).position === 'static') {
            this.element.style.position = 'relative';
        }

        // Keep text flow intact but make it invisible
        for (let i = 0; i < this.originalText.length; i++) {
            const char = this.originalText[i];
            const span = document.createElement('span');
            span.textContent = char;
            span.style.opacity = '0'; // Keep it in DOM for layout, but invisible
            if (char === ' ') {
                span.style.whiteSpace = 'pre';
            }
            this.element.appendChild(span);
            this.chars.push({ char, span, x: 0, y: 0, width: 0, resolved: false, currentGlyph: '' });
        }
    }

    _resize() {
        const rect = this.element.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Update character positions
        for (const c of this.chars) {
            c.x = c.span.offsetLeft;
            c.y = c.span.offsetTop;
            c.width = c.span.offsetWidth;
            c.height = c.span.offsetHeight;
        }

        // Get computed styles for canvas rendering
        const style = window.getComputedStyle(this.element);
        this.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        this.color = style.color;
        
        if (!this.isAnimating) {
            this._draw();
        }
    }

    play() {
        if (this.isAnimating) return;
        this.progress = 0;
        this.isAnimating = true;
        this.chars.forEach(c => {
            c.resolved = false;
            c.currentGlyph = '';
        });
        
        this.lastTime = performance.now();
        requestAnimationFrame(this._renderLoop);
    }

    stop() {
        this.isAnimating = false;
        this.progress = 0;
    }

    _renderLoop(time) {
        if (!this.isAnimating) return;

        const dt = time - this.lastTime;
        this.lastTime = time;

        const duration = this.renderMode === 'terminal' ? 1500 : 800; // Terminal is a bit slower
        this.progress += dt / duration;

        if (this.progress >= 1) {
            this.progress = 1;
            this._draw();
            
            if (this.triggerMode === 'loop') {
                this.isAnimating = false;
                setTimeout(() => this.play(), 3000); // Wait 3s before looping
            } else {
                this.isAnimating = false;
            }
            return;
        }

        this._draw();
        requestAnimationFrame(this._renderLoop);
    }

    _draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = this.font;
        this.ctx.fillStyle = this.color;
        this.ctx.textBaseline = 'top';

        if (this.renderMode === 'scramble') {
            this._drawScramble();
        } else if (this.renderMode === 'terminal') {
            this._drawTerminal();
        }
    }

    _drawScramble() {
        const totalChars = this.chars.length;
        const resolvedCount = Math.floor(this.progress * totalChars);

        for (let i = 0; i < totalChars; i++) {
            const c = this.chars[i];
            if (c.char === ' ') continue;

            if (i < resolvedCount) {
                // Resolved character
                this.ctx.globalAlpha = 1;
                this.ctx.fillText(c.char, c.x, c.y);
            } else if (i < resolvedCount + 10) { // Only scramble the next few characters for a cool trailing effect
                // Scrambling character
                if (Math.random() > 0.8 || !c.currentGlyph) {
                    c.currentGlyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                }
                this.ctx.globalAlpha = 0.5 + Math.random() * 0.5;
                this.ctx.fillText(c.currentGlyph, c.x, c.y);
            }
        }
        this.ctx.globalAlpha = 1;
    }

    _drawTerminal() {
        const totalChars = this.chars.length;
        const visibleCount = Math.floor(this.progress * totalChars);
        
        let lastCharX = 0;
        let lastCharY = 0;
        let lastCharWidth = 0;

        for (let i = 0; i < totalChars; i++) {
            const c = this.chars[i];
            
            if (i < visibleCount) {
                this.ctx.fillText(c.char, c.x, c.y);
                lastCharX = c.x;
                lastCharY = c.y;
                lastCharWidth = c.width;
            }
        }

        // Draw Terminal Cursor
        if (this.progress < 1) {
            // Blinking effect logic (blink every ~200ms)
            const blink = Math.floor(performance.now() / 200) % 2 === 0;
            if (blink) {
                let cursorX = 0;
                let cursorY = 0;
                
                if (visibleCount > 0 && visibleCount < totalChars) {
                    const nextC = this.chars[visibleCount];
                    cursorX = nextC.x;
                    cursorY = nextC.y;
                } else if (visibleCount === 0 && totalChars > 0) {
                    cursorX = this.chars[0].x;
                    cursorY = this.chars[0].y;
                } else {
                    cursorX = lastCharX + lastCharWidth;
                    cursorY = lastCharY;
                }

                // The font size string is like "800 48px Bricolage Grotesque", extract the size roughly
                const sizeMatch = this.font.match(/(\d+)px/);
                const cursorHeight = sizeMatch ? parseInt(sizeMatch[1]) : 16;
                const cursorWidth = cursorHeight * 0.6;

                this.ctx.fillStyle = this.color;
                this.ctx.fillRect(cursorX, cursorY, cursorWidth, cursorHeight);
            }
        }
    }
}

export function applyHackerText(el) {
    if (el.__hackerTextInstance) {
        el.__hackerTextInstance.stop();
        el.__hackerTextInstance._buildDOM();
        el.__hackerTextInstance._resize();
        el.__hackerTextInstance.play();
    } else {
        el.__hackerTextInstance = new HackerText(el);
    }
}

export function initHackerText(container = document) {
    const elements = container.querySelectorAll('[data-hacker-text]');
    elements.forEach(el => {
        applyHackerText(el);
    });
}

window.applyHackerText = applyHackerText;
window.initHackerText = initHackerText;
