import { useEffect, useRef, useState } from "react";
import { CircularProgressbarWithChildren } from 'react-circular-progressbar';

function Message({ props }) {
    const { id, sender, message, fileUpload } = props;
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
                    // error: error => toast(error),
                    // abort: _ => toast('Envio do arquivo foi cancelado'),
                    // metadata: data => {
                    //     conn.send({
                    //         type: MESSAGE_TYPES.FILE_META,
                    //         message: data
                    //     });
                    // },
                    // chunk: data => {
                    //     //é feito isso para conseguir serializar
                    //     conn.send({
                    //         type: MESSAGE_TYPES.CHUNK,
                    //         message: data
                    //     });
                    // },
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
    
    return (<>
        <div id={id} className={`flex ${sender? 'items-end justify-end':'items-start justify-start'}`}>
            <div className={`rounded-lg p-2 ${sender?'bg-blue-500 text-white': 'bg-gray-100'}`}>
                <p className="text-sm">{message}</p>
            </div>
            <div className="w-[15%]">
                <a ref={downloadRef} >
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