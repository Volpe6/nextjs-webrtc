import { v4 as uuidv4 } from 'uuid';
import { toast } from "react-toastify";
import Notifier from './notifier';

const MAX_NEGOTIATION_ATTEMPTS = 30;
/**
 * referencias:
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
 * https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/perfect-negotiation/js/peer.js
 * https://blog.mozilla.org/webrtc/rtcrtptransceiver-explored/
 */
class Peer extends Notifier {

    constructor(polite=null) {
        super();
        this.config = {
            iceServers: [{urls: "stun:stun.stunprotocol.org"}]
        };

        this.transceiver = {};
        this.makingOffer = false;
        this.ignoreOffer = false;
        this.clearingQueue = false;
        this.iceCandidates = [];
        this.isReady = false;//indica se ja recebeu a description
        /**
         * adicionei essa variavel para a quantidade de tentativas de negociaçao estavam acontecendo.
         * Isso foi feito pq existe um fluxo q faz com a negociaçao entre em loop, e fique enviando negociaçoes infinitas sem nunca abrir o canal de comunicaçao. Para controlar isso estabeleci uma quantidade maxima de tentativas de negociaçao, caso a quantidade maxima seja atingida, o peer atual é fechado e a reconexão é tentada novamente com outro peer.
         */
        this.negotiationAttempts = 0;
         /**
         * indica que essa conexao foi fechada. Se essa variavel estiver falsa e o peer estiver desconectado, pode ter havido um erro de conexão ou um fluxo mal tratado
         */
        this.closed = false;
        //https://stackoverflow.com/questions/73566978/how-to-define-polite-and-impolite-peer-in-perfect-negotiation-pattern
        this.polite = polite;

        this.name = '';
        this.target = '';
        this.pc = new RTCPeerConnection(this.config);
        this.pc.ontrack = event => this._onTrack(event);
        this.pc.onicecandidate = event => this._onIceCandidate(event);
        this.pc.onconnectionstatechange = event => this._onConnectionStateChange(event);
        this.pc.oniceconnectionstatechange = event => this._onIceconnectionStateChange(event);
        this.pc.onsignalingstatechange = event => this._onSignalingStateChange(event);
        this.pc.ondatachannel = event => this._onReceiveDataChannel(event);

        this.channel = null;
        this.channelName = null;
        
        window.peer = this;

        this.assert_equals = (a, b, msg) => a === b || void fail(new Error(`${msg} expected ${b} but got ${a}`));
    }

    emit(event, ...args) {
        if(event==='negotiation' && !this.pc) {
            this.notify('info', `Peer ${this.name} >> negotiation so pode ser emitido com um objeto rtcperrconnection iniciado`);
            return;
        }
        if(event==='negotiation') {
            this.negotiationAttempts++;
            if(this.negotiationAttempts> MAX_NEGOTIATION_ATTEMPTS) {
                this.notify('info', `Peer ${this.name} >> tentativas de negociaçoes maximas atingidas fechando peer atual e iniciando tentativa de reconexão`);
                this.close();
                this.notify('retryconnection');
                return;
            }
            this.notify('info', `Peer ${this.name} >> emitindo negotiation`);
        }
        this.notify(event, ...args);
    }
    
    retriveTransceiver(opts) {
        const { displayType } = opts;
        return this.pc.getTransceivers()[displayType];
    }

    addTransceiver(opts) {
        const { trackOrKind, transceiverConfig } = opts;
        this.pc.addTransceiver(trackOrKind, transceiverConfig);
    }

    close() {
        this.negotiationAttempts = 0;
        this.iceCandidates = [];
        this.isReady = false;
        try {
            if(this.channel && (this.channel.readyState !== 'closed' && this.channel.readyState !== 'closing')) {
                this.channel.close();
            }
            if(this.pc) {
                this.pc.close();
            }
        } catch (error) {
            console.error(error);
            this.emit('error', `Peer ${this.name} >> Failed to close: ${error.toString()}`);
            return;
        }
        if(this.channel) {
            this.channel.onmessage = null;
            this.channel.onopen = null;
            this.channel.onclose = null;
            this.channel.onerror = null;
        }
        if(this.pc) {
            this.pc.onnegotiationneeded = null;
            this.pc.oniceconnectionstatechange = null;
            this.pc.onicegatheringstatechange = null;
            this.pc.onsignalingstatechange = null;
            this.pc.onicecandidate = null;
            this.pc.ontrack = null;
            this.pc.ondatachannel = null;
        }
        this.channel = null;
        this.pc = null;
        this.emit('close');
    }

