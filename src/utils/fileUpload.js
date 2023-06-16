import { v4 as uuidv4 } from 'uuid';
import Notifier from '@/models/notifier';
import { toast } from 'react-toastify';
import FileConstants from './fileConstants';
class FileUpload extends Notifier {
    constructor(opts={isReceive:false}) {
        super();
        const { id, file, connection, isReceive } = opts;
        this.id = id;
        if(!id) {
            this.id = uuidv4();
        }
        this.connection = connection;
        this.isReceive = isReceive;
        
        this.file = file;

        this.receivedSize = 0;
        this.receiveBuffer = [];

        this.currentOffset = 0;
        this.stopped = false;
        this.cancel = false;

        this.worker = null;
        this.fileReader = null;
        this.checkBufferAmountId = null;
    }

    async abort() {
        const notifyMessage = () => {
            const message = 'abortado';
            this.connection.emit('info', `Connection ${this.connection.name} >> ${message}`);
            this.notify("abort", this.id, 'sds');
            this.notify('end', this.id);
        }
        if (typeof window.Worker !== "undefined") {
            if(this.worker) {
                if(this.isReceive) {
                    notifyMessage();
                }
                this.worker.postMessage({type: 'abort'});
                //espera um pouco pra processar, se nao isso nao é notificado ao front
                await new Promise(resolve => setTimeout(resolve, 1000))
                this.worker.terminate();
                return;
            }
        } else {
            if(this.fileReader) {
                this.fileReader.abort();
                return;
            }
        }
        notifyMessage();
    }

    async receive(data) {
        if(!this.connection) {
            throw new Error('a conexao nao foi definida');
        }
        if (typeof window.Worker !== "undefined") {
            // Web Workers são suportados
            if(!this.worker) {
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
        } else {
            // Web Workers não são suportados
            const buffer = Uint8Array.from(data).buffer;
            this.receiveBuffer.push(buffer);
            this.receivedSize += buffer.byteLength;
            
            this.notify('progress', (this.receivedSize*100)/file.size);
            if(this.receivedSize === this.file.size) {
                const received = new Blob(this.receiveBuffer);
                this.receiveBuffer = [];
                this.receivedSize = 0;
                this.notify('received',this.id, this.file, received);
                this.notify('end', this.id);
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

        const interval = setInterval(checkBufferAmount, 100);
        
        this.notify("metadata", { 
            id:this.id, 
            file: {
                name: this.file.name,
                size: this.file.size,
                type: this.file.type
            } 
        });
        if (typeof window.Worker !== "undefined") {
            // Web Workers são suportados
            this.worker = new Worker(new URL('./sendFileWorker.js', import.meta.url));
            this.worker.postMessage({type: 'start', data: this.file});
            this.worker.onmessage = (e) => {
                const { type, data } = e.data;
                switch(type) {
                    case 'progress':
                        this.notify("progress", data);
                        break;
                    case 'received'://aquivo foi lido e colocado em um blob afim de possibilitar download do mesmo pelo chat
                        this.notify("received", this.id, this.file, data);
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
                        this.connection.emit('info', `Connection ${this.connection.name} >> ${data}`);
                        this.notify("abort", this.id, data);
                        this.notify('end', this.id);
                        break;
                    case 'error':
                        clearInterval(interval);
                        this.worker.terminate();
                        this.connection.emit('error', `Connection ${this.connection.name} >> ${data}`);
                        this.notify("error", this.id, data);
                        this.notify('end', this.id);
                        break;
                    case 'end':
                        clearInterval(interval);
                        this.worker.terminate();
                        this.notify('end', this.id);
                        break;
                }
            }
        } else {
            // Web Workers não são suportados
            this.fileReader = new FileReader();
            let offset = 0;
            fileReader.onerror =  error => {
                const message = `Erro lendo o arquivo: ${this.file.name}. ${error.toString()}`;
                this.connection.emit('error', `Connection ${this.connection.name} >> ${message}`);
                this.notify('error', this.id, message);
            }
            fileReader.onabort = (e) => {
                const message = `Leitura do arquivo abortado: ${this.file.name}`;
                this.connection.emit('info', `Connection ${this.connection.name} >> ${message}`);
                this.notify('abort', this.id, message);
                this.notify('end', this.id);
            };
            fileReader.onload = async (e) => {
                console.log('FileRead.onload ', e);
                while(stop) {
                    this.notify('stoped');
                    await new Promise(resolve => setTimeout(resolve, FileConstants.SLEEP_TIME));
                }
                //envia o resultado da leitura de volta
                /**
                 * nao tava conseguindo enviar um array de buffer em um objeto stringficado.
                 * entao transformei o ArrayBuffer retornado em um Uint8Array e entao transforma-lo 
                 * em um array
                 * TODO: verificar se tem uma forma de fazer isso melhor
                 */
                this.notify('chunk', {id:this.id, chunk: Array.from(new Uint8Array(e.target.result))});
                this.receiveBuffer.push(e.target.result);
                offset += e.target.result.byteLength;
                this.notify("progress", (offset*100)/this.file.size);
                //se o arquivo nao foi completamente lido, le o proximo pedaço do arquivo
                if (offset < this.file.size) {
                    readSlice(offset);
                } else {
                    this.notify("received", this.id, this.file, new Blob(this.receiveBuffer));
                    this.receiveBuffer = [];
                    this.notify('end', this.id);
                    this.notify('end', this.id);
                }
            };

            const readSlice = crrOffset => {
                console.log('readSlice ', crrOffset);
                const slice = this.file.slice(offset, crrOffset + FileConstants.CHUNK_SIZE);
                fileReader.readAsArrayBuffer(slice);
            };

            readSlice(0);//inicia a leitura do arquivo como array buffer
        }
    }
}

export default FileUpload;