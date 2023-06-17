import { useEffect, useState } from "react";
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import { DISPLAY_TYPES } from "@/models/peer";
import MediaControls from "./mediaControls";
import Video from "./video";
import MessageArea from "./messageArea";
import Row from "./row";
import AudioSpectrum from "./audioSpectrum";

function Chat() {
    const [showChatArea, setShowChatArea] = useState(true);
    const [audioStream, setAudioStream] = useState(null);

    const { user } = useAuth();
    const { currConnection: conn, mediaManager, fileManager, toogleDisplay, toogleCamera, toogleAudio, toogleCameraMode } = useConnection();

    useEffect(() => {
        mediaManager.resetMedias();
        Object.values(conn.remoteStreams).forEach(media => {
            //nessa parte eu limpo todas as midias locais
            mediaManager.update(`${user.name}-media`, media.type, {
                type: media.type,
                isFullScreen: false,
                stream: null
            });
            //aqui atuliza as midias do remoto caso tenha alguma
            mediaManager.update(media.id, media.type, {
                type: media.type,
                isFullScreen: false,
                stream: media.stream
            });
        });
        //nessa parte atualiza as midias locais
        if(conn.userStream && conn.userStream.getAudioTracks().length > 0) {
            handleAudio(null, conn.userStream);
        }
        if(conn.userStream && conn.userStream.getVideoTracks().length > 0) {
            handleCam(null, conn.userStream);
        }
        if(conn.displayStream) {
            handleDisplay(null, conn.displayStream);
        }
    }, [conn]);

    useEffect(() => {
        function onChangeTrack(conn, event) {
            Object.values(conn.remoteStreams).forEach(media => {
                mediaManager.update(media.id, media.type, {
                    type: media.type,
                    isFullScreen: false,
                    stream: media.stream
                });
            });
        }
        
        const id = `connection-chat-remote-streams-${conn.name}`;
        conn.attachObserver({
            id: id,
            obs: async (event, ...args) => {
                const actions = {
                    changetrack: onChangeTrack,
                };
                conn.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            conn.detachObserver(id);
        }
    }, [conn]);

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

    const handleChat = () => {
        if(!mediaManager.hasFullScreen()) {
            setShowChatArea(true);
            return;
        }
        setShowChatArea(prev => !prev);
    }

    const handleAudio = async (event, streams=null) => {
        let stream = streams;
        if(!stream) {
            stream = await toogleAudio();
        }
        try {
            stream = stream?new MediaStream([stream.getAudioTracks()[0]]):null;
        } catch (error) {
            stream = null;
        }
        mediaManager.update(`${user.name}-media`, DISPLAY_TYPES.USER_AUDIO, {
            type: DISPLAY_TYPES.USER_AUDIO,
            isFullScreen: false,
            stream: stream
        });
        setAudioStream(stream);
    }

    const handleCam = async (event, streams=null) => {
        let stream = streams;
        if(!stream) {
            stream = await toogleCamera();
        }
        try {
            stream = stream?new MediaStream([stream.getVideoTracks()[0]]):null 
        } catch (error) {
            stream = null;
        }
        mediaManager.update(`${user.name}-media`, DISPLAY_TYPES.USER_CAM, {
            type: DISPLAY_TYPES.USER_CAM,
            isFullScreen: false,
            stream: stream
        });
    }
    
    const handleCamMode = async (event, streams=null) => {
        let stream = streams;
        if(!stream) {
            stream = await toogleCameraMode();
        }
        try {
            stream = stream?new MediaStream([stream.getVideoTracks()[0]]):null; 
        } catch (error) {
            stream = null;
        }
        mediaManager.update(`${user.name}-media`, DISPLAY_TYPES.USER_CAM, {
            type: DISPLAY_TYPES.USER_CAM,
            isFullScreen: false,
            stream: stream
        });
    }

    const handleDisplay = async (event, streams=null) => {
        let stream = streams;
        if(!stream) {
            stream = await toogleDisplay();
        }
        try {
            stream = stream?new MediaStream(stream.getTracks()):null; 
        } catch (error) {
            stream = null;
        }
        mediaManager.update(`${user.name}-media`, DISPLAY_TYPES.DISPLAY, {
            type: DISPLAY_TYPES.DISPLAY,
            isFullScreen: false,
            stream: stream
        });
    }

    function handleFullScreen(id, type) {
        mediaManager.toogleFullScreen(id, type);
        if(!mediaManager.hasFullScreen()) {
            setShowChatArea(true);
        } else {
            setShowChatArea(false);
        }
    }

    return (<>
        <div className="relative flex flex-col md:flex-row items-center justify-center w-full drag-area">
            {
                mediaManager.hasFullScreen()&&
                <div className="flex flex-row h-[50svh] md:h-[100svh] items-center justify-center">
                    {
                        mediaManager.getMedias().map((userMedia) => {
                            const medias = Object.values(userMedia.medias);
                            return medias.map(media => {
                                if(!media) return;
                                if(!media.isFullScreen) return;
                                return <Video 
                                    stream={media.stream} 
                                    fullScreenFunction={() => handleFullScreen(userMedia.id, media.type)}
                                />
                            });
                        })
                    }
                </div>
            }

            <div className={`w-full ${!showChatArea&&'hidden'}`}>
                <MessageArea/>
            </div>

            <MediaControls
                connection={conn}
                audioStream={audioStream}
                handleAudio={handleAudio}
                handleCam={handleCam}
                handleDisplay={handleDisplay}
                handleChat={handleChat}
                handleCamMode={handleCamMode}
            >
                <div className="relative">
                    <Row>
                        {mediaManager.getMedias().map((userMedia, i) => {

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
                                        fullScreenFunction={() => handleFullScreen(userMedia.id, DISPLAY_TYPES.DISPLAY)}
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
                                            fullScreenFunction={() => handleFullScreen(userMedia.id, DISPLAY_TYPES.USER_CAM)}
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