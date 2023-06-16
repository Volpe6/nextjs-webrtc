import { createContext, useEffect, useState, useContext } from "react";
import useAuth from './useAuth';
import { io } from 'socket.io-client';
import Connection from "@/models/connection";
import { toast } from "react-toastify";
import useCall from "./useCall";
import useFile from "./useFile";
import { TYPES as MESSAGE_TYPES } from "@/models/message";
import { DISPLAY_TYPES } from "../models/peer";
import { getDisplayMedia } from "@/utils/mediaStream";

const ConnectionContext = createContext();

//TODO ficar verificando se o nextjs mais recente corrigiu o bug do socket io: https://github.com/vercel/next.js/discussions/48422
//TODO: checar se nao esta preso no status conecting, se estiver, tentar reconectar
//TODO: Parece q quando a guia nao esta em foco a conexão fica presa no conecting, ver como resolver
//TODO: melhorar envio de arquivos
//TODO: melhorar tratamento de erros
//TODO: melhorar tratamento de erros no envio de arquivos

//TODO quando a conexao fechar nao matar o chat so peer connection
export const ConnectionProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connections, setConnections] = useState([]);
    const [currConnection, setCurrConnection] = useState(null);
    const [subscribed, setSubscribed] = useState(false);

    const [displayStream, setDisplayStream] = useState(null);

    const { user } = useAuth();
    const callManager = useCall({ socket, connections, createConnection });
    const fileManager = useFile();

    useEffect(() => {
        
        function onClose(conn, _) {}
        function onError(conn, errMessage) {toast.error(errMessage)}
        function onInfo(conn, infoMessage) {console.warn(infoMessage)}
        function onDataChannelClose(conn, _) {}
        function onConnectionFailed(conn, _) {
            toast.info('conexao falhou');
            hangUp({target: conn.name});
        }
        async function onRetryConnection(conn, _) {
            // a reconexao pressupoe q o outro lado nao fechou o app
            toast.warning('reconectando');
            await connect({conn: conn});
        }
        function onDataChannelOpen(conn, _) {
            if(conn.peer.channel.readyState === 'open') {
                toast.info('canal de comunicação aberto');
            }
        }
        async function onConnectionStateChange(conn, state) {
            console.log('connection state', state);
            switch(state) {
                case "connected":
                    // toast.dismiss();
                    toast.info('conectado');
                    break;
                case "failed":
                case "disconnected":
                case "closed":
                    if(!conn.peer.closed && !conn.tryingConnect) {
                        conn.retryConnect();
                    }
                    break;
            }
        }
        async function onSignalingStateChange(conn, state) {
            console.log('signalingstatechange', state);
        }
        function onNegotiation(conn, description) {
            console.log(`emitindo negociação para: ${conn.peer.target}`);
            socket.emit('negotiation', {
                name: conn.peer.name,
                target: conn.peer.target,
                data: description
            });
        }
        function onOffer(conn, description) {
            console.log(`onoffer`);
            console.log(`emitindo oferta para: ${conn.peer.target}`);
            socket.emit('offer', {
                name: conn.peer.name,
                target: conn.peer.target,
                data: description
            });
        }
        function onAnswer(conn, description) {
            console.log(`emitindo resposta para: ${conn.peer.target}`);
            socket.emit('answer', {
                name: conn.peer.name,
                target: conn.peer.target,
                data: description
            });
        }
        function onPeerReady(conn) {
            console.log(`sinalizando que o peer esta pronto para: ${conn.peer.target}`);
            socket.emit('peerready', {
                name: conn.peer.name,
                target: conn.peer.target
            });
        }
        function onIceCandidate(conn, candidate) {
            console.log('emitindo icecandidate');
            socket.emit('ice-candidate', {
                name: conn.peer.name,
                target: conn.peer.target,
                data: candidate
            });
        }
        async function onDataChannelMessage(conn, content) {
            const msgStrategy = {
                [MESSAGE_TYPES.TEXT]: (msg) => {},
                [MESSAGE_TYPES.FILE_ABORT]: (msg) => {
                    const { message } = msg;
                    toast(`${conn.name} cancelou transferencia do arquivo`);
                    fileManager.cancel(message);
                    fileManager.cancelFilesFromConnection(conn);
                },
                [MESSAGE_TYPES.FILE_ERROR]: (msg) => {
                    const { message } = msg;
                    fileManager.cancel(message);
                },
                [MESSAGE_TYPES.FILE_META]: (msg) => {
                    const { message } = msg;
                    fileManager.receiveFile(conn, message);
                },
                [MESSAGE_TYPES.CHUNK]: (msg) => {
                    const { message } = msg;
                    fileManager.receiveChunk(message);
                },
            }
            try {
                const message = JSON.parse(content.data);
                console.log(message);
                const chosenMessageStrategy = msgStrategy[message.type];
                if(chosenMessageStrategy) {
                    chosenMessageStrategy(message);
                    conn.receive(message);
                }
            } catch (error) {
                console.log('nao foi possivel dar parse na mensagem');
            }
        }
        function onTrack(conn, event) {
            console.log('lidando com track')
            console.log(`track`, event);
            let displayType;
            
            const { transceiver, track, streams } = event;
    
            const trv = conn.peer.retriveTransceiver({displayType: DISPLAY_TYPES.DISPLAY});
            
            const isDisplayStream = transceiver.mid == trv.mid;
    
            if(track.kind === 'audio') {
                displayType = DISPLAY_TYPES.USER_AUDIO;
            } else if(isDisplayStream) {
                displayType = DISPLAY_TYPES.DISPLAY;
            } else {
                displayType = DISPLAY_TYPES.USER_CAM;
            }
    
            let finalStream = null;

            if(streams[0]) {
                switch(displayType) {
                    case DISPLAY_TYPES.USER_AUDIO:
                        finalStream = new MediaStream([streams[0].getAudioTracks()[0]]);
                        break;
                    case DISPLAY_TYPES.USER_CAM:
                    case DISPLAY_TYPES.DISPLAY:
                        finalStream = new MediaStream([streams[0].getVideoTracks()[0]]);
                        break;
                }
            }
    
            track.onmute = () => {
                conn.remoteStreams[displayType].stream = null;
                conn.emit('changetrack');
            };

            conn.remoteStreams[displayType].stream = finalStream;
            conn.emit('changetrack');
        }
        connections.forEach(async conn => {
            conn.attachObserver({
                id: `connection-${conn.name}`,
                obs: async (event, ...args) => {
                    const actions = {
                        close: onClose,
                        error: onError,
                        info: onInfo,
                        datachannelclose: onDataChannelClose,
                        connectionfailed: onConnectionFailed,
                        retryconnection: onRetryConnection,
                        datachannelopen: onDataChannelOpen,
                        datachannelmessage: onDataChannelMessage,
                        track: onTrack,
                        connectionstatechange: onConnectionStateChange,
                        signalingstatechange: onSignalingStateChange,
                        negotiation: onNegotiation,
                        offer: onOffer,
                        answer: onAnswer,
                        peerready: onPeerReady,
                        icecandidate: onIceCandidate
                    }
                    conn.executeActionStrategy(actions, event, ...args);
                }
            });
            //se chama logo em seguida a primeira vez nunca funciona, fazendo com que se conecte geralmente na segunda vez
            // setTimeout(async () => await connect({conn: conn}), 500);
        });
        return () => {
            connections.forEach(conn => {
                conn.detachObserver(`connection-${conn.name}`);
            });
        };
    }, [connections]);
    
    useEffect(() => {
        if(!socket) {
            return;
        }

        const createConn = async (opts) => {
            const prevConn = findConnection(opts.targetName);
            if(prevConn) {
                toast.warning(`conexao para user ${opts.targetName} ja existe. iniciando conexão`);
                prevConn.polite = opts.polite;
                await connect({conn: prevConn});
                return;
            }
            
            const conn = new Connection(opts.targetName);
            conn.polite = opts.polite;
            conn.socket = socket;
           
            setCurrConnection(conn);
            setConnections([...connections, conn]);
            await connect({conn: conn});
        }

        function onConnect() { console.log('conectado ao servidor de sinalização'); }
        function onDisconnect() { console.log('desconectado do server de sinalização'); }
       
        function onSubscribed() { 
            setSubscribed(true);
            console.log('inscrito'); 
        }
        
        async function onPolite(content) {
            createConn({targetName: content.target, polite: content.polite});
        }

        function onHangup(content) {
            const target = findConnection(content.name);
            if (!target || !target.peer) {
                console.log('recebeu hangup nao possui uma conexão rtc iniciada');
                return;
            }
            target.close();
            // removeConnection({target: target.name});
            toast.info(`${content.name} desligado`);
        }

        function onIceCandidate(content) {
            const target = findConnection(content.name);
            if(!target || !target.peer) {
                console.log('recebeu uma icecandidato mas nao possui uma conexão rtc iniciada');
                return;
            }
            console.log('setando icecandidate');
            target.peer.addIceCandidate(content.data);
        }

        function onNegotiation(content) {
            console.log(`recebendo negociação: ${content.name}`);
            const target = findConnection(content.name);
            if(!target || !target.peer) {
                console.log('recebeu uma negociacao mas nao possui uma conexão rtc iniciada');
                return;
            }
            console.log(`processando negociação de: ${content.name}`);
            target.peer.treatNegotiation(content);
        }

        function onOffer(content) {
            const target = findConnection(content.name);
            if(!target || !target.peer) {
                console.log('recebeu uma oferta mas nao possui uma conexão rtc iniciada');
                return;
            }
            console.log(`processando oferta de: ${content.name}`);
            const offer = content.data;
            target.peer.receiveOffer({ description:offer });
        }

        function onAnswer(content) {
            const target = findConnection(content.name);
            if(!target || !target.peer) {
                console.log('recebeu uma resposta mas nao possui uma conexão rtc iniciada');
                return;
            }
            console.log(`processando resposta de: ${content.name}`);
            const answer = content.data;
            target.peer.receiveAnswer({ description:answer });
        }
        
        function onPeerReady(content) {
            const target = findConnection(content.name);
            if(!target || !target.peer) {
                console.log('o par notificou q esta pronto mas nao possui uma conexão rtc iniciada');
                return;
            }
            console.log(`peer: ${content.name}. Pronto`);
            target.peer.sendPendentIce();
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('negotiation', onNegotiation);
        socket.on('offer', onOffer);
        socket.on('answer', onAnswer);
        socket.on('peerready', onPeerReady);
        socket.on('ice-candidate', onIceCandidate);
        socket.on('subscribed', onSubscribed);
        socket.on('hangup', onHangup);
        /** utilizado para saber se o peer desse lado da conexao é o indelicado ou nao em relaçao a conexao q se deseja ser estabelecida. 
         * Essa informaçao so é retornada para o lado q requisitou, o par de comparaçao não é notificado*/
        socket.on('polite', onPolite);

        if(user && !subscribed) {
            socket.emit('subscribe', user.name);
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('negotiation', onNegotiation);
            socket.off('offer', onOffer);
            socket.off('answer', onAnswer);
            socket.off('peerready', onPeerReady);
            socket.off('ice-candidate', onIceCandidate);
            socket.off('subscribed', onSubscribed);
            socket.off('hangup', onHangup);
            socket.off('polite', onPolite);
        };
    }, [socket, user, connections]);

    function createConnection(opts) {
        socket.emit('polite', {name: user.name, target: opts.targetName});
    }
    
    function findConnection(name) {
        const target = connections.find(target => target.name == name);
        if(target) {
            return target;
        }
        return null;
    }

    async function connect(opts) {
        const { conn } = opts;
        //se chama logo em seguida a primeira vez nunca funciona, fazendo com que se conecte geralmente na segunda vez
        setTimeout(async () => await conn.tryConnect({userName:user.name}), 500);
    }

    function handleCurrentConnection(conn) {
        setCurrConnection(conn);
    }

    function addContact(opts) {
        const prevConn = findConnection(opts.targetName);
        if(prevConn) {
            toast.warning(`contato para user ${opts.targetName} ja existe.`);
            return;
        }
        
        const conn = new Connection(opts.targetName);
        conn.polite = opts.polite;
        conn.socket = socket;
        
        setConnections([...connections, conn]);
    }


    const connectSocket = async () => {
        /**
         * versel nao suporta web socket. pra resolver isso vou usar um server externo
         */
        setSocket(io('https://webrtc-signaling-server.glitch.me/'));
        // await fetch('/api/signalingServer');
        // setSocket(io());
    }

    const disconnectSocket = () => {
        if(!socket) {
            throw new Error('conexao de socket ausente');
        }
        socket.disconnect();
    }

    const removeConnection = (opts) => {
        const {target} = opts;
        setConnections(connections.filter(conn=>conn.name !== target));
        if(currConnection && currConnection.name === target) {
            setCurrConnection(null);
        }
    }

    const toogleAudio = async (opts) => {
        if(!currConnection) {
            console.log('atuamente sem conexao');
            return;
        }
        return await currConnection.toogleAudio(opts);
    }

    const toogleCamera = async (opts) => {
        if(!currConnection) {
            console.log('atuamente sem conexao');
            return;
        }
        return await currConnection.toogleCamera(opts);
    }

    const toogleDisplay = async (opts) => {
        if(!currConnection) {
            console.log('atuamente sem conexao');
            return;
        }
        return await currConnection.toogleDisplay(opts);
    }

    const hangUp = (opts) => {
        const { target } = opts;
        const conn = connections.find(conn=>conn.name === target);
        if(!conn) {
            console.log(`conexão com o user "${target}" não encontrado`);
            return;
        }
        fileManager.cancelFilesFromConnection(conn);
        callManager.calls.forEach(call=> {
            if(call.target===target) {
                call.cancel();
                socket.emit('callcanceled', {
                    name: user.name,
                    target: call.target
                });
            }
        });
        try {
            conn.close();
        } catch (error) {
            toast.error(`nao foi possivel fechar a conexao corretamente. ${error}`);
        }
        socket.emit('hangup', {name:user.name, target: conn.name});
        removeConnection({target});

        // if(userStream) {
        //     userStream.getTracks().forEach(track => {
        //         track.stop();
        //         userStream.removeTrack(track);
        //     });
        // }
        // if(displayStream) {
        //     displayStream.getTracks().forEach(track => {
        //         track.stop();
        //         displayStream.removeTrack(track);
        //     });
        // }
    }

    return (
        <ConnectionContext.Provider value={{ 
            socket,
            currConnection,
            connections,
            callManager,
            fileManager,
            displayStream,
            connectSocket,
            createConnection,
            handleCurrentConnection,
            removeConnection,
            addContact,
            disconnectSocket,
            toogleAudio,
            toogleCamera,
            toogleDisplay,
            hangUp
        }}>
            { children }
        </ConnectionContext.Provider>
    );
}

export default function useConnection() {
    return useContext(ConnectionContext);
}