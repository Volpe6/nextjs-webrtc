// const CHUNK_SIZE = 102400;//ta em byte
const CHUNK_SIZE = 26624;//ta em byte
const MAX_BUFFER_AMOUNT = Math.max(CHUNK_SIZE * 8, 5242880);
const MAX_FILE_SIZE = 15728640;
const SLEEP_TIME = 1000;

export default {
    CHUNK_SIZE,
    MAX_BUFFER_AMOUNT,
    MAX_FILE_SIZE,
    SLEEP_TIME,
};