import { useEffect, useState } from "react";
import useConnection from "@/hook/useConnection";
import { FiPhoneCall, FiPhoneOff } from "react-icons/fi";

function Contact({connection}) {
    const { callManager, connections, hangUp } = useConnection();

    const [connectionState, setConnectionState] = useState('desconectado');
    
    useEffect(() => {
        function onClose(conn, _) {setConnectionState('desconectado');}
        function onConnectionStateChange(conn, state) {setConnectionState(state);}
        const id = `connection-contact-${connection.name}`;
        connection.attachObserver({
            id: id,
            obs: async (event, ...args) => {
                const actions = {
                    close: onClose,
                    connectionstatechange: onConnectionStateChange
                };
                connection.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            connection.detachObserver(id);
        }
    }, [connections]);

    const handleCall = async () => {
        callManager.call({targetName: connection.name});
    }

    const handleHangUp = () => {
        hangUp({target: connection.name})
    }

    return (
        <div className="flex items-start">
            <div className="flex flex-col items-center">
                <img className="w-10 h-10 rounded-full mr-4" src="https://via.placeholder.com/150" alt="Avatar"/>
                <div className="text-gray-500 text-xs">status: {connectionState}</div>
            </div>
            <div className="flex-1">
                <div className="font-bold">{connection.user.name}</div>
            </div>
            <div className="flex space-x-2 items-center justify-center">
                <button 
                    className="bg-green-500 text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    onClick={handleCall} 
                >
                    <FiPhoneCall/>
                </button>
                <button 
                    className="bg-red-500 text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={handleHangUp} 
                >
                    <FiPhoneOff/>
                </button>
            </div>
        </div>
    );
}

export default Contact;