import { useEffect, useRef, useState } from "react";
import Message from "./message";
import useConnection from "@/hook/useConnection";
import useAuth from "@/hook/useAuth";
import { TYPES as MESSAGE_TYPES } from "@/models/message";
import { DISPLAY_TYPES } from "@/models/peer";
import { toast } from "react-toastify";

function MessageArea() {

    const { currConnection: conn } = useConnection();

    const textInput = useRef(null);
    const [messages, setMessages] = useState({});

    const { user } = useAuth();
    const { fileManager } = useConnection();

    const audioRef = useRef(null);
    const videoRef = useRef(null);
    const displayRef = useRef(null);
    
    const [count, setCount] = useState(0);

    useEffect(() => {
        setMessages({...conn.getMessages()});
    }, [conn]);

    useEffect(() => {
        async function onDataChannelMessage(conn, content) {
            console.log({...conn.getMessages()});
            setMessages({...conn.getMessages()});
        }
        
        function onClose(conn, _) {
            audioRef.current.srcObject = null;
            videoRef.current.srcObject = null;
            displayRef.current.srcObject = null;
        }
        function onDataChannelError(conn, _) {
            fileManager.cancelFilesFromConnection(conn);
        }
        
        const id = `connection-message-area-${conn.name}`;
        conn.attachObserver({
            id: id,
            obs: async (event, ...args) => {
                const actions = {
                    datachannelerror: onDataChannelError,
                    datachannelmessage: onDataChannelMessage,
                };
                conn.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            conn.detachObserver(id);
        }
    }, [conn]);

    const sendMessage = () => {
        conn.send({message: textInput.current.value});
        textInput.current.value = '';
        setMessages({...conn.getMessages()});
    }

    const handleFile = (event) => {
        const files = event.target.files;
        fileManager.sendFile(conn, files);
        event.target.value = '';
        setMessages({...conn.getMessages()});
    }
    
    return (<>
     <div className="flex flex-col h-screen bg-purple-700 drag-area">
            <div className="flex justify-start items-center bg-purple-600 p-4 space-x-2">
                {/* <img src="https://i.pravatar.cc/50?img=2" alt="Avatar" class="rounded-full ml-2"/> */}
                <audio ref={audioRef} autoPlay></audio>
                <video ref={videoRef} width={100} playsInline autoPlay></video>
                <video ref={displayRef} width={100} playsInline autoPlay></video>
                <span>{conn.name}</span>
            </div>
            <div className="flex-1 overflow-y-scroll p-4 space-y-2">
                {Object.values(messages).map(chatMsg => {
                    let { id, message } = chatMsg;
                    let fileUpload;
                    let file;
                    if(chatMsg.type === MESSAGE_TYPES.FILE_META) {
                        message = chatMsg.message.file.name;
                        file = chatMsg.message.file;
                        fileUpload = fileManager.findFile(id);
                    }
                    return <Message key={id} props={{file, fileUpload, message, sender:chatMsg.senderId===user.id}} />
                })}
            </div>
            <div className="flex justify-center items-center p-4">
                <input ref={textInput} type="text" placeholder="Digite sua mensagem" className="rounded-l-full border border-gray-400 py-2 px-4 w-full focus:outline-none focus:shadow-outline" />
                <button onClick={sendMessage}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-full">
                Enviar
                </button>
                <input type="file" onChange={handleFile}/>
                {/* <audio ref={localAudioRef} autoPlay muted></audio>
                <video ref={localVideoRef} width={100} playsInline autoPlay muted></video>
                <video ref={localDisplayRef} width={100} playsInline autoPlay muted></video> */}
            </div>
        </div>
    </>);
}

export default MessageArea;