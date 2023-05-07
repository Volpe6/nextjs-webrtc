import { createContext, useEffect, useState, useContext } from "react";
import useAuth from './useAuth';
import { io } from 'socket.io-client';
import Connection from "@/models/connection";
import { toast } from "react-toastify";
import useCall from "./useCall";

const ConnectionContext = createContext();

//TODO: melhorar envio de arquivos
//TODO: melhorar tratamento de erros
//TODO: melhorar tratamento de erros no envio de arquivos

//TODO quando a conexao fechar nao matar o chat so peer connection

//TODO verificar a possibilidade de usar o server interno do next js em substituiçao do server de sinalizaçao externo

function useSocket(url) {
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    fetch(url).finally(() => {
      const socketio = io();
      socketio.on('connect', () => {
        console.log('connect');
        socketio.emit('hello');
      });
      socketio.on('disconnect', () => {
        console.log('disconnect');
      });
      setSocket(socketio);
    });
    // function cleanup() {
    //   socket.disconnect();
    // }
    // return cleanup;
  }, []);
  return socket;
}
export const ConnectionProvider = ({ children }) => {

    const a = useSocket('/api/signalingServer');

    const [socket, setSocket] = useState(null);
    const [connections, setConnections] = useState([]);
    const [currConnection, setCurrConnection] = useState(null);
    const [subscribed, setSubscribed] = useState(false);

    const { user } = useAuth();
    const call = useCall({ socket, connections, createConnection });
    
    useEffect(() => {
        async function connect(opts) {
            const { conn } = opts;
            await conn.tryConnect({userName:user.name});
        }
        
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
            if(conn.polite && state === 'have-remote-offer') {
                await conn.toogleAudio({ enabled:true });
            }
        }
        function onNegotiation(conn, description) {
            console.log(`emitindo negociação para: ${conn.peer.target}`);
            socket.emit('negotiation', {
                name: conn.peer.name,
                target: conn.peer.target,
                data: description
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

        connections.forEach(async conn => {
            conn.attachObserver({
                id: `connection-${conn.name}`,
                obs: async (event, conn, ...args) => {
                    switch(event) {
                        case 'close':
                            onClose(conn, ...args);
                            break;
                        case 'error':
                            onError(conn, ...args);
                            break;
                        case 'info':
                            onInfo(conn, ...args);
                            break;
                        case 'datachannelclose':
                            onDataChannelClose(conn, ...args);
                            break;
                        case 'connectionfailed':
                            onConnectionFailed(conn, ...args);
                            break;
                        case 'retryconnection':
                            onRetryConnection(conn, ...args);
                            break;
                        case 'datachannelopen':
                            onDataChannelOpen(conn, ...args);
                            break;
                        case 'connectionstatechange':
                            onConnectionStateChange(conn, ...args);
                            break;
                        case 'signalingstatechange':
                            onSignalingStateChange(conn, ...args);
                            break;
                        case 'negotiation':
                            onNegotiation(conn, ...args);
                            break;
                        case 'icecandidate':
                            onIceCandidate(conn, ...args);
                            break;
                        default:
                            console.warn('evento nao mapeado', event);
                    }
                }
            });
            await connect({conn: conn});
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

        function findConnection(name) {
            const target = connections.find(target => target.name == name);
            if(target) {
                return target;
            }
            return null;
        }

        const createConn = async (opts) => {
            const prevConn = findConnection(opts.targetName);
            if(prevConn) {
                toast.warning(`conexao para user ${opts.targetName} ja existe. tentando reaproveitar conexao`);
                prevConn.retryConnect();
                return;
            }
            
            const conn = new Connection(opts.targetName);
            conn.polite = opts.polite;
            conn.socket = socket;
           
            setCurrConnection(conn);
            setConnections([...connections, conn]);
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
            // target.polite = content.polite;
            console.log(`processando negociação de: ${content.name}`);
            target.peer.treatNegotiation(content);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('negotiation', onNegotiation);
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
            socket.off('ice-candidate', onIceCandidate);
            socket.off('subscribed', onSubscribed);
            socket.off('hangup', onHangup);
            socket.off('polite', onPolite);
        };
    }, [socket, user, connections]);

    function createConnection(opts) {
        console.log('polite', opts);
        socket.emit('polite', {name: user.name, target: opts.targetName});
    }
    
    const connectSocket = async () => {
        setSocket(io('http://webrtc-signaling-server.glitch.me/'));
        /**
         * como escolhi usar o ser do next js tive q fazer isso: https://codedamn.com/news/nextjs/how-to-use-socket-io
         */
        /**
         * socket io ta quebrado na versao atual do nextjs.
         * Caso volte a funcionar tem um exemplo de como obter o socket no hook useSocket um exemplo comentado mais acima nesse mesmo arquivo
         * mais um exemplo aqui: https://www.stackfive.io/work/webrtc/peer-to-peer-video-call-with-next-js-socket-io-and-native-webrtc-apis
         * detalhes sobre o problema aqui: https://github.com/vercel/next.js/discussions/48422
         * https://github.com/vercel/next.js/discussions/48510
         * https://github.com/vercel/next.js/issues?q=is%3Aissue+is%3Aopen+socket+io
         */
        // setSocket(io('http://localhost:3000/signalingServer'));
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
        await currConnection.toogleAudio(opts);
    }

    const toogleCamera = async (opts) => {
        if(!currConnection) {
            console.log('atuamente sem conexao');
            return;
        }
        await currConnection.toogleCamera(opts);
    }

    const toogleDisplay = async (opts) => {
        if(!currConnection) {
            console.log('atuamente sem conexao');
            return;
        }
        await currConnection.toogleDisplay(opts);
    }

    const hangUp = (opts) => {
        const { target } = opts;
        const conn = connections.find(conn=>conn.name === target);
        if(!conn) {
            console.log(`conexão com o user "${target}" não encontrado`);
            return;
        }
        const incomingCall = call.incomingCalls.find(call => call.target === target);
        const sentCall = call.sentCalls.find(call => call.target === target);
        if(incomingCall) {
            incomingCall.cancel();
            socket.emit('callcanceled', {
                name: user.name,
                target: incomingCall.target
            });
        }
        if(sentCall) {
            sentCall.cancel();
            socket.emit('callcanceled', {
                name: user.name,
                target: sentCall.target
            });
        }
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
            call,
            connectSocket,
            createConnection,
            removeConnection,
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