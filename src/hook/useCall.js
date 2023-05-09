import { useEffect, useState } from "react";
import useAuth from "./useAuth";
import useConnection from "./useConnection";
import { toast } from "react-toastify";
import Call from "@/models/call";

//TODO existe a possibilidade de uma chamada ser feita ao mesmo tempo e ficar preso de algum modo.
//testar e corrigir isso

function useCall({socket, connections, createConnection}) {
    const { user } = useAuth();
    
    const [calls, setCalls] = useState([]);

    useEffect(() => {
        if(!socket) {
            return;
        }

        function completeCall(isIncoming, content) {
            const call = calls.find(call => call.isIncoming===isIncoming&&call.target===content.name);
            if(call) {
                call.complete();
            }
            return call;
        }

        function cancelCall(content) {
            calls.forEach(call=> {
                if(call.isIncoming&&call.target===content.name) {
                    call.cancel();
                } else if(!call.isIncoming&&call.name===content.name) {
                    call.cancel();
                }
            });
        }
        
        function onCall(content) {
            //nesse momento a chamada é recebida entao o alvo é quem enviou, ou seja, é o "content.name"
            if(calls.find(call => call.isIncoming&&call.target===content.name)) {
                console.log(calls);
                console.log(`já exite uma chamada para ${content.name}`);
                return;
            }
            const incomingCall = new Call(user.name, content.name, true);
            incomingCall.attachObserver({
                obs: async (event, ...args) => {
                    const actions = {
                        callcomplete: (call, data) => {
                            const success = data.callSuccess? 'atendida': 'não atendida';
                            console.log(`chamada para ${call.target} concluída. Estado: ${success}`);
                            if(data.detail) {
                                console.log(`detalhe ${data.detail}`);
                            }
                        },
                        end: (call) => setCalls(calls.filter(incomingCall => incomingCall.isIncoming&&incomingCall.target!==call.target))
                    };
                    incomingCall.executeActionStrategy(actions, event, ...args);
                }
            });
            setCalls([...calls, incomingCall]);
        }

        function onCallAccepted(content) {
            toast.info('chamada aceita');
            const call = completeCall(false, content);
            createConnection({targetName: call.target});
        }

        function onCallRefused(content) {
            completeCall(false, content);
            toast.info('chamada recusada');
        }

        function onCallCanceled(content) {
            toast.info('recebendo cancelamento. user:'+content.name);
            cancelCall(content);
        }
        
        function onCallError(content) {
            // ate o momento o erro so é disparado quando uma chamada nao é concluida
            // entao o content é o mesmo q foi enviado na chamada, entao o target é o q foi enviado,ou seja, é o "content.target"
            toast.info('recebendo erro. user:' + content.target);
            const call = calls.find(call => call.target === content.target);
            if(call) {
                call.cancel({detail: content.detail});
            }
        }
        
        socket.on('call', onCall);
        socket.on('callaccepted', onCallAccepted);
        socket.on('callrefused', onCallRefused);
        socket.on('callerror', onCallError);
        socket.on('callcanceled', onCallCanceled);
        return () => {
            socket.off('call', onCall);
            socket.off('callaccepted', onCallAccepted);
            socket.off('callrefused', onCallRefused);
            socket.off('callerror', onCallError);
            socket.off('callcanceled', onCallCanceled);
        };
    }, [socket, calls]);
   
    const call = async (opts) => {
        const { targetName } = opts;
        const prevConn = connections.find(conn=> conn.name === targetName);
        if(prevConn && prevConn.peer) {
            toast.info(`ja conectado com ${targetName}`);
            return;
        }
        const prevCall = calls.find(call => call.target === targetName);
        if(prevCall) {
            toast.info(prevCall.isIncoming?`já recebendo uma chamada de ${targetName}`:`já fazendo uma ligaçao para ${targetName}`);
            return;
        }
        
        const sentCall = new Call(user.name, targetName, false);
        sentCall.attachObserver({
            obs: async (event, ...args) => {
                const actions = {
                    calling: (call) => socket.emit('call', {name: call.name, target: call.target}),
                    callcomplete: (call, data) => {
                        const success = data.callSuccess? 'atendida': 'não atendida';
                        console.log(`chamada para ${call.target} concluída. Estado: ${success}`);
                        if(data.detail) {
                            console.log(`detalhe ${data.detail}`);
                        }
                    },
                    end: (call) => setCalls(calls.filter(sentCall => !sentCall.isIncoming&&sentCall.target!==call.target)),
                };
                sentCall.executeActionStrategy(actions, event, ...args);
            }
        });
        setCalls([...calls, sentCall]);
        await sentCall.call();
    }

    const cancel = (index) => {
        const sentCall = calls[index];
        sentCall.cancel();
        socket.emit('callcanceled', {
            name: user.name,
            target: sentCall.target
        });
    }

    const acceptCall = (index) => {
        const incomingCall = calls[index];
        incomingCall.complete();
        socket.emit('callaccepted', {
            name: user.name,
            target: incomingCall.target
        });
        createConnection({targetName: incomingCall.target});
    }

    const refuseCall = (index) => {
        const incomingCall = calls[index];
        incomingCall.complete();
        socket.emit('callrefused', {
            name: user.name,
            target: incomingCall.target
        });
    }

    return {
        calls,
        call,
        acceptCall,
        refuseCall,
        cancel
    };
}

export default useCall;