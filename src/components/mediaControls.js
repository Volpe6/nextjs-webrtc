import { MdDragIndicator, MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import { BsCameraVideo, BsCameraVideoOff } from "react-icons/bs";
import { BiMicrophone, BiMicrophoneOff } from "react-icons/bi";
import Drag from "./drag";

function MediaControls({connection}) {
    return (
        <Drag render={props=>(
            <div 
                className="absolute flex space-x-1"
                style={{
                    left: props.position.x,
                    top: props.position.y
                }}
            >
                <div 
                    onMouseDown={props.onMouseDown} 
                    onMouseMove={props.onMouseMove}
                    className="bg-red-500 text-[2em] flex items-center justify-center"
                >
                    <MdDragIndicator/>
                </div>
                <div className="text-[1.5em] flex space-x-4 bg-slate-600 shadow-md p-2">
                    <BiMicrophone/><BsCameraVideo/><MdOutlineScreenShare />
                </div>
            </div>
        )} />
    );
}

export default MediaControls;