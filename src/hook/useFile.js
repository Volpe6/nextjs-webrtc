import FileUpload from "@/utils/fileUpload";
import { useRef } from "react";
import { toast } from "react-toastify";
import { TYPES as MESSAGE_TYPES } from "@/models/message";

function useFile() {
    const files = useRef([]);

    const cancelFilesFromConnection = (connection) => {
        files.current.forEach(file => {
            if(file.connection.name===connection.name) {
                console.log('filessss', file);
                window.file = file;
                file.abort();
            }
        });
    }

    const _addFile = (file) => files.current = [...files.current, file];

    const removeFile = (id) => files.current = files.current.filter(file=> file.id !== id);

    const findFile = (id) => files.current.find(fileUpload => fileUpload.id === id);

    const cancel = (data) => {
        const { id } = data;
        const file = findFile(id);
        if(file) {
            file.abort();
        }
    }

    const receiveChunk = (data) => {
        const { id, chunk } = data; 
        const file = findFile(id);
        if(file) {
            file.receive(chunk);
        }
    }

    const receiveFile = (connection, data) => {
        const receiveFile = new FileUpload({connection:connection, isReceive:true, ...data});
        receiveFile.attachObserver({ 
            obs: async (event, ...args) => {
                const actions = {
                    end: id => removeFile(id),
                    error: id => {
                        toast('falha no recebimento do arquivo');
                        const msg = connection.getMessages()[id];
                        msg.message.file.error = true;

                        connection.send({
                            type: MESSAGE_TYPES.FILE_ERROR,
                            message: {id}
                        });
                    },
                    abort: id => {
                        toast('recebimento do arquivo foi cancelado');
                        const msg = connection.getMessages()[id];
                        msg.message.file.canceled = true;

                        connection.send({
                            type: MESSAGE_TYPES.FILE_ABORT,
                            message: {id}
                        });
                    },
                    received: (id, metadata, file) => {
                        const msg = connection.getMessages()[id];
                        msg.message.file.complete = true;
                        msg.message.file.downloadFile = URL.createObjectURL(file);
                    },
                };
                receiveFile.executeActionStrategy(actions, event, ...args);
            }
        });
        _addFile(receiveFile);
    }

    const sendFile = (connection, filess) => {
        if(!filess) {
            console.log('nada escolhido');
            return;
        }
        if(filess.length > 1) {
            toast('atuamente apenas um arquivo por vez');
            return;
        }
        const sendFile = new FileUpload({ file: filess[0], isReceive:false, connection: connection });
        sendFile.attachObserver({
            obs: async (event, ...args) => {
                const actions = {
                    end: id => {
                        toast.warn('finalizou');
                        removeFile(id);
                    },
                    received: (id, metadata, file) => {
                        const msg = connection.getMessages()[id];
                        msg.message.file.complete = true;
                        msg.message.file.downloadFile = URL.createObjectURL(file);
                    },
                    error: id => {
                        toast('falha no envio do arquivo');
                        const msg = connection.getMessages()[id];
                        msg.message.file.error = true;

                        connection.send({
                            type: MESSAGE_TYPES.FILE_ERROR,
                            message: {id}
                        });
                    },
                    abort: id => {
                        toast('Envio do arquivo foi cancelado');
                        const msg = connection.getMessages()[id];
                        msg.message.file.canceled = true;

                        connection.send({
                            type: MESSAGE_TYPES.FILE_ABORT,
                            message: {id}
                        });
                    },
                    cleanqueue: _ => {
                        // Limpando a fila de envio com uma mensagem vazia
                        console.log('linpando fila');
                        connection.peer.cleanChannelqueue();
                    },
                    info: data => console.log(data),
                    metadata: data => {
                        connection.send({
                            type: MESSAGE_TYPES.FILE_META,
                            message: data
                        });
                    },
                    chunk: data => {
                        connection.send({
                            type: MESSAGE_TYPES.CHUNK,
                            message: data
                        });
                    }
                };
                sendFile.executeActionStrategy(actions, event, ...args);
            }
        });
        sendFile.send();
        _addFile(sendFile);
    }

    return {
        files,
        cancel,
        removeFile,
        findFile,
        cancelFilesFromConnection,
        receiveChunk,
        receiveFile,
        sendFile
    };
}

export default useFile;