    async addIceCandidate(candidate) {
        try {
            // console.log('adicionado ice candidato')
            await this.pc.addIceCandidate(candidate);
            this.emit('info', `Peer ${this.name} >> ice candidato adicionado`);
        } catch (error) {
            if (!this.ignoreOffer) {
                console.error(error);
                this.emit('error', `Peer ${this.name} >> Failed to add icecandidate: ${error.toString()}`);
            }
        }
    }

    sendPendentIce() {
        /**teria outra forma de fazer isso, usando o getStats e obtendo os ice. Da pra dar uma olahda no simple peer */
        this.iceCandidates.forEach(candidate => this.emit('icecandidate', candidate));
    }

    send(data) {
        if(this.channel && this.channel.readyState === 'connecting') {
            console.log('conexão nao esta aberta');
            this.emit('info', `Peer ${this.name} >> tentou-se enviar um dado pelo canal de comunicação com o canal no estado: ${this.channel.readyState}`);
            return;
        }
        if(!this.channel || (this.channel.readyState === 'closed' || this.channel.readyState === 'closing')) {
            console.log("Conexão fechada");
            this.emit('info', `Peer ${this.name} >> tentou-se enviar um dado pelo canal de comunicação com ele fechado. Estado do canal: ${this.channel.readyState}`);
            return;
        }
        try {
            this.channel.send(data);
        } catch (error) {
            this.emit('error', `Peer ${this.name} >> falha no envio de dados : ${error.toString()}`);
            this.emit('datachannelerror', `Peer ${this.name} >> falha no envio de dados : ${error.toString()}`);
        }
    }
    //envio de arquivo
    //TODO verificar se por esse codigo aqui é o melhor
    // send(e){
    //     var chunkSize = 65535
    //     while (e.byteLength) {
    //         if (this._channel.bufferedAmount > this._channel.bufferedAmountLowThreshold) {
    //         this._channel.onbufferedamountlow = () => {
    //             this._channel.onbufferedamountlow = null;
    //             this.send(e);
    //         };
    //         return;
    //         }
    //         const chunk = e.slice(0, chunkSize);
    //         e = e.slice(chunkSize, e.byteLength);
    //         this._channel.send(chunk);
    // }

    // sendFile(chunk) {
    //     if(this.channel && this.channel.readyState === 'connecting') {
    //         console.log('conexão nao esta aberta');
    //         return;
    //     }
    //     if(!this.channel || (this.channel.readyState === 'closed' || this.channel.readyState === 'closing')) {
    //         console.log("Conexão fechada");
    //         return;
    //     }
    //         var chunkSize = 65535
    //         while (e.byteLength) {
    //             if (this._channel.bufferedAmount > this._channel.bufferedAmountLowThreshold) {
    //             this._channel.onbufferedamountlow = () => {
    //                 this._channel.onbufferedamountlow = null;
    //                 this.send(e);
    //             };
    //             return;
    //             }
    //             const chunk = e.slice(0, chunkSize);
    //             e = e.slice(chunkSize, e.byteLength);
    //             this._channel.send(chunk);
    //     }
    // }

    cleanChannelqueue() {
        if(this.channel && this.channel.readyState === 'connecting') {
            console.log('conexão nao esta aberta');
            this.emit('info', `Peer ${this.name} >> tentando limpar a fila de envio do canal de comunicação com o canal no estado: ${this.channel.readyState}`);
            return;
        }
        if(!this.channel || (this.channel.readyState === 'closed' || this.channel.readyState === 'closing')) {
            console.log("Conexão fechada");
            this.emit('info', `Peer ${this.name} >> tentando limpar a fila de envio do canal de comunicação com o canal no estado: ${this.channel.readyState}`);
            return;
        }
        if(this.clearingQueue) {
            console.log('limpando fila');
            this.emit('info', `Peer ${this.name} >> aguardando fila ser limpa`);
            return;
        }
        this.clearingQueue = true;
    }
    
