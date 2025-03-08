// Node.js globális változók polyfill-je böngésző környezetben
// Ez a fájl biztosítja, hogy a Node.js környezetben működő kódok böngészőben is működjenek
if (typeof window !== 'undefined') {
  // "global is not defined" hiba javítása
  // A Node.js-ben a global objektum a globális névtér, böngészőben ez a window
  window.global = window;
  
  // process hivatkozások javítása
  // A Node.js-ben a process objektum információkat tartalmaz a futó folyamatról
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  
  // Buffer hivatkozások javítása
  // A Node.js-ben a Buffer osztály bináris adatok kezelésére szolgál
  window.Buffer = window.Buffer || { isBuffer: () => false };
  
  // setImmediate javítása
  // A Node.js-ben a setImmediate függvény a következő eseményhurok iterációban futtatja a függvényt
  window.setImmediate = window.setImmediate || ((fn, ...args) => setTimeout(() => fn(...args), 0));
  
  // clearImmediate javítása
  // A Node.js-ben a clearImmediate függvény törli a setImmediate által ütemezett függvényhívást
  window.clearImmediate = window.clearImmediate || window.clearTimeout;
  
  // Object.create öröklődési problémák javítása
  // Biztosítja, hogy az Object.create ne kapjon undefined prototípust
  const originalCreate = Object.create;
  Object.create = function(proto, propertiesObject) {
    if (proto === undefined) {
      console.warn('Object.create called with undefined prototype, using null instead');
      proto = null;
    }
    return originalCreate.call(this, proto, propertiesObject);
  };
  
  // EventEmitter implementáció
  // A Node.js-ben az EventEmitter osztály eseménykezelésre szolgál
  class EventEmitter {
    constructor() {
      // Események tárolása
      this._events = {};
    }
    
    // Eseményfigyelő hozzáadása
    // event: az esemény neve
    // listener: a függvény, amely az esemény bekövetkezésekor fut
    on(event, listener) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(listener);
      return this;
    }
    
    // Esemény kiváltása
    // event: az esemény neve
    // args: az eseményfigyelőnek átadandó paraméterek
    emit(event, ...args) {
      if (!this._events[event]) {
        return false;
      }
      this._events[event].forEach(listener => listener.apply(this, args));
      return true;
    }
    
    // Eseményfigyelő eltávolítása
    // event: az esemény neve
    // listener: az eltávolítandó függvény
    removeListener(event, listener) {
      if (!this._events[event]) {
        return this;
      }
      this._events[event] = this._events[event].filter(l => l !== listener);
      return this;
    }
  }
  
  // EventEmitter elérhetővé tétele globálisan és modulexportként
  window.EventEmitter = EventEmitter;
  
  // events modul emulálása
  // A Node.js-ben a require függvény modulok betöltésére szolgál
  window.require = window.require || function(module) {
    if (module === 'events') {
      return { default: EventEmitter, EventEmitter };
    }
    throw new Error(`Module ${module} not found`);
  };
}

export default {}; 