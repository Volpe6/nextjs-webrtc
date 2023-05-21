import { MdDragIndicator, MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import { BsCameraVideo, BsCameraVideoOff } from "react-icons/bs";
import { BiMicrophone, BiMicrophoneOff } from "react-icons/bi";
import Drag from "./drag";
import Video from "./video";
import useConnection from "@/hook/useConnection";
import { useEffect } from "react";
import AudioSpectrum from "./audioSpectrum";

function MediaControls({connection, userAudioStream, children}) {
    
    // const { displayStream } = useConnection();

    // useEffect(()=> {
    //     alert('udo')
    // }, [displayStream]);
    // const displayRef = useRef(null);

    // useEffect(() => {
    //     if(displayStream && displayRef.current) {
    //         displayStream.current.srcObject = displayStream;
    //     }
    // }, [displayStream]);


    return (
        <Drag render={props=>(
            <div 
                className="absolute flex flex-col space-y-1"
                style={{
                    left: props.position.x,
                    top: props.position.y
                }}
            >
                <div className="relative flex space-x-1">
                    <div 
                        onMouseDown={props.handleMouseDown} 
                        onMouseMove={props.handleMouseMove}
                        className="bg-red-500 text-[2.5em] flex justify-center w-[50px]"
                    >
                        <MdDragIndicator/>
                    </div>
                    <div>
                        <div className="relative">
                            { children }
                            <div className="absolute bottom-0"><AudioSpectrum audioStream={userAudioStream} /></div>
                        </div>
                        <div className="text-[1.5em] flex items-center justify-center w-full space-x-4 bg-slate-600 shadow-md p-2">
                            <BiMicrophone/><BsCameraVideo/><MdOutlineScreenShare />
                        </div>
                    </div>
                </div>
            </div>
        )} />
    );
}

export default MediaControls;