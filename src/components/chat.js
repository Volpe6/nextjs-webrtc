import { useEffect, useRef, useState } from "react";
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import Message from "./message";
import { DISPLAY_TYPES } from "@/models/peer";
import { TYPES as MESSAGE_TYPES } from "@/models/message";
import { toast } from "react-toastify";
import useMedia from "@/hook/useMedia";
import MediaControls from "./mediaControls";
import Video from "./video";
import Drag from "./drag";
import MessageArea from "./messageArea";
import Row from "./row";
import AudioSpectrum from "./audioSpectrum";

function Chat() {
    const textInput = useRef(null);
    const [messages, setMessages] = useState([]);
    
    /**
     * Uma gambiarra pra ter acesso aos streams anteriores. Fiz desse modo quando o evento de track era disparado e o setUserMedias chamado, 
     * o codigo parava de ouvir eventos de track, nao entendi muito bem o pq(tinha tentado por o userMedias no array de dependencias do useEffec, 
     * mas isso q fazia esse comportamento acontecer). Acho q por disparar o setUserMedias o listener atual era perdido e um novo criado logo em seguida,
     * mas isso fazia com q o evento de track nao finalizasse corretamnte. Ainda disparo setUserMedias pq quero q o componente seja remontado
     */
    const prevUserMedias = useRef({});
    const [userMedias, setUserMedias] = useState({});
    const [showChatArea, setShowChatArea] = useState(true);
    
    const [audioStream, setAudioStream] = useState(null);
    const [camStream, setCamStream] = useState(null);
    const [displayStream, setDisplayStream] = useState(null);

    const { user } = useAuth();
    const { currConnection: conn, connections, fileManager, toogleDisplay, toogleCamera, toogleAudio } = useConnection();

    useEffect(() => {
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
    
            const id = `${conn.user.name}-media`;
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
                update(id, displayType, null);
            };
    
            update(id, displayType, {
                type: displayType,
                isFullScreen: false,
                stream: finalStream
            });
        }
        
        const id = `connection-chat-remote-streams-${conn.name}`;
        conn.attachObserver({
            id: id,
            obs: async (event, ...args) => {
                const actions = {
                    track: onTrack,
                };
                conn.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            conn.detachObserver(id);
        }
    }, []);

    useEffect(() => {
        function onClose(conn, _) {
            // audioRef.current.srcObject = null;
            // videoRef.current.srcObject = null;
            // displayRef.current.srcObject = null;
        }
        function onDataChannelError(conn, _) {
            fileManager.cancelFilesFromConnection(conn);
        }
        
        const id = `connection-chat-local-streams-${conn.name}`;
        conn.attachObserver({
            id: id,
            obs: async (event, ...args) => {
                const actions = {
                    // changeuserstream: onChangeUserStream,
                    // changedisplaystream: onChangeDisplayStream,
                    datachannelerror: onDataChannelError,
                    close: onClose
                };
                conn.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            conn.detachObserver(id);
        }
    }, []);

    const update = (id, type, media) => {
        let crrUserMedia = prevUserMedias.current[id];
        if(!crrUserMedia) {
            crrUserMedia = {
                id: id,
                isRoot: false,
                medias: {}
            };
        }
        crrUserMedia.medias[type] = media;
        const newMedias = {
            ...prevUserMedias.current,
            [id]: crrUserMedia
        }
        prevUserMedias.current = newMedias;
        console.log('new Medias', newMedias)
        setUserMedias(prevUserMedias.current);
    }

    const getMedias = () => {
        let medias = Object.values(userMedias).filter(userMedia=>userMedia.id!==`${user.name}-media`);
        let root = userMedias[`${user.name}-media`];
        if(root) {
            root.isRoot = true;
            medias.unshift(root);
        }
        return medias;
    };

    const toogleFullScreen = (id, type) => {
        const newUserMedias = {...prevUserMedias.current};
        const crrUserMedia = newUserMedias[id];
        if(crrUserMedia&&crrUserMedia.medias[type]) {
            const media = crrUserMedia.medias[type];
            media.isFullScreen = !media.isFullScreen;
            newUserMedias[id] = crrUserMedia;
        }
        if(!hasFullScreen()) {
            setShowChatArea(true);
        } else {
            setShowChatArea(false);
        }
        setUserMedias(newUserMedias);
    }

    const hasFullScreen = () => getMedias().find(userMedia=> Object.values(userMedia.medias).find(media=>media&&media.isFullScreen));

    const handleChat = () => {
        if(!hasFullScreen()) {
            setShowChatArea(true);
            return;
        }
        setShowChatArea(prev => !prev);
    }

    const handleAudio = async () => {
        const stream = await toogleAudio();
        update(`${user.name}-media`, DISPLAY_TYPES.USER_AUDIO, {
            type: DISPLAY_TYPES.USER_AUDIO,
            isFullScreen: false,
            stream: stream?new MediaStream([stream.getAudioTracks()[0]]):null
        });
        setAudioStream(stream);
    }

    const handleCam = async () => {
        const stream = await toogleCamera();
        update(`${user.name}-media`, DISPLAY_TYPES.USER_CAM, {
            type: DISPLAY_TYPES.USER_CAM,
            isFullScreen: false,
            stream: stream?new MediaStream([stream.getVideoTracks()[0]]):null
        });
        setCamStream(stream);
    }

    const handleDisplay = async () => {
        const stream = await toogleDisplay();
        update(`${user.name}-media`, DISPLAY_TYPES.DISPLAY, {
            type: DISPLAY_TYPES.DISPLAY,
            isFullScreen: false,
            stream: stream?new MediaStream(stream.getTracks()):null
        });
        setDisplayStream(stream);
    }

    return (<>
        <div className="relative flex items-center justify-center w-full drag-area">
            {
                hasFullScreen()&&
                <div className="flex flex-row items-center justify-center">
                    {
                        getMedias().map((userMedia) => {
                            const medias = Object.values(userMedia.medias);
                            return medias.map(media => {
                                if(!media) return;
                                if(!media.isFullScreen) return;
                                return <Video 
                                    stream={media.stream} 
                                    fullScreenFunction={() => toogleFullScreen(userMedia.id, media.type)}
                                />
                            });
                        })
                    }
                </div>
            }

            <div className={`w-full ${!showChatArea&&'hidden'}`}>
                <MessageArea connection={conn}/>
            </div>

            <MediaControls
                audioStream={audioStream}
                handleAudio={handleAudio}
                handleCam={handleCam}
                handleDisplay={handleDisplay}
                handleChat={handleChat}
            >
                <div className="relative">
                    <Row>
                        {getMedias().map((userMedia, i) => {

                            const isRoot = userMedia.isRoot;
                            const displayMedia = userMedia.medias[DISPLAY_TYPES.DISPLAY];
                            const userCamMedia = userMedia.medias[DISPLAY_TYPES.USER_CAM];
                            const userAudioMedia = userMedia.medias[DISPLAY_TYPES.USER_AUDIO];

                            // const hasDisplay = displayMedia!==null&&displayMedia.stream!==null;
                            let hasDisplay = false;
                            try {
                                hasDisplay = displayMedia!==null&&displayMedia.stream&&!displayMedia.isFullScreen;
                            } catch (error) {
                                hasDisplay = false;
                            }

                            return <div key={i} className="relative">
                                {
                                    displayMedia&&
                                    !displayMedia.isFullScreen&&
                                    displayMedia.stream&&
                                    <Video 
                                        stream={displayMedia.stream} 
                                        width={200} 
                                        fullScreenFunction={() => toogleFullScreen(userMedia.id, DISPLAY_TYPES.DISPLAY)}
                                    />
                                }
                                <div className={`${!hasDisplay&&'relative'} ${hasDisplay&&'absolute bottom-0'}`}>
                                    {
                                        userCamMedia&&
                                        !userCamMedia.isFullScreen&&
                                        userCamMedia.stream&&
                                        <Video 
                                            stream={userCamMedia.stream} 
                                            width={hasDisplay?75:200} 
                                            fullScreenFunction={() => toogleFullScreen(userMedia.id, DISPLAY_TYPES.USER_CAM)}
                                        />
                                    }
                                    {
                                        !isRoot&&
                                        userAudioMedia&&
                                        userAudioMedia.stream&&
                                        <div className="absolute top-0 left-0 pointer-events-none">
                                            <AudioSpectrum audioStream={userAudioMedia.stream} visualizer="arc" useAudioTag={true}/>
                                        </div>
                                    }
                                </div>
                            </div>
                        })}
                    </Row>
                </div>
            </MediaControls>
        </div>
    </>);
}

export default Chat;