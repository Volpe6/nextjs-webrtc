import { useEffect, useRef, useState } from "react";
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import Message from "./message";
import { DISPLAY_TYPES } from "@/models/peer";
import { TYPES as MESSAGE_TYPES } from "@/models/message";
import { toast } from "react-toastify";

function Chat() {
    const textInput = useRef(null);
    const [messages, setMessages] = useState([]);
    
    const [localAudioStream, setLocalAudioStream] = useState(null);
    const [localVideoStream, setLocalVideoStream] = useState(null);
    const [localDisplayStream, setLocalDisplayStream] = useState(null);

    const audioRef = useRef(null);
    const videoRef = useRef(null);
    const displayRef = useRef(null);
    const localAudioRef = useRef(null);
    const localVideoRef = useRef(null);
    const localDisplayRef = useRef(null);

    const { user } = useAuth();
    const { currConnection: conn, connections, fileManager } = useConnection();

    useEffect(() => {
        if(localAudioStream && localAudioRef.current) {
            localAudioRef.current.srcObject = localAudioStream;
        }
    }, [localAudioStream]);
    
    useEffect(() => {
        if(localVideoStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localVideoStream;
        }
    }, [localVideoStream]);
    
    useEffect(() => {
        if(localDisplayStream && localDisplayRef.current) {
            localDisplayRef.current.srcObject = localDisplayStream;
        }
    }, [localDisplayStream]);

    useEffect(() => {
        async function onDataChannelMessage(conn, content) {
            const msgStrategy = {
                [MESSAGE_TYPES.TEXT]: (msg) => {},
                [MESSAGE_TYPES.FILE_ABORT]: (msg) => {
                    const { message } = msg;
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
                    setMessages([...conn.getMessages()]);
                }
            } catch (error) {
                console.log('nao foi possivel dar parse na mensagem');
            }
        }
        function onChangeUserStream(conn, data) {
            const { stream, mediaType } = data;
            if(stream) {
                if(mediaType === 'video') {
                    setLocalVideoStream(new MediaStream([stream.getVideoTracks()[0]]));
                }
                if(mediaType === 'audio') {
                    setLocalAudioStream(new MediaStream([stream.getAudioTracks()[0]]));
                }
            }
        }
        function onChangeDisplayStream(conn, data) {
            const { stream } = data;
            if(stream) {
                setLocalDisplayStream(new MediaStream(stream.getTracks()));
            }
        }
        function onTrack(conn, event) {
            console.log('lidando com track')
            console.log(`track`, event);
            const { transceiver, track, streams } = event;
            const trv = conn.peer.retriveTransceiver({displayType: DISPLAY_TYPES.DISPLAY});
            let mediaRef = transceiver.mid == trv.mid? displayRef.current: videoRef.current;
            if(track.kind === 'audio') {
                mediaRef = audioRef.current;
            }
            track.onmute = () => {
                mediaRef.srcObject = null;
            };
            track.onunmute = () => {
                if (mediaRef.srcObject || streams.length == 0) {
                    return;
                }
                if(track.kind === 'audio') {
                    mediaRef.srcObject = new MediaStream([streams[0].getAudioTracks()[0]]);
                    return;
                }
                mediaRef.srcObject = new MediaStream([streams[0].getVideoTracks()[0]]);
            };
        }
        function onClose(conn, _) {
            audioRef.current.srcObject = null;
            videoRef.current.srcObject = null;
            displayRef.current.srcObject = null;
        }
        function onDataChannelError(conn, _) {
            fileManager.cancelFilesFromConnection(conn);
        }
        
        const id = `connection-chat-${conn.name}`;
        conn.attachObserver({
            id: id,
            obs: async (event, ...args) => {
                const actions = {
                    datachannelerror: onDataChannelError,
                    datachannelmessage: onDataChannelMessage,
                    changeuserstream: onChangeUserStream,
                    changedisplaystream: onChangeDisplayStream,
                    track: onTrack,
                    close: onClose
                };
                conn.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            conn.detachObserver(id);
        }
    }, [connections, fileManager]);

    const sendMessage = () => {
        conn.send({message: textInput.current.value});
        textInput.current.value = '';
        setMessages([...conn.getMessages()]);
    }

    const handleFile = (event) => {
        const files = event.target.files;
        fileManager.sendFile(conn, files);
        event.target.value = '';
        setMessages([...conn.getMessages()]);
    }

    return (<>
        <div className="flex flex-col h-screen bg-purple-700 w-full">
            <div className="flex justify-start items-center bg-purple-600 p-4 space-x-2">
                {/* <img src="https://i.pravatar.cc/50?img=2" alt="Avatar" class="rounded-full ml-2"/> */}
                <audio ref={audioRef} autoPlay></audio>
                <video ref={videoRef} width={100} playsInline autoPlay></video>
                <video ref={displayRef} width={100} playsInline autoPlay></video>
                <span>{conn.name}</span>
            </div>
            <div className="flex-1 overflow-y-scroll p-4 space-y-2">
                {messages.map((chatMsg, i) => {
                    let { id, message } = chatMsg;
                    let fileUpload;
                    if(chatMsg.type === MESSAGE_TYPES.FILE_META) {
                        message = chatMsg.message.file.name;
                        fileUpload = fileManager.findFile(id);
                    }
                    return <Message key={id} props={{fileUpload, message, sender:chatMsg.senderId===user.id}} />;
                }
                )}
            </div>
            <div className="flex justify-center items-center p-4">
                <input ref={textInput} type="text" placeholder="Digite sua mensagem" className="rounded-l-full border border-gray-400 py-2 px-4 w-full focus:outline-none focus:shadow-outline" />
                <button onClick={sendMessage}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-full">
                Enviar
                </button>
                <input type="file" onChange={handleFile}/>
                <audio ref={localAudioRef} autoPlay muted></audio>
                <video ref={localVideoRef} width={100} playsInline autoPlay muted></video>
                <video ref={localDisplayRef} width={100} playsInline autoPlay muted></video>
            </div>
        </div>
    </>);
}

export default Chat;