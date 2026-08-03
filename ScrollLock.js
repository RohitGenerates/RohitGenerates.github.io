// Global scroll lock to prevent any scrolling while a transition is active
export default class ScrollLock {
    constructor() {
        this.locked = false;
        this._onKeydown = this._onKeydown.bind(this);
        // Listen only to keydown to negate manual scroll during lock
        window.addEventListener('keydown', this._onKeydown, { passive: false });
    }

    _onKeydown(e) {
        if (this.locked) {
            const keys = ['Space', ' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
            if (keys.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }

    lock() {
        this.locked = true;
    }
    unlock() {
        this.locked = false;
    }
    isLocked() {
        return this.locked;
    }
}