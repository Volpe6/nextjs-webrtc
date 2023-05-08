import { v4 as uuidv4 } from 'uuid';
import Notifier from '@/models/notifier';
import { toast } from 'react-toastify';
//https://github.com/tauri-apps/tauri/issues/996
const CHUNK_SIZE = 26624;

const MAX_BUFFER_AMOUNT = Math.max(CHUNK_SIZE * 8, 5242880); // 8 chunks or at least 5 MiB
/**
 * o tauri é muito lento pra lidar com arquivos, entao limitei pra 10mb
 * de acordo com link abaixo vai melhorar no tauri v2
 * https://github.com/tauri-apps/tauri/issues/1817
 */
const MAX_FILE_SIZE = 15728640;

class FileUpload extends Notifier {
    constructor(opts) {
        super();
        const { id, file, connection } = opts;
        this.id = id;
        if(!id) {
            this.id = uuidv4();
        }
        this.connection = connection;
        this.file = file;
        this.receivedSize = 0;
        this.receiveBuffer = [];

        this.currentOffset = 0;
        this.stopped = false;
        this.cancel = false;

        this.worker = null;
    }

    async receive(data) {
        if(!this.worker) {
            toast('woerk metadata');
            this.worker = new Worker(new URL('./receiveFileWorker.js', import.meta.url));
            this.worker.postMessage({ type: 'metadata', data: this.file });
        }
        this.worker.postMessage({type: 'receive', data: data});
        this.worker.onmessage = (e) => {
            const { type, data } = e.data;
            switch(type) {
                case 'progress':
                    this.notify("progress", data);
                    break;
                case 'received':
                    this.notify("received", this.id, this.file, data);
                    break;
                case 'end':
                    this.worker.terminate();
                    this.notify('end', this.id);
                    break;
            }
        }
    }

    async send() {
        const checkBufferAmount = () => {
            if(this.connection.peer.channel.bufferedAmount > this.connection.peer.channel.bufferedAmountLowThreshold) {
                this.notify("cleanqueue");
                this.notify("info", 'parando');
                this.worker.postMessage({type: 'stop'});
                return;
            }
            this.notify("info", 'continuando');
            this.worker.postMessage({type: 'continue'});
        }

        // if(this.file.size > MAX_FILE_SIZE){
        //     alert(`Tamanho máximo permitido ${MAX_FILE_SIZE}, tamanho do arquivo ${this.metaData.size}`);
        //     return;
        // }
        if(!this.connection) {
            throw new Error('a conexao nao foi definida');
        }

        const interval = setInterval(checkBufferAmount, 300);
        
        this.notify("metadata", { 
            id:this.id, 
            file: {
                name: this.file.name,
                size: this.file.size,
                type: this.file.type
            } 
        });
        this.worker = new Worker(new URL('./sendFileWorker.js', import.meta.url));
        this.worker.postMessage({type: 'start', data: this.file});
        this.worker.onmessage = (e) => {
            const { type, data } = e.data;
            switch(type) {
                case 'progress':
                    this.notify("progress", data);
                    break;
                case 'chunk':
                    this.notify("chunk", {id:this.id, chunk: data});
                    break;
                case 'stoped':
                    this.notify("info", `${this.id}->esperando fila limpar`);
                    break;
                case 'abort':
                    clearInterval(interval);
                    this.worker.terminate();
                    this.notify("abort", data);
                    break;
                case 'error':
                    clearInterval(interval);
                    this.worker.terminate();
                    this.notify("error", data);
                    break;
                case 'end':
                    clearInterval(interval);
                    this.worker.terminate();
                    this.notify('end', this.id);
                    break;
            }
        }
    }
}

export default FileUpload;