import { useEffect, useRef, useState } from "react";
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import { toast } from "react-toastify";
import { AiOutlineCloseCircle, AiOutlineDownload } from "react-icons/ai";

function Message({ props }) {
    const { sender, message, fileUpload } = props;
    const downloadRef = useRef(null);
    const [isCanceled, setIsCanceled] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(null);

    useEffect(() => {
        if(!fileUpload) {
            return;
        }
        const id = `file-${fileUpload.id}`; 
        fileUpload.attachObserver({
            id: id,
            obs: async (event, ...args) => {
                const actions = {
                    progress: progress => setDownloadProgress(progress),
                    error: _ => {
                        toast('erro')
                        toast('cancelado')
                        setIsCanceled(true);
                        // setDownloadProgress(0);
                    },
                    abort: _ => {
                        toast('cancelado')
                        // setDownloadProgress(0);
                        setIsCanceled(true);
                    },
                    received: (id, metadata, file) => {
                        const downloadAnchor = downloadRef.current;
                        downloadAnchor.href = URL.createObjectURL(file);
                        downloadAnchor.download = metadata.name;
                    },
                };
                fileUpload.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            fileUpload.detachObserver(id);
        };
    }, [fileUpload, isCanceled, downloadProgress]);

    const handleCancel = () => {
        if(downloadProgress==100) return;
        fileUpload.abort();
    }
    
    return (<>
        <div className={`flex ${sender? 'items-end justify-end':'items-start justify-start'}`}>
            <div className={`rounded-lg flex items-center space-x-2 p-2 ${sender?'bg-blue-500 text-white': 'bg-gray-100'}`}>
                <p className="text-sm">{message}</p>
                {
                    fileUpload&&
                    <div className="w-[50px]">
                        <a ref={downloadRef} onClick={handleCancel} >
                            {
                                downloadProgress&&
                                <CircularProgressbarWithChildren 
                                    value={downloadProgress}
                                    styles={buildStyles({
                                        pathColor: '#7e22ce',
                                    })}
                                >
                                    <div className="flex flex-col items-center">
                                        {
                                            !isCanceled?
                                                downloadProgress==100?
                                                <AiOutlineDownload/>:
                                                (
                                                    <>
                                                        <AiOutlineCloseCircle />   
                                                        <div className="text-[10px]">{downloadProgress.toFixed(2)}</div>
                                                    </>
                                                ):
                                            'cancelado'
                                        }
                                    </div>
                                </CircularProgressbarWithChildren>
                            }
                        </a>
                    </div>
                }
            </div>
        </div>
    </>);
}

export default Message;