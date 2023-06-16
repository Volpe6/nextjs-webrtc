import { useEffect, useRef, useState } from "react";
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import { AiOutlineCloseCircle, AiOutlineDownload } from "react-icons/ai";

function Message({ props }) {
    const { sender, message, fileUpload, file } = props;
    const downloadRef = useRef(null);
    const [downloadProgress, setDownloadProgress] = useState(file&&file.downloadFile?100:null);//se possui o arquivo e ele esta disponivel para download define o progresso para 100%

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
                };
                fileUpload.executeActionStrategy(actions, event, ...args);
            }
        });
        return () => {
            fileUpload.detachObserver(id);
        };
    }, [fileUpload, downloadProgress]);

    const handleCancel = () => {
        if(downloadProgress==100) return;
        fileUpload.abort();
    }
    
    return (<>
        <div className={`flex ${sender? 'items-end justify-end':'items-start justify-start'}`}>
            <div className={`rounded-lg flex items-center space-x-2 p-2 ${sender?'bg-blue-500 text-white': 'bg-gray-100'}`}>
                <p className="text-sm">{message}</p>
                {
                    file&&
                    <div className="w-[50px]">
                        <a 
                            ref={downloadRef} 
                            href={file.downloadFile}
                            download={file.name}
                            onClick={handleCancel} 
                        >
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
                                            !file.canceled&&!file.error?
                                                downloadProgress==100||file.downloadFile?
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