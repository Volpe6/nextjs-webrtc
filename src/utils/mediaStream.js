
export async function getUserMedia(opts) {
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia(opts);
    } catch (e) {
        if(e.name === 'NotAllowedError') {
            console.error('acesso negado pelo usuario');
            return;
        }
        throw e;
    }
    return stream;
}

export async function getDisplayMedia(opts) {
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia(opts);
    } catch (e) {
        if(e.name === 'NotAllowedError') {
            console.error('acesso negado pelo usuario');
            return;
        }
        throw e;
    }
    return stream;
}