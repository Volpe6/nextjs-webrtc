const { useEffect, useRef } = require("react");
import { BiExpand, BiCollapse } from "react-icons/bi";

function Video({stream, width, fullScreenFunction}) {
    const videoRef = useRef(null);

    useEffect(() => {
        if(stream && videoRef.current) {
            videoRef.current.srcObject = stream;
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
                onClick={fullScreenFunction}
                ref={videoRef}
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