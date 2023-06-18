import { MdDragIndicator, MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import { BsCameraVideo, BsCameraVideoOff, BsChatLeftDots } from "react-icons/bs";
import { BiMicrophone, BiMicrophoneOff } from "react-icons/bi";
import Drag from "./drag";
import AudioSpectrum from "./audioSpectrum";
import { getDevice, DEVINCE_TYPES } from '../utils/devinceDetector';
import { MdOutlineCameraswitch } from "react-icons/md";

function MediaControls({connection, audioStream, handleAudio, handleCam, handleDisplay, handleChat, handleCamMode, children}) {
    return (
        <Drag initialPosition={{x:0, y:'30%'}} render={props=>(
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
                            {
                                connection.userStream&&connection.userStream.getAudioTracks().length>0?
                                <BiMicrophone onClick={handleAudio}/>:
                                <BiMicrophoneOff onClick={handleAudio}/>
                            }
                            {
                                connection.userStream&&connection.userStream.getVideoTracks().length>0?
                                <BsCameraVideo onClick={handleCam}/>:
                                <BsCameraVideoOff onClick={handleCam}/>
                            }
                            {
                                (getDevice()!==DEVINCE_TYPES.MOBILE)&&(connection.displayStream&&connection.displayStream.getTracks().length>0)?
                                <MdOutlineScreenShare onClick={handleDisplay}/>:
                                <MdOutlineStopScreenShare onClick={handleDisplay}/>
                            }
                            <BsChatLeftDots onClick={handleChat}/>
                            {
                                getDevice()===DEVINCE_TYPES.MOBILE?<MdOutlineCameraswitch onClick={handleCamMode}/>:null
                            }
                        </div>
                    </div>
                </div>
            </div>
        )} />
    );
}

export default MediaControls;