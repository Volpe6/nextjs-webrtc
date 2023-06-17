export const DEVINCE_TYPES = {
    MOBILE: 'mobile',
    OUTHER: 'outher',
};

export async function getDevice() {
    if (screen.width < 640 || screen.height < 480) {
        // sirva a versão pra celular
        return DEVINCE_TYPES.MOBILE;
    } 
    if (screen.width < 1024 || screen.height < 768) {
        // versão pra tablet
        return DEVINCE_TYPES.MOBILE;
    } 
    return DEVINCE_TYPES.OUTHER;
}