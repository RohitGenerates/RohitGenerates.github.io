export function initParticles(canvasId) {
    // Performance check: disable on mobile or low-powered devices
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isLowPower = (navigator.hardwareConcurrency || 4) < 4;

    if (isMobile || isLowPower) {
        console.log('Particles disabled on this device for performance.');
        return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const MAX_PARTICLES = 45;

    class Particle {
        constructor(x, y, isPop = false) {
            this.x = x ?? Math.random() * width;
            this.y = y ?? Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.baseRadius = Math.random() * 2 + 1;
            this.radius = this.baseRadius;
            this.life = 1;
            this.decay = Math.random() * 0.002 + 0.001;
            this.mergeCount = 0;
            this.popping = isPop;
            this.popScale = 1;
        }

        update() {
            if (this.popping) {
                this.popScale += 0.1;
                this.life -= 0.05;
                return;
            }

            this.x += this.vx;
            this.y += this.vy;

            // Bounce off walls
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            this.life -= this.decay;
        }

        draw(ctx) {
            ctx.beginPath();
            let currentRadius = this.radius;
            if (this.popping) {
                currentRadius *= this.popScale;
            }

            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);

            // Amber color: #ffd700
            const alpha = Math.max(0, this.life);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgba(255, 215, 0, ${alpha})`;

            if (this.popping) {
                ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = 'transparent';
            }

            ctx.fill();
        }
    }

    // Initialize particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];

            // Handle popping particles
            if (p1.popping) {
                p1.update();
                p1.draw(ctx);
                if (p1.life <= 0) {
                    particles.splice(i, 1);
                    particles.push(new Particle());
                    i--;
                }
                continue;
            }

            p1.update();
            p1.draw(ctx);

            // Merge logic
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                if (p2.popping) continue;

                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < p1.radius + p2.radius) {
                    p1.radius += p2.radius * 0.5;
                    p1.mergeCount += 1;
                    p1.life = 1;

                    particles.splice(j, 1);

                    if (p1.mergeCount >= 3) {
                        p1.popping = true;
                    } else {
                        particles.push(new Particle());
                    }

                    break;
                }
            }

            if (!p1.popping && p1.life <= 0) {
                particles.splice(i, 1);
                particles.push(new Particle());
                i--;
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}
