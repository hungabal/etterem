// Polyfill for Node.js globals in browser environment
if (typeof window !== 'undefined') {
  // Fix for "global is not defined"
  window.global = window;
  
  // Fix for process references
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  
  // Fix for Buffer references
  window.Buffer = window.Buffer || { isBuffer: () => false };
  
  // Fix for setImmediate
  window.setImmediate = window.setImmediate || ((fn, ...args) => setTimeout(() => fn(...args), 0));
  
  // Fix for clearImmediate
  window.clearImmediate = window.clearImmediate || window.clearTimeout;
  
  // Fix for Object.create inheritance issues
  const originalCreate = Object.create;
  Object.create = function(proto, propertiesObject) {
    if (proto === undefined) {
      console.warn('Object.create called with undefined prototype, using null instead');
      proto = null;
    }
    return originalCreate.call(this, proto, propertiesObject);
  };
  
  // Fix for EventEmitter
  class EventEmitter {
    constructor() {
      this._events = {};
    }
    
    on(event, listener) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(listener);
      return this;
    }
    
    emit(event, ...args) {
      if (!this._events[event]) {
        return false;
      }
      this._events[event].forEach(listener => listener.apply(this, args));
      return true;
    }
    
    removeListener(event, listener) {
      if (!this._events[event]) {
        return this;
      }
      this._events[event] = this._events[event].filter(l => l !== listener);
      return this;
    }
  }
  
  // Provide EventEmitter as a global and as a module export
  window.EventEmitter = EventEmitter;
  
  // Mock the events module
  window.require = window.require || function(module) {
    if (module === 'events') {
      return { default: EventEmitter, EventEmitter };
    }
    throw new Error(`Module ${module} not found`);
  };
}

export default {}; 