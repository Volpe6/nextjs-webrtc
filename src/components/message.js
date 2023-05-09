import { useEffect, useRef, useState } from "react";
import { CircularProgressbarWithChildren } from 'react-circular-progressbar';
import { toast } from "react-toastify";

function Message({ props }) {
    const { sender, message, fileUpload } = props;
    const downloadRef = useRef(null);
    const progressDivRef = useRef(null);
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
                    progress: progress => {
                        setDownloadProgress(progress);
                        if(progressDivRef.current) {
                            progressDivRef.current.innerHTML = progress;
                        }
                    },
                    error: _ => {
                        toast('erro')
                        toast('cancelado')
                        setDownloadProgress(0);
                        if(progressDivRef.current) {
                            progressDivRef.current.innerHTML = 'cancelado';
                        }
                    },
                    abort: _ => {
                        toast('cancelado')
                        setDownloadProgress(0);
                        if(progressDivRef.current) {
                            progressDivRef.current.innerHTML = 'cancelado';
                        }
                    },
                    received: (id, metadata, file) => {
                        const downloadAnchor = downloadRef.current;
                        downloadAnchor.href = URL.createObjectURL(file);
                        downloadAnchor.download = metadata.name;

                        if(progressDivRef.current) {
                            progressDivRef.current.innerHTML = 'baixar';
                        }
                    },
                };
                fileUpload.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            fileUpload.detachObserver(id);
        };
    }, [fileUpload]);

    const handleCancel = () => {
        fileUpload.abort();
    }
    
    return (<>
        <div className={`flex ${sender? 'items-end justify-end':'items-start justify-start'}`}>
            <div className={`rounded-lg p-2 ${sender?'bg-blue-500 text-white': 'bg-gray-100'}`}>
                <p className="text-sm">{message}</p>
            </div>
            <div className="w-[15%]">
                <a ref={downloadRef} onClick={handleCancel} >
                    {
                        downloadProgress&&
                        <CircularProgressbarWithChildren value={downloadProgress}>
                            <div ref={progressDivRef}></div>
                        </CircularProgressbarWithChildren>
                    }
                </a>
            </div>
        </div>
    </>);
}

export default Message;