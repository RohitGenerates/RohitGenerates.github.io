// Global scroll lock to prevent any scrolling while a transition is active
export default class ScrollLock {
    constructor() {
        this.locked = false;
        this._onWheel = this._onWheel.bind(this);
        // Listen to wheel and touchmove to negate manual scroll during lock
        window.addEventListener('wheel', this._onWheel, { passive: false });
        window.addEventListener('touchmove', this._onWheel, { passive: false });
    }

    _onWheel(e) {
        if (this.locked) {
            e.preventDefault();
            e.stopPropagation();
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