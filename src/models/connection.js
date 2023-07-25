import Message, { TYPES as MESSAGE_TYPES } from "./message";
import Peer, { DISPLAY_TYPES } from "./peer";
import User from "./user";
import { getDisplayMedia, getUserMedia } from '../utils/mediaStream';
import { toast } from "react-toastify";
import Notifier from './notifier';

const MAX_RETRIES = 5;
const TIMEOUT = 5000;
const PEER_ID = 'peer';

class Connection extends Notifier {
    constructor(name) {
        super();
        this.name = name;
        this.user = new User(name);
        this.peer = null;
        this.messages = {};
        this.polite = null;
        this.retries = 0;
        this.tryingConnect = false;
        this.closed = false;
        this.checkStatusIntervalId = null;
        
        //a conexao pode receber candidatos ice sem o peer estar iniciado. Para evitar erros, eles sao armazenados e depois enviados ao peer
        this.pendentIce = [];

        this.displayStream = null;//do local
        this.userStream = null;//do local

        const id = `${this.user.name}-media`;

        this.remoteStreams = {
            [DISPLAY_TYPES.USER_AUDIO]: {
                id: id,
                type: DISPLAY_TYPES.USER_AUDIO,
                isFullScreen: false,
                stream: null
            },
            [DISPLAY_TYPES.USER_CAM]: {
                id: id,
                type: DISPLAY_TYPES.USER_CAM,
                isFullScreen: false,
                stream: null
            },
            [DISPLAY_TYPES.DISPLAY]: {
                id: id,
                type: DISPLAY_TYPES.DISPLAY,
                isFullScreen: false,
                stream: null
            },
        }
    }

    detachObserver(id) {
        super.detachObserver(id);
        if(this.peer) {
            this.peer.detachObserver(id);
        }
    }

    emit(event, ...args) {
        this.notify(event, this, ...args);
    }

    retryConnect() {
        this.emit('retryconnection');
    }

    async tryConnect(opts) {
        if(this.tryingConnect) {
            return;
        }
        const { userName } = opts
        this.tryingConnect = true;
        //TODO como quero reutilizar essa conexao nesse momento eu reseto o closed. Tem q ver se isso nao quebra em algum momento quando é definido como true
        this.closed = false;
        while(this.retries<MAX_RETRIES && !this.closed) {
            if(this.peer && this.peer.pc && ['connecting', 'connected'].includes(this.peer.pc.connectionState)) {
                break;
            }
            toast.info(`tentatia de conexão nº ${this.retries+1}. Para o usuário:${this.user.name}`);
            await this.initPeer(userName);
            await new Promise(resolve => setTimeout(resolve, TIMEOUT));
            this.retries++;
        }
        this.tryingConnect = false;
        this.retries = 0;
        if(this.peer && this.peer.pc && !['connecting', 'connected'].includes(this.peer.pc.connectionState)) {
            toast.info(`Não foi possivel restabelecer. Para o usuário:${this.user.name}`);
            this.emit('connectionfailed');
        }
    }

    getMessages() { return this.messages; }

    async getUserMedia(opts) {
        let stream = await getUserMedia(opts);
        if(this.userStream) {
            stream.getTracks().forEach(track => this.userStream.addTrack(track));
            stream = this.userStream;
        }
        this.userStream = stream;
        return stream;
    }

    async getDisplayMedia(opts) {
        this.displayStream = await getDisplayMedia(opts);
        return this.displayStream;
    }

    async checkMediaStatus() {
        const endTrack = (type) => {
            let stream = this.remoteStreams[type].stream;
            if(!stream) {
                return;
            }
            stream.getTracks().forEach(track => {
                track.onended();
            });
            stream = null;
            this.remoteStreams[type].stream = stream;
            this.emit('changetrack');
        }
        if(this.checkStatusIntervalId) {
            clearInterval(this.checkStatusIntervalId);
        }
        this.checkStatusIntervalId = setInterval(() => {
            if(!this.peer.pc) {
                return;
            }
            this.peer.pc.getStats().then(stats => {
                stats.forEach(report => {
                    if(report.type !== 'inbound-rtp') {
                        return;
                    }
                    if (report.mediaType === 'video') {
                        const framesPerSecond = report.framesPerSecond;
                        const mid = report.mid;
                        if(!framesPerSecond) {
                            const trv = this.peer.retriveTransceiver({displayType: DISPLAY_TYPES.DISPLAY});
                            const isDisplayStream = mid == trv.mid;
                            endTrack(isDisplayStream?DISPLAY_TYPES.DISPLAY:DISPLAY_TYPES.USER_CAM);
                        }
                    }
                    if (report.mediaType === 'audio') {
                        const audioLevel = report.audioLevel;
                        if(audioLevel === 0) {
                            endTrack(DISPLAY_TYPES.USER_AUDIO);
                        }
                    }
                });
            }).catch(error => {
                console.error('Erro ao obter estatísticas:', error);
            });
        }, 1000);
    }