    /**
     * Nessa implementaçao de conexao webrtc foi utilizado o padrao de negociaçao perfeita
     * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
     */
    async treatNegotiation(content) {
        const description  = content.data;
        console.log(content);
        try {
            const offerCollision =
                description.type === "offer" &&
                (this.makingOffer || this.pc.signalingState !== "stable");

            
            this.ignoreOffer = !this.polite && offerCollision;
            if (this.ignoreOffer) {
                this.pc.ondatachannel = event => this._onReceiveDataChannel(event);
                this.emit('info', `Peer ${this.name} >> ignorou a oferta`);
                this.emit('info', `Peer ${this.name} >> treatNegotiation emitindo negociaçao`);
                this.emit('negotiation', this.pc.localDescription);
                return;
            } 

            await this.pc.setRemoteDescription(description);
            if (description.type === "offer") {
                // se ta recebendo uma oferta, significa q deve retornar uma resposta, essa resposta é fornecida no codigo abaixo
                await this.pc.setLocalDescription();
                this.emit('info', `Peer ${this.name} >> treatNegotiation emitindo negociaçao`);
                this.emit('negotiation', this.pc.localDescription);
            }
            if(this.polite) {
                this._createDataChannel();
            }else {
                this.pc.ondatachannel = event => this._onReceiveDataChannel(event);
            }
        } catch (err) {
            console.error(err);
            this.emit('error', `Peer ${this.name} >> falha na negociação: ${err.toString()}`);
            this.close();
            this.emit('retryconnection');
        }
    }

    async receiveOffer(opts) {
        if(!this.pc) {
            throw new Error('nao pode criar uma resposta sem um objeto rtciniciado');
        }
        if(['connecting', 'connected'].includes[this.pc.connectionState]) {
            this.emit('info', `Peer ${this.name} >> Não é necessário criar a oferta com conexão no estado: ${this.pc.connectionState}`);
            return;
        }
        opts = Object.assign({options:{}}, opts);
        try {
            const { description, options } = opts;
            await this.pc.setRemoteDescription(description);
            const answer = await this.pc.createAnswer(options);
            this.emit('info', `Peer ${this.name} >> criada resposta`);
            await this.pc.setLocalDescription(answer);
            this.isReady = true;
            this.emit('answer', answer);
            //se envia logo em seguida parece nao conseguir lidar direito
            this.emit('peerready');
        } catch (error) {
            this.emit('error', `Peer ${this.name} >> Failed to create session description(answer): ${error.toString()}`);
        }
    }

    async receiveAnswer(opts={}) {
        opts = Object.assign({options:{}}, opts);
        try {
            const { description } = opts;
            await this.pc.setRemoteDescription(description);
            this.isReady = true;
            this.emit('peerready');
        } catch (error) {
            console.error(error);
            this.emit('error', `Peer ${this.name} >> Failed to create session description(Answer): ${error.toString()}`);
        }
    }
    
    async createOffer(opts) {
        console.log('criando oferta')
        if(!this.pc) {
            throw new Error('nao pode criar uma resposta sem um objeto rtciniciado');
        }
        if(['connecting', 'connected'].includes[this.pc.connectionState]) {
            this.emit('info', `Peer ${this.name} >> Não é necessário criar a oferta com conexão no estado: ${this.pc.connectionState}`);
            return;
        }
        opts = Object.assign({options:{}}, opts);
        try {
            const { options } = opts;
            this._createDataChannel();
            const offer = await this.pc.createOffer(options);
            this.emit('info', `Peer ${this.name} >> criada oferta`);
            await this.pc.setLocalDescription(offer);
            this.emit('offer', offer);
        } catch (error) {
            console.log('ereer');
            console.error(error);
            this.emit('error', `Peer ${this.name} >> Failed to create session description(offer): ${error.toString()}`);
        }
    }

