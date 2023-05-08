import { useEffect, useRef, useState } from "react";
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import Message from "./message";
import { DISPLAY_TYPES } from "@/models/peer";
import { TYPES as MESSAGE_TYPES } from "@/models/message";
import { toast } from "react-toastify";
import FileUpload from "@/utils/fileUpload";

function Chat() {
    const textInput = useRef(null);
    const [messages, setMessages] = useState([]);
    const receiveFiles = useRef([]);
    const sendFiles = useRef([]);
    
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
    const { currConnection: conn, connections } = useConnection();

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
                [MESSAGE_TYPES.FILE_META]: (msg) => {
                    const { message } = msg;
                    console.log('file meta', message);
                    const receiveFile = new FileUpload(message);
                    receiveFile.attachObserver({ 
                        obs: async (event, ...args) => {
                            const actions = {
                                progress: progress => console.log(`progresso: ${progress}`),
                                // received: (id, metadata, file) => {
                                //     toast.warn(`recebido`);
                                //     toast.warn(`download-${id}`);
                                //     console.log('id', `download-${id}`);
                                //     const downloadAnchor = document.querySelector(`#download-${id}`);
                                //     downloadAnchor.href = URL.createObjectURL(file);
                                //     downloadAnchor.download = metadata.name;
                                //     downloadAnchor.textContent = `Click to download '${metadata.name}' (${metadata.size} bytes)`;
                                //     downloadAnchor.style.display = 'block';
                                // },
                                end: id => {
                                    receiveFiles.current = receiveFiles.current.filter(fileUpload => fileUpload.id !== id);
                                }
                            };
                            receiveFile.executeActionStrategy(actions, event, ...args);
                        }
                    });
                    console.log('receiveFile', receiveFile);
                    receiveFiles.current = [...receiveFiles.current, receiveFile];
                },
                [MESSAGE_TYPES.CHUNK]: (msg) => {
                    const { message } = msg;
                    console.log('message', message);
                    console.log('message chuck', message.chunk);
                    console.log('message', receiveFiles);
                    const receiveFile = receiveFiles.current.find(fileUpload => fileUpload.id === message.id);
                    if(receiveFile) {
                        receiveFile.receive(message.chunk);
                    }
                },
            }
            try {
                console.log('messag', content);
                const message = JSON.parse(content.data);
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
            sendFiles.current.forEach(file => file.cancel());
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
    }, [connections]);

    const sendMessage = () => {
        conn.send({message: textInput.current.value});
        textInput.current.value = '';
        setMessages([...conn.getMessages()]);
    }

    const handleFile = (event) => {
        const files = event.target.files;
        if(!files) {
            console.log('nada escolhido');
            return;
        }
        if(files.length > 1) {
            alert('atuamente apenas um arquivo por vez');
            event.target.value = '';
            return;
        }
        
        const sendFile = new FileUpload({ file: files[0], connection: conn });
        event.target.value = '';
        sendFile.attachObserver({
            obs: async (event, ...args) => {
                const actions = {
                    // progress: progress => console.log(`progresso: ${progress}`),
                    error: error => toast(error),
                    abort: _ => toast('Envio do arquivo foi cancelado'),
                    end: id => {
                        console.log(id);
                        toast.warn('finalizou');
                        sendFiles.current = sendFiles.current.filter(fileUpload => fileUpload.id !== id);
                    },
                    cleanqueue: _ => {
                        // Limpando a fila de envio com uma mensagem vazia
                        console.log('linpando fila');
                        conn.peer.cleanChannelqueue();
                    },
                    info: data => console.log(data),
                    metadata: data => {
                        conn.send({
                            type: MESSAGE_TYPES.FILE_META,
                            message: data
                        });
                    },
                    chunk: data => {
                        //é feito isso para conseguir serializar
                        conn.send({
                            type: MESSAGE_TYPES.CHUNK,
                            message: data
                        });
                    },
                    // received: (id, metadata, file) => {
                    //     toast.warn(`arquivo enviado`);
                    //     toast.warn(`download-${id}`);
                    //     console.log('id', `download-${id}`);
                    //     const downloadAnchor = document.querySelector(`#download-${id}`);
                    //     downloadAnchor.href = URL.createObjectURL(file);
                    //     downloadAnchor.download = metadata.name;
                    //     downloadAnchor.textContent = `Click to download '${metadata.name}' (${metadata.size} bytes)`;
                    //     downloadAnchor.style.display = 'block';
                    // },
                };
                sendFile.executeActionStrategy(actions, event, ...args);
            }
        });
        sendFile.send();
        sendFiles.current = [...sendFiles.current, sendFile];
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
                        id = chatMsg.message.id;
                        message = chatMsg.message.file.name;
                        fileUpload = sendFiles.current.find(file=>file.id === id);
                        if(!fileUpload) {
                            fileUpload = receiveFiles.current.find(file=>file.id === id);
                        }
                    }
                    return <Message key={i} props={{id, fileUpload, message, sender:chatMsg.senderId===user.id}} />;
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