    async mediaForwarding() {
        if(this.displayStream && this.displayStream.getVideoTracks()[0] && this.displayStream.getVideoTracks()[0].enabled) {
            this.toogleDisplay({resend:true});
        }
        if(this.userStream && this.userStream.getVideoTracks()[0] && this.userStream.getVideoTracks()[0].enabled) {
            this.toogleCamera({resend:true});
        }
        if(this.userStream && this.userStream.getAudioTracks()[0] && this.userStream.getAudioTracks()[0].enabled) {
            this.toogleAudio({resend:true});
        }
    }

    async toogleUserTrack(opts) {
        function getTrackFromStream(opts) {
            const trackType = {
                video: (stream) => stream.getVideoTracks()[0],
                audio: (stream) => stream.getAudioTracks()[0]
            };
            const { mediaType, stream } = opts;
            const getTrack = trackType[mediaType];
            if(getTrack) {
                return getTrack(stream);
            }
            throw new Error(`nao foi fonecido o um tipo valido. Tipo fornecido: ${mediaType}`);
        }
        const config = Object.assign(
            {
                mediaType: 'audio',
                displayType: DISPLAY_TYPES.USER_AUDIO,
                mediaConfig: {audio: true},
                requestNewTrack: false,
                resend: false,//reenvia o stream existente
                close: false
            },
            opts
        );
        const { mediaType, displayType, mediaConfig, resend, requestNewTrack, close } = config;
        const data = { mediaType: mediaType };
        let stream = this.userStream;
        let track = null;
        //verifica se o user stream ja foi definido e se possui o track especifico
        if(this.userStream && getTrackFromStream({mediaType, stream: this.userStream})) {
            track = getTrackFromStream({mediaType, stream: this.userStream});
            // se for video. troca o estado atual do video(se ira mostra-lo ou nao)
            // se for audio, muta ou desmuta
            /** se o display esta setado significa a tela esta sendo compartilhada, 
             * entao o compartilhamento é parado e a stream é definida como nula para 
             * q na proxima execuçao o compartilhamento seja executado novamente */
            if(!resend) {
                track.stop();
                this.userStream.removeTrack(track);
                if(requestNewTrack) {
                    track=null;
                }
            }
        }
        if(!resend && !track && !close) {
            try {
                //se nao possui o track de video/audio ele é requisitado
                stream = await this.getUserMedia(mediaConfig);
                if(!stream) {
                    throw new Error('nao foi possivel recuperar a midia');
                }
            } catch (e) {
                console.error(`toogleUserTrack() error: ${e.toString()}`);
                return null;
            }
            track = getTrackFromStream({mediaType, stream: stream});
        }
        data.stream = stream;
        if(!this.peer) {
            this.emit('info', `Recuperando stream, porém a conexão com ${this.name} não foi iniciada. A stream ainda sera retornada, mas nao anexada automaticamente ao transiver`);
            this.emit('changeuserstream', data);
            return stream;
        }
        if(!this.peer.pc) {
            this.emit('info', `Recuperando stream, porém a conexão rtc com ${this.name} não foi iniciada. A stream ainda sera retornada, mas nao anexada automaticamente ao transiver`);
            this.emit('changeuserstream', data);
            return stream;
        }
        if(this.peer.pc.getTransceivers().length === 0) {
            this.emit('info', `Recuperando stream, porém nenhum transiver foi anexado a conexão rtc com ${this.name}. A stream ainda sera retornada, mas nao anexada automaticamente ao transiver`);
            this.emit('changeuserstream', data);
            return stream;
        }
        const transceiver = this.peer.retriveTransceiver({ displayType });
        if(!resend && track && !track.enabled) {
            transceiver.sender.replaceTrack(null);
            //https://blog.mozilla.org/webrtc/rtcrtptransceiver-explored/
            /** codigo utilizado para notificar o outro lado q track foi parado. Apenas utilizar
             *  replaceTrack(null) nao notifica o outro lado, e é indistinguivel de um problema de internet */
            transceiver.direction = 'recvonly';
            this.emit('changeuserstream', data);
            return stream;
        }
        if(resend) {
            transceiver.direction = 'recvonly';
        }
        if(stream) {
            transceiver.direction = "sendrecv";
            transceiver.sender.replaceTrack(track);
            transceiver.sender.setStreams(stream);
            this.emit('changeuserstream', data);
        }
        return stream;
    }

