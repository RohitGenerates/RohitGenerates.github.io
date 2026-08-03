export default class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return this;
    }

    emit(event, payload) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach(cb => cb(payload));
        }
        return this;
    }
}