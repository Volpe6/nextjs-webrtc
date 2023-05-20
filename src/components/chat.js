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
    const mediaManager = useMedia();

    useEffect(() => {
        function onChangeUserStream(conn, data) {
            const { stream, mediaType } = data;
            if(stream) {
                if(mediaType === 'video') {
                    mediaManager.update(`${user.name}-media`, {
                        type: DISPLAY_TYPES.USER_CAM,
                        isFullScreen: false,
                        stream: new MediaStream([stream.getVideoTracks()[0]])
                    });
                }
                if(mediaType === 'audio') {
                    mediaManager.update(`${user.name}-media`, {
                        type: DISPLAY_TYPES.USER_AUDIO,
                        isFullScreen: false,
                        stream: new MediaStream([stream.getAudioTracks()[0]])
                    });
                }
            }
        }
        function onChangeDisplayStream(conn, data) {
            const { stream } = data;
            if(stream) {
                mediaManager.update(`${user.name}-media`, {
                    type: DISPLAY_TYPES.DISPLAY,
                    isFullScreen: false,
                    stream: new MediaStream(stream.getTracks())
                });
            }
        }
        function onTrack(conn, event) {
            // console.log('lidando com track')
            // console.log(`track`, event);
            // const { transceiver, track, streams } = event;
            // const trv = conn.peer.retriveTransceiver({displayType: DISPLAY_TYPES.DISPLAY});
            // let mediaRef = transceiver.mid == trv.mid? displayRef.current: videoRef.current;
            // if(track.kind === 'audio') {
            //     mediaRef = audioRef.current;
            // }
            // track.onmute = () => {
            //     mediaRef.srcObject = null;
            // };
            // track.onunmute = () => {
            //     if (mediaRef.srcObject || streams.length == 0) {
            //         return;
            //     }
            //     if(track.kind === 'audio') {
            //         mediaRef.srcObject = new MediaStream([streams[0].getAudioTracks()[0]]);
            //         return;
            //     }
            //     mediaRef.srcObject = new MediaStream([streams[0].getVideoTracks()[0]]);
            // };
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
    }, [fileManager]);

    return (<>
        <div className="relative flex items-center justify-center w-full drag-area">
            {
                mediaManager.hasFullScreen()&&
                <div className="flex flex-row items-center justify-center">
                    {
                        mediaManager.getMedias().map((userMedia) => {
                            const medias = Object.values(userMedia.medias);
                            return medias.map(media => {
                                if(media.type!==DISPLAY_TYPES.DISPLAY || !media.isFullScreen) return;
                                return <Video 
                                    stream={media.stream} 
                                    fullScreenFunction={() => mediaManager.toogleFullScreen(userMedia.id, media.type)}
                                />
                            });
                        })
                    }
                </div>
            }

            <div className={`w-full ${mediaManager.hasFullScreen()&&'hidden'}`}>
                <MessageArea connection={conn}/>
            </div>

            <MediaControls className="absolute">
                <div className="relative">
                    <Row>
                        {mediaManager.getMedias().map((userMedia) => {
                            const displayMedia = userMedia.medias[DISPLAY_TYPES.DISPLAY];
                            return <div className="relative">
                                {
                                    displayMedia&&
                                    !displayMedia.isFullScreen&&
                                    <Video 
                                        stream={displayMedia.stream} 
                                        width={200} 
                                        fullScreenFunction={() => mediaManager.toogleFullScreen(userMedia.id, displayMedia.type)}
                                    />
                                }
                            </div>
                        })}
                    </Row>
                    <div className="absolute bottom-0">asdsdsddsasad</div>
                </div>
            </MediaControls>
        </div>
    </>);
}

export default Chat;