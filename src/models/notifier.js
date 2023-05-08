import { v4 as uuidv4 } from 'uuid';

class Notifier {
    constructor() {
        this.observers={};
        this.actions={};
    }

    executeActionStrategy(actions, action, ...args) {
        if(actions[action]) {
            actions[action](...args);
            return;
        }
    }

    detachAllActions() { this.actions={}; }

    attachObserver(opts={id: uuidv4()}) { 
        const { id } = opts;
        const obs = this.observers[id];
        if(obs) {
            throw new Error('ja existe um obs com esse id: ' + id);
        }
        const options = Object.assign({id:uuidv4()}, opts);
        this.observers[options.id] = {
            update: options.obs
        }; 
    }

    detachObserver(id) { 
        if(this.observers[id]) {
            delete this.observers[id]
        }
    }

    detachAllObserver() { this.observers={}; }

    notify(event, ...args) {
        Object.values(this.observers).forEach(obs => obs.update(event, ...args));
    }
}

export default Notifier;