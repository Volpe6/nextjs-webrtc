import { MdDragIndicator, MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import { BsCameraVideo, BsCameraVideoOff, BsChatLeftDots } from "react-icons/bs";
import { BiMicrophone, BiMicrophoneOff } from "react-icons/bi";
import Drag from "./drag";
import AudioSpectrum from "./audioSpectrum";
import { getDevice, DEVINCE_TYPES } from '../utils/devinceDetector';
import { MdOutlineCameraswitch } from "react-icons/md";

function MediaControls({connection, audioStream, handleAudio, handleCam, handleDisplay, handleChat, handleCamMode, children}) {
    return (
        <Drag initialPosition={{x:0, y:'50%'}} render={props=>(
            <div 
                className="absolute flex flex-col space-y-1"
                style={{
                    left: props.position.x,
                    top: props.position.y
                }}
            >
                <div className="flex space-x-1">
                    <div 
                        onTouchStart={props.handleMouseDown}
                        onTouchMove={props.handleMouseMove}
                        onMouseDown={props.handleMouseDown} 
                        onMouseMove={props.handleMouseMove}
                        className="bg-red-500 text-[2.5em] flex justify-center w-[50px]"
                    >
                        <MdDragIndicator/>
                    </div>
                    <div>
                        <div className="relative">
                            {children}
                            <div className="absolute pointer-events-none bottom-0"><AudioSpectrum audioStream={audioStream} /></div>
                        </div>
                        <div className="relative text-[1.5em] flex items-center justify-center w-full space-x-4 bg-slate-600 shadow-md p-2">
                            <BiMicrophone onClick={handleAudio}/>
                            <BsCameraVideo onClick={handleCam}/>
                            <MdOutlineScreenShare onClick={handleDisplay}/>
                            <BsChatLeftDots onClick={handleChat}/>
                            {
                                getDevice()===DEVINCE_TYPES.MOBILE&&<MdOutlineCameraswitch onClick={handleCamMode}/>
                            }
                        </div>
                    </div>
                </div>
            </div>
        )} />
    );
}

export default MediaControls;