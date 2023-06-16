import { useEffect, useState } from "react";
import useAuth from "./useAuth";
import useConnection from "./useConnection";
import { toast } from "react-toastify";
import Call from "@/models/call";

//TODO existe a possibilidade de uma chamada ser feita ao mesmo tempo e ficar preso de algum modo.
//testar e corrigir isso

const CallToast = ({ index, callerName, acceptCall, refuseCall, closeToast }) =>  {
  
    const handleAccept = () => {
      acceptCall(index);
      closeToast();
    }
    const handleRefuse = () => {
      refuseCall(index);
      closeToast();
    }
  
    return <div className='flex flex-col items-center space-y-2'>
      <span>recebendo chamada: {callerName}</span>
      <div className='flex flex-row items-center space-x-2'>
        <button
          className="rounded-md py-2 px-4 bg-blue-500 text-white font-medium focus:outline-none hover:bg-blue-600"
          onClick={handleAccept}
        >
          aceitar
        </button>
        <button
          className="rounded-md py-2 px-4 bg-blue-500 text-white font-medium focus:outline-none hover:bg-blue-600"
          onClick={handleRefuse}
        >
          recusar
        </button>
      </div>
    </div>
}

const CallerToast = ({ index, callName, attempt, closeToast }) =>  {
    return <div className='flex flex-col items-center space-y-2'>
        <span>Chamando: {callName}</span>
        <span>tentativa: {attempt}</span>
    </div>
}
  

function useCall({socket, connections, createConnection}) {
    const { user } = useAuth();
    
    const [calls, setCalls] = useState([]);

    useEffect(() => {
        calls.forEach((call, i) => {
            toastCall(call, i);
        });
    }, [calls]);

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
            toast.dismiss(`${content.name}-toast`);
            toast.info('chamada aceita');
            const call = completeCall(false, content);
            createConnection({targetName: call.target});
        }

        function onCallRefused(content) {
            toast.dismiss(`${content.name}-toast`);
            completeCall(false, content);
            toast.info('chamada recusada');
        }

        function onCallCanceled(content) {
            toast.dismiss(`${content.name}-toast`);
            toast.info('recebendo cancelamento. user:'+content.name);
            cancelCall(content);
        }
        
        function onCallError(content) {
            // ate o momento o erro so é disparado quando uma chamada nao é concluida
            // entao o content é o mesmo q foi enviado na chamada, entao o target é o q foi enviado,ou seja, é o "content.target"
            toast.dismiss(`${content.target}-toast`);
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

    function toastCall(call, index) {
        const id = `${call.target}-toast`;
        toast.dismiss(id);
        if(!call.isIncoming) {
            toast(
                <CallerToast 
                    index={index} 
                    callName={call.target} 
                    attempt={call.currentCallAttempt}
                />,
                {
                    toastId: id,
                    autoClose: false
                }
            )
            call.detachObserver(id);
            call.attachObserver({
                id: id,
                obs: async (event, ...args) => {
                    const actions = {
                        calling: (call) => {
                            toast.update(
                                id,
                                {
                                    render: <CallerToast 
                                        index={index} 
                                        callName={call.target} 
                                        attempt={call.currentCallAttempt}
                                    />,
                                    autoClose: false
                                }
                            );
                        },
                    };
                    call.executeActionStrategy(actions, event, ...args);
                }
            });
            return;
        }
        toast(
            <CallToast 
                index={index} 
                callerName={call.target} 
                acceptCall={acceptCall} 
                refuseCall={refuseCall} 
            />,
            {
                toastId: id,
                autoClose: false,
                closeOnClick: false
            }
        );
    }
   
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