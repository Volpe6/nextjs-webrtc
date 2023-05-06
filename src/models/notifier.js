import { v4 as uuidv4 } from 'uuid';

class Notifier {
    constructor() {
        this.observers={};
    }

    attachObserver(opts={id: uuidv4()}) { 
        const { id } = opts;
        const obs = this.observers[id];
        if(obs) {
            throw new Error('ja existe um obs com esse id: ' + id);
        }
        const options = Object.assign({id:uuidv4()}, opts);
        this.observers[options.id] = options.obs; 
    }

    detachObserver(id) { 
        const deleted = delete this.observers[id];
        if(!deleted) {
            throw new Error(`não foi possivel remover o observador ${id}`);
        }
    }

    detachAllObserver() { this.observers={}; }

    notify(event, ...args) {
        Object.values(this.observers).forEach(obs => obs(event, ...args));
    }
}

export default Notifier;