    /**
     * Compartilha o audio d usuario. Se o audio ja estiver sendo compartilhada para o compartilhamento.
     * tenta utilizar a stream ja existente so adicionando os track ausentes 
     */
    async toogleAudio(opts) {
        const config = Object.assign(
            {
                mediaType: 'audio',
                displayType: DISPLAY_TYPES.USER_AUDIO,
                mediaConfig: {audio: true},
                requestNewTrack: false,
            },
            opts
        );
        return await this.toogleUserTrack(config);
    }

    /**
     * Compartilha a camera d usuario. Se a camera ja estiver sendo compartilhada para o compartilhamento.
     * Ao contrario do codigo do compartilhamento da tela, nesse caso tenta utilizar a stream ja existente 
     * so adicionando os track ausentes 
     */
    async toogleCamera(opts) {
        const config = Object.assign(
            {
                mediaType: 'video',
                displayType: DISPLAY_TYPES.USER_CAM,
                mediaConfig: {
                    video: {
                        width: {
                            ideal: 1280,
                            min: 320
                        },
                        height: {
                            ideal: 720,
                            min:240
                        }
                    }
                },
                requestNewTrack: false,
            },
            opts
        );
        return await this.toogleUserTrack(config);
    }

    async toogleDisplay(opts={onended:null}) {
        const config = Object.assign(
            {
                onended: null,
                resend: false,//reenvia o stream existente sem criar um novo
                mediaConfig: {
                    video: {
                        width: {
                            ideal: 1280,
                        },
                        height: {
                            ideal: 720,
                        }
                    }
                },
                close: false
            },
            opts
        );
        const { onended, mediaConfig, resend, close } = config;
        const data = { mediaType: 'video' };
        if(!resend && this.displayStream) {
            /** se o display esta setado significa a tela esta sendo compartilhada, entao o compartilhamento é parado e a stream é definida como nula para q na proxima execuçao o compartilhamento seja executado novamrnte */
            this.displayStream.getTracks().forEach(track => {
                track.stop();
                this.displayStream.removeTrack(track);
            });
            data.stream = this.displayStream = null;
            this.emit('changedisplaystream', data);
            return this.displayStream;
        }
        if(close) {
            /** caso seja para parar de enviar a stream, simplesmente nao deixa que o processamento abaixo ocorra */
            return;
        }
        let stream = this.displayStream; 
        if(!resend) {
            try {
                /** aqui ao inves de tentar reutiliza o stream é feita uma nova solicitaçao para o compartilhamento de tela */
                stream = await this.getDisplayMedia(mediaConfig);
                if(!stream) {
                    throw new Error('nao foi possivel recuperar a midia');
                }
            } catch (e) {
                console.error(`toogleDisplay() error: ${e.toString()}`);
                return;
            }
        } 
        data.stream = stream;
        stream.getVideoTracks()[0].onended = () => {
            data.stream = this.displayStream = null;
            this.emit('changedisplaystream', data);
            if(onended) {
                onended();
            }
        };
        if(!this.peer || this.peer.pc.getTransceivers().length === 0) {
            console.log('atuamente sem conexao ou sem nenhum transiver. A stream ainda sera retornada, mas nao anexada ao transiver');
            this.emit('changedisplaystream', data);
            return stream;
        }
        const transceiver = this.peer.retriveTransceiver({ displayType: DISPLAY_TYPES.DISPLAY });
        if(resend) {
            transceiver.direction = 'recvonly';
        }
        stream.getVideoTracks()[0].onended = () => {
            transceiver.sender.replaceTrack(null);
            transceiver.direction = 'recvonly';
            data.stream = this.displayStream = null;
            this.emit('changedisplaystream', data);
            if(onended) {
                onended();
            }
        };
        transceiver.direction = "sendrecv";
        transceiver.sender.replaceTrack(stream.getVideoTracks()[0]);
        transceiver.sender.setStreams(stream);
        this.emit('changedisplaystream', data);
        return stream;
    }

    closePeer() {
        this.peer.closed = true;
        this.peer.close();
        this.peer = null;
        if(this.userStream) {
            this.userStream.getTracks().forEach(track => {
                track.stop();
                this.userStream.removeTrack(track);
            });
        }
        if(this.displayStream) {
            this.displayStream.getTracks().forEach(track => {
                track.stop();
                this.displayStream.removeTrack(track);
            });
        }
    }

