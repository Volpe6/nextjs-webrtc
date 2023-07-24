const { useEffect, useRef } = require("react");
import { BiExpand, BiCollapse } from "react-icons/bi";

function Video({stream, width, isFullScreen=false}) {
    const videoRef = useRef(null);

    useEffect(() => {
        if(stream && videoRef.current) {
            try {
                videoRef.current.srcObject = stream;
            } catch (error) {
                console.log('nao foi possivel atribuir a stream a tag video');
            }
        }
    }, [stream]);

    const handleResize = () => {
        console.log(`Remote video size changed to ${videoRef.videoWidth}x${videoRef.videoHeight} - Time since pageload ${performance.now().toFixed(0)}ms`);
    }

    const handleLoadMetadata = (e) => {
        console.log(`video videoWidth: ${e.target.videoWidth}px,  videoHeight: ${e.target.videoHeight}px`);
    }

    return (<>
        <div className="relative">
            <div className="absolute text-[2em]">
                <BiCollapse className="text-pink-600" />
            </div>
            <video 
                ref={videoRef}
                className={`${isFullScreen&&'h-[100svh]'}`}
                onResize={handleResize} 
                onLoadedMetadata={handleLoadMetadata} 
                playsInline 
                autoPlay
                loop={true}
                width={width}
            >
            </video>
        </div>
    </>);
}

export default Video;