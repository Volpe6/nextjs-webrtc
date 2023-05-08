
const receiveBuffer = [];
let receivedSize = 0;
let file;

onmessage = function(e) {
    const { type, data } = e.data;
    const strategy = {
        metadata: data => file = data,
        receive: data => {
            const buffer = Uint8Array.from(data).buffer;
            receiveBuffer.push(buffer);
            receivedSize += buffer.byteLength;
            
            postMessage({ type: 'progress', data: (receivedSize*100)/file.size });
            if(receivedSize === file.size) {
                const received = new Blob(receiveBuffer);
                postMessage({ type: 'received', data: received});
                postMessage({ type: 'end'});
            }
        } 
    };
    const chosenStrategy = strategy[type];
    if(chosenStrategy) {
        chosenStrategy(data);
    }
}