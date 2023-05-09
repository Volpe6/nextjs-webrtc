import { v4 as uuidv4 } from 'uuid';

export const TYPES = {
    TEXT: 'text',
    CHUNK: 'chunk',
    FILE_META: 'fileMeta',//informaçoes sobre o arquivo enviado(tamanho, nome....),
    FILE_ABORT: 'fileAbort',
    FILE_ERROR: 'fileError'
};

class Message {
    constructor(senderId, receiverId, message, type=TYPES.TEXT) {
        this.id = uuidv4();
        this.type = type;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.message = message;
        this.timestamp = new Date().getTime();
    }
}

export default Message;