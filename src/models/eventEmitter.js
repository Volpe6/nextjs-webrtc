
/**
 * exemplo:
 * const myObj = new EventEmitter();

  const callback = (arg1, arg2) => {
    console.log(`Received event with arguments: ${arg1}, ${arg2}`);
  };

  myObj.on("event", callback);

  myObj.emit("event", "foo", "bar");

  myObj.off("event", callback);

  myObj.emit("event", "baz", "qux");
*/
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);
  }

  off(event, callback) {
    if (this.events[event]) {
      const index = this.events[event].indexOf(callback);
      if (index !== -1) {
        this.events[event].splice(index, 1);
      }
    }
  }

  offAll() {
    Object.keys(this.events).forEach((event) => {
      this.events[event].forEach((callback) => {
        this.off(event, callback);
      });
    });
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => {
        callback(...args);
      });
    }
  }
}


export default EventEmitter;