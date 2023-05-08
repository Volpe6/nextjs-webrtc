const CHUNK_SIZE = 26624;
const MAX_BUFFER_AMOUNT = Math.max(CHUNK_SIZE * 8, 5242880); // 8 chunks or at least 5 MiB
const MAX_FILE_SIZE = 15728640;
const TIME_OUT = 1000;

const fileReader = new FileReader();

let stop = false;

//faz a leitura do arquivo e o envia como blocos, onde cada bloco é um arrayBUffer
onmessage = function(e) {
    const { type, data } = e.data;
    const strategy = {
        stop: _ => stop = true,
        continue: _ => stop = false,
        abort: _ => fileReader.abort(),
        start: file => {
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
                    await new Promise(resolve => setTimeout(resolve, TIME_OUT));
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
                offset += e.target.result.byteLength;
                postMessage({ type: 'progress', data: (offset*100)/file.size });
                //se o arquivo nao foi completamente lido, le o proximo pedaço do arquivo
                if (offset < file.size) {
                    readSlice(offset);
                } else {
                    postMessage({type: 'end'});
                }
            };

            const readSlice = crrOffset => {
                console.log('readSlice ', crrOffset);
                const slice = file.slice(offset, crrOffset + CHUNK_SIZE);
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