    close() {
        this.closed = true;
        this.closePeer();
    }

    async initPeer(userName) {
        try {
            this.peer = new Peer(this.polite);
            this.peer.name = userName;
            this.peer.target = this.name;
            this.peer.attachObserver({
                id: PEER_ID,
                obs:async (event, ...args) => {
                    const actions = {
                        datachannelopen: async (conn, _) => {
                            if(this.peer.channel.readyState === 'open') {
                                this.checkMediaStatus();
                            }
                        },
                        // signalingstatechange: async (conn, state) => {
                        //     if(this.polite && state === 'have-remote-offer') {
                        //         await this.toogleAudio({ enabled:true });
                        //     }
                        // },
                        // track: (_) => {
                        //     console.log('track dentro connection');
                        // },
                        // datachannelopen: (conn, _) => {
                        //     if(this.peer.channel.readyState === 'open') {
                        //         if(!this.polite) {
                        //             this.peer.addTransceiver({ id:'useraudio', trackOrKind: 'audio', transceiverConfig:{direction: "sendrecv"} });
                        //             this.peer.addTransceiver({ id:'usercam', trackOrKind:'video', transceiverConfig:{direction: "sendrecv"} });
                        //             this.peer.addTransceiver({ id:'display', trackOrKind:'video', transceiverConfig:{direction: "sendrecv"} });
                        //         }
                        //     }
                        // },
                        connectionstatechange: (conn, state) => {
                            switch(state) {
                                case "connecting":
                                case "connected":
                                    this.tryingConnect = false;
                                    this.retries = 0;
                                    break;
                            }
                        }
                    }
                    this.executeActionStrategy(actions, event, ...args);
                    this.emit(event, ...args);
                }
            });
        } catch (e) {
            throw new Error(`handlePeerConnection() error: ${e.toString()}`);
        }
        if(!this.polite) {
            // const audioStream = await this.toogleAudio({ enabled: true });
            // this.peer.addTransceiver({ id:'useraudio', trackOrKind: audioStream.getAudioTracks()[0], transceiverConfig:{direction: "sendrecv", streams:[audioStream]} });
            /**com o padrao de negociação perfeita no momento que um transiver é adicionado a negociação é disparada e tenta-se estabelecer uma conexão */
            this.peer.addTransceiver({ id:'useraudio', trackOrKind: 'audio', transceiverConfig:{direction: "sendrecv"} });
            this.peer.addTransceiver({ id:'usercam', trackOrKind:'video', transceiverConfig:{direction: "sendrecv"} });
            this.peer.addTransceiver({ id:'display', trackOrKind:'video', transceiverConfig:{direction: "sendrecv"} });
            await this.peer.createOffer();
        }
        return this.peer;
    }

    send(data={type:MESSAGE_TYPES.TEXT}) {
        if(!this.peer) {
            throw new Error('a conexao nao foi estabelecida');
        }
        if(!this.peer.channel || this.peer.channel.readyState !== 'open') {
            throw new Error('o canal de comunicacao nao foi aberto');
        }
        const { message, type } = data;
        const msg = this._addMessage(this.peer.name, this.peer.target, message, type);
        this.peer.send(JSON.stringify(msg));
    }
    
    receive(data) {
        if(!this.peer) {
            throw new Error('a conexao nao foi estabelecida');
        }
        const { message, type } = data;
        this._addMessage(this.peer.target, this.peer.name, message, type);
    }

    _addMessage(sender, receiver, content, type) { 
        const msg = new Message(sender, receiver, content, type);
        //caso seja um arquivo o id da mesagem passa a ser o id do arquivo
        switch(type) {
            case MESSAGE_TYPES.FILE_META:
                msg.id = content.id;
                msg.message.file.canceled = false;
                msg.message.file.error = false;
                msg.message.file.complete = false;
                msg.message.file.downloadFile = null;//objeto blob a ser baixado quando a transferencia for concluida
                break;
            case MESSAGE_TYPES.FILE_ABORT:
            case MESSAGE_TYPES.FILE_ERROR:
            case MESSAGE_TYPES.CHUNK:
                msg.id = content.id;
                break;
        }
        //esses tipos de mensagens o usuario nao precisa ver
        if(![MESSAGE_TYPES.CHUNK, MESSAGE_TYPES.FILE_ABORT, MESSAGE_TYPES.FILE_ERROR].includes(type)) {
            this.messages[`${msg.id}`] = msg; 
        }
        return msg;
    }
}

export default Connection;