const fs = require('fs');
let lines = fs.readFileSync('index.html', 'utf8').split('\n');

function replaceInRange(start, end, pattern, replacement) {
    for (let i = start - 1; i < end; i++) {
        lines[i] = lines[i].replace(pattern, replacement);
    }
}

// Mastered Tools
for (let i = 321; i < 351; i++) {
    lines[i] = lines[i].replace('uppercase"', 'uppercase" data-hacker-text="single" data-hacker-mode="scramble"');
}

// The Architect
replaceInRange(375, 377, 'uppercase">The', 'uppercase" data-hacker-text="single" data-hacker-mode="terminal">The');
replaceInRange(379, 381, 'leading-tight">', 'leading-tight" data-hacker-text="single" data-hacker-mode="scramble">');
replaceInRange(384, 387, 'leading-relaxed">', 'leading-relaxed" data-hacker-text="single" data-hacker-mode="terminal">');

// BUILDING
lines[418] = lines[418].replace('leading-none">BUILDING', 'leading-none" data-hacker-text="loop" data-hacker-mode="terminal">BUILDING');

// The Foundation
lines[448] = lines[448].replace('tracking-wider">The', 'tracking-wider" data-hacker-text="single" data-hacker-mode="scramble">The');
lines[451] = lines[451].replace('leading-relaxed">Rooted', 'leading-relaxed" data-hacker-text="single" data-hacker-mode="terminal">Rooted');

// The Impact
lines[460] = lines[460].replace('tracking-wider">The', 'tracking-wider" data-hacker-text="single" data-hacker-mode="scramble">The');
lines[463] = lines[463].replace('leading-relaxed">Expanding', 'leading-relaxed" data-hacker-text="single" data-hacker-mode="terminal">Expanding');

// The Philosophy
lines[474] = lines[474].replace('z-10">THE', 'z-10" data-hacker-text="single" data-hacker-mode="scramble">THE');
lines[475] = lines[475].replace('leading-relaxed">', 'leading-relaxed" data-hacker-text="single" data-hacker-mode="terminal">');

// The Arsenal
lines[491] = lines[491].replace('text-on-surface">The Arsenal', 'text-on-surface" data-hacker-text="single" data-hacker-mode="scramble">The Arsenal');
lines[492] = lines[492].replace('on-surface-variant">Core', 'on-surface-variant" data-hacker-text="single" data-hacker-mode="terminal">Core');

for (let i = 496; i < 515; i++) {
    lines[i] = lines[i].replace('font-bold">', 'font-bold" data-hacker-text="single" data-hacker-mode="terminal">');
}

// Contact
lines[749] = lines[749].replace('uppercase">Connect', 'uppercase" data-hacker-text="single" data-hacker-mode="terminal">Connect');
lines[751] = lines[751].replace('leading-none">', 'leading-none" data-hacker-text="single" data-hacker-mode="scramble">');
lines[756] = lines[756].replace('max-w-sm">', 'max-w-sm" data-hacker-text="single" data-hacker-mode="terminal">');

// Email & Location
lines[808] = lines[808].replace('transition-colors"', 'transition-colors" data-hacker-text="single" data-hacker-mode="scramble"');
lines[821] = lines[821].replace('text-on-surface hover:text-primary">', 'text-on-surface hover:text-primary" data-hacker-text="single" data-hacker-mode="scramble">');

fs.writeFileSync('index.html', lines.join('\n'));
