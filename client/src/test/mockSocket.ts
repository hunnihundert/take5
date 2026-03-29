export class MockSocket {
    id: string;
    connected: boolean;
    listeners: { [event: string]: Function[] } = {};
    emitted: { event: string; args: any[] }[] = [];

    constructor(id = "test-socket-id") {
        this.id = id;
        this.connected = true;
    }

    on(event: string, callback: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return this;
    }

    off(event: string, callback?: Function) {
        if (!callback) {
            delete this.listeners[event];
        } else if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(
                (cb) => cb !== callback,
            );
        }
        return this;
    }

    emit(event: string, ...args: any[]) {
        this.emitted.push({ event, args });
        return this;
    }

    // Helper to simulate incoming server events
    trigger(event: string, ...args: any[]) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((cb) => cb(...args));
        }
    }

    // Helper to clear recorded emissions
    clearEmitted() {
        this.emitted = [];
    }

    // Helper to get last emitted event
    getLastEmitted() {
        return this.emitted[this.emitted.length - 1];
    }
}

export const createMockSocket = (id?: string) => new MockSocket(id) as any;
