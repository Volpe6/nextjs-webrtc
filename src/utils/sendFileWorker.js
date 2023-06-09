import FileConstants from "./fileConstants";

const fileReader = new FileReader();

let stop = false;
let aborted = false;

//faz a leitura do arquivo e o envia como blocos, onde cada bloco é um arrayBUffer
onmessage = function(e) {
    const { type, data } = e.data;
    const strategy = {
        stop: _ => stop = true,
        continue: _ => stop = false,
        abort: _ => {
            aborted = true;
            fileReader.abort();
            postMessage({
                type: 'abort',
                data: 'Leitura do arquivo abortado'
            })
        },
        start: file => {
            const receiveBuffer = [];
            let offset = 0;

            fileReader.onerror =  error =>  postMessage({
                type: 'error',
                data: `Erro lendo o arquivo: ${file.name}`,
                detail: error
            });
            fileReader.onabort = (e) => postMessage({
                type: 'abort',
                data: 'Leitura do arquivo abortado:' + file.name
            });
            fileReader.onload = async (e) => {
                console.log('FileRead.onload ', e);
                while(stop) {
                    postMessage({type: 'stoped'});
                    await new Promise(resolve => setTimeout(resolve, FileConstants.SLEEP_TIME));
                }
                //envia o resultado da leitura de volta
                /**
                 * nao tava conseguindo enviar um array de buffer em um objeto stringficado.
                 * entao transformei o ArrayBuffer retornado em um Uint8Array e entao transforma-lo 
                 * em um array
                 * TODO: verificar se tem uma forma de fazer isso melhor
                 */
                postMessage({
                    type: 'chunk',
                    data: Array.from(new Uint8Array(e.target.result))
                });
                receiveBuffer.push(e.target.result);
                offset += e.target.result.byteLength;
                postMessage({ type: 'progress', data: (offset*100)/file.size });
                
                if(aborted) {
                    return;
                }
                //se o arquivo nao foi completamente lido, le o proximo pedaço do arquivo
                if (offset < file.size) {
                    readSlice(offset);
                } else {
                    //aquivo foi lido e colocado em um blob afim de possibilitar download do mesmo pelo chat
                    postMessage({ type: 'received', data: new Blob(receiveBuffer)});
                    postMessage({type: 'end'});
                }
            };

            const readSlice = crrOffset => {
                console.log('readSlice ', crrOffset);
                const slice = file.slice(offset, crrOffset + FileConstants.CHUNK_SIZE);
                fileReader.readAsArrayBuffer(slice);
            };

            readSlice(0);//inicia a leitura do arquivo como array buffer
        }
    }

    const chosenStrategy = strategy[type];
    if(chosenStrategy) {
        chosenStrategy(data);
    }
}