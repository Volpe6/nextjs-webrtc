import Notifier from './notifier';

//quantidade maxima de chamada
const MAX_CALLS = 50;
//tempo de tentativa para entre cada chamada
const CALL_TIMEOUT = 5000;

class Call extends Notifier {
    constructor(name, target, isIncoming=false) {
        super();
        this.name = name;
        this.target = target;
        this.isCallComplete = false;
        this.isIncoming = isIncoming;
        this.observers = {};
    }

    emit(event, ...args) {
        this.notify(event, this, ...args);
    }

    cancel(opts={detail:''}) {
        const { detail } = opts;
        const data = {callSuccess: false, detail: `chamada cancelada pelo ${this.target}`};
        if(detail) {
            data.detail = detail;
        }
        this.isCallComplete = true;
        this.emit('callcomplete', data);
        this.emit('end');
    }

    complete() {
        this.isCallComplete = true;
        this.emit('callcomplete', {callSuccess: true});
        this.emit('end');
    }

    async call() {
        let crrCall = 0;
        while(crrCall < MAX_CALLS && !this.isCallComplete) {
            console.log(`chamada para ${this.target}, tentativa: ${crrCall}`);
            this.emit('calling');
            await new Promise(resolve => setTimeout(resolve, CALL_TIMEOUT));
            crrCall++;
        }
        if(!this.isCallComplete) {
            this.isCallComplete = true;
            this.emit('callcomplete', {callSuccess: false, detail: `${this.target} não atendeu`});
            this.emit('end');
        }
    }
}

export default Call;