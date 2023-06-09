import { useEffect, useRef, useState } from "react";
import Message from "./message";
import useConnection from "@/hook/useConnection";
import useAuth from "@/hook/useAuth";
import { TYPES as MESSAGE_TYPES } from "@/models/message";
import { BsPaperclip } from "react-icons/bs";
import { FiSend } from "react-icons/fi";
import { AiOutlineArrowLeft } from "react-icons/ai";

function MessageArea() {

    const { currConnection: conn, handleCurrentConnection, mediaManager } = useConnection();

    const textInput = useRef(null);
    const messagesRef = useRef(null);
    const [messages, setMessages] = useState({});

    const { user } = useAuth();
    const { fileManager } = useConnection();

    useEffect(() => {
        setMessages({...conn.getMessages()});
    }, [conn]);

    useEffect(() => {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        async function onMessage(conn, content) {
            setMessages({...conn.getMessages()});
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
                    message: onMessage,
                };
                conn.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            conn.detachObserver(id);
        }
    }, [conn]);

    const sendMessage = () => {
        if(textInput.current.value === "") {
            return;
        }
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

    const handleKeyPress = (event) => {
        if (event.keyCode === 13) {
            sendMessage();
        }
    }

    return (<>
     <div className={`flex flex-col ${mediaManager.hasFullScreen()!=null?'h-[50svh] md:h-[100svh]':'h-[100svh]'} bg-purple-700 drag-area`}>
            <div className="flex w-full justify-start items-center bg-purple-600 text-white p-4 space-x-2">
                <div className='flex md:hidden items-center' onClick={() => handleCurrentConnection(null)}>
                    <span>
                        <AiOutlineArrowLeft/>
                    </span>
                    <span>
                        Voltar
                    </span>
                </div>
                <div className="flex items-center">
                    {/* <img src="https://i.pravatar.cc/50?img=2" alt="Avatar" class="rounded-full ml-2"/> */}
                    <span>{conn.name}</span>
                </div>
            </div>
            <div ref={messagesRef} className="flex-1 overflow-y-scroll p-4 space-y-2">
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
            <div className="flex justify-center items-center p-4 bg-gradient-to-r from-pink-400 to-purple-500">
                <div>
                    <label htmlFor="file-input" className="text-2xl"><BsPaperclip/></label>
                    <input id="file-input" className="hidden" type="file" onChange={handleFile}/>
                </div>
                <input ref={textInput} onKeyDown={handleKeyPress} type="text" placeholder="Digite sua mensagem" className="rounded-l-full border border-gray-400 py-2 px-4 w-full focus:outline-none focus:shadow-outline" />
                <button onClick={sendMessage}
                className="bg-blue-500 hover:bg-blue-700 text-white p-2 pr-4 rounded-r-full text-2xl">
                    <FiSend/>
                </button>
            </div>
        </div>
    </>);
}

export default MessageArea;