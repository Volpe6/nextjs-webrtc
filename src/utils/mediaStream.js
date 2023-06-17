
export async function getUserMedia(opts) {
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia(opts);
    } catch (e) {
        console.error(`getUserMedia() error: ${e.toString()}`);
    }
    return stream;
}

export async function getDisplayMedia(opts) {
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia(opts);
    } catch (e) {
        console.error(`getUserMedia() error: ${e.toString()}`);
    }
    return stream;
}