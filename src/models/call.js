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

        this.currentCallAttempt = 0;
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
        this.currentCallAttempt = 0;
        this.emit('callcomplete', data);
        this.emit('end');
    }

    complete() {
        this.isCallComplete = true;
        this.currentCallAttempt = 0;
        this.emit('callcomplete', {callSuccess: true});
        this.emit('end');
    }

    async call() {
        while(this.currentCallAttempt< MAX_CALLS && !this.isCallComplete) {
            console.log(`chamada para ${this.target}, tentativa: ${this.currentCallAttempt}`);
            this.emit('calling');
            await new Promise(resolve => setTimeout(resolve, CALL_TIMEOUT));
            this.currentCallAttempt++;
        }
        if(!this.isCallComplete) {
            this.isCallComplete = true;
            this.emit('callcomplete', {callSuccess: false, detail: `${this.target} não atendeu`});
            this.emit('end');
        }
    }
}

export default Call;