    _createDataChannel() {
        if(!this.pc) {
            throw new Error('peer RTCConnection nao criada');
        }
        if(this.channel) {
            //na negocioaçao o par politico acaba recebendo mais de um evento de negociçao. E se deixa passar cria mais de um canal de comuniçao
            this.emit('info', `Peer ${this.name} >> canal ja existe`);
            return;
        }
        this.channelName = uuidv4();
        this.channel = this.pc.createDataChannel(this.channelName);
        this.channel.onopen = (event) => this._onDataChannelOpen(event);
        this.channel.onclose = (event) => this._onDataChannelClose(event);
        this.channel.onmessage = (event) => this._onDataChannelMessage(event);
        this.channel.onerror = (event) => this._onDataChannelError(event);
        this.channel.onbufferedamountlow = (event) => this._onBufferedAmountLow(event);
    }

    _onReceiveDataChannel(event) {
        this.channel = event.channel;
        this.channel.onopen = (event) => this._onDataChannelOpen(event);
        this.channel.onclose = (event) => this._onDataChannelClose(event);
        this.channel.onmessage = (event) => this._onDataChannelMessage(event);
        this.channel.onerror = (event) => this._onDataChannelError(event);
        this.channel.onbufferedamountlow = (event) => this._onBufferedAmountLow(event);
    }

    _onDataChannelOpen(event) {
        console.log('channel open');
        this.emit('datachannelopen', event);
    }

    _onDataChannelClose(event) {
        this.emit('datachannelclose', event);
    }

    _onDataChannelMessage(event) {
        console.log('channel message');
        this.emit('datachannelmessage', event);
    }

    _onDataChannelError(event) {
        console.log('channel error');
        console.log('data error', event);
        this.emit('error', `Peer ${this.name} >> datachannelerror: ${event.error.message}`);
        this.emit('datachannelerror', event);
    }

    _onBufferedAmountLow(event) {
        //fila esta limpa
        this.clearingQueue = false;
        console.log('channel BufferedAmountLow');
        this.emit('datachannelbufferedamountlow', event);
    }

    async _onNegotiationNeeded() {
        try {
            console.log('SLD due to negotiationneeded');
            this.assert_equals(this.pc.signalingState, 'stable', 'negotiationneeded always fires in stable state');
            this.assert_equals(this.makingOffer, false, 'negotiationneeded not already in progress');
            this.makingOffer = true;
            await this.pc.setLocalDescription();
            this.assert_equals(this.pc.signalingState, 'have-local-offer', 'negotiationneeded not racing with onmessage');
            this.assert_equals(this.pc.localDescription.type, 'offer', 'negotiationneeded SLD worked');
            this.emit('negotiation', this.pc.localDescription);
        } catch (error) {
            console.error(error);
            this.emit('error', `Peer ${this.name} >> Failed to create session description: ${error.toString()}`);
        } finally {
            this.makingOffer = false;
        }
    }

    _onIceCandidate({candidate}) {
        if(candidate != null) {
            if(this.isReady) {
                //se ainda nao foi obtido todos os candidatos, envia os q faltam
                this.emit('icecandidate', candidate);
            }
            this.iceCandidates.push(candidate);
            this.emit('info', `Peer ${this.name} >> ice candidates obeteined`);
            return;
        }
        this.emit('info', `Peer ${this.name} >> all ice candidates obeteined`);
    }

    _onTrack(event) {
        console.log('emitindo trck')
        this.emit('track', event);
    }

    _onIceconnectionStateChange(event) {
        if(this.pc.iceConnectionState === "failed") {
            this.emit('info', `Peer ${this.name} >> reiniciando ice`);
            this.pc.restartIce();
        }
        this.emit('iceconnectionstatechange', this.pc.iceConnectionState);
    }

    _onConnectionStateChange(event) {
        if(this.pc.connectionState === 'connected') {
            this.negotiationAttempts = 0;
            this.pc.onnegotiationneeded = event => this._onNegotiationNeeded();
        }
        this.emit('connectionstatechange', this.pc.connectionState);
    }

    _onSignalingStateChange(event) {
        this.emit('signalingstatechange', this.pc.signalingState);
    }
}

//os transiveirs sao adicionados de modo determinista entao caso sua ordem de adiçao seja modificada, aqui deve ser ajustado

export const DISPLAY_TYPES = {
    USER_AUDIO: 0,
    USER_CAM: 1,
    DISPLAY: 2
};

export default Peer;