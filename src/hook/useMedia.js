import { useState } from "react";

function useMedia() {

    const [userMedias, setUserMedias] = useState({});

    const update = (id, media) => {
        let crrUserMedia = userMedias[id];
        console.log('media atual antes if', crrUserMedia);
        if(!crrUserMedia) {
            crrUserMedia = {
                id: id,
                medias: {}
            };
        }
        console.log('media atual depois if', crrUserMedia);
        console.log('media', media);
        crrUserMedia.medias[media.type] = media;
        setUserMedias({
            ...userMedias,
            [id]: crrUserMedia
        });
        window.user = crrUserMedia
    }

    const remove = (id) => {
        const newUserMedias = {...userMedias};
        delete newUserMedias[id];
        setUserMedias(newUserMedias);
    }

    const getMedias = () => Object.values(userMedias);

    const get = (id) => userMedias[id];

    const hasFullScreen = () => getMedias().find(userMedia=> Object.values(userMedia.medias).find(media=>media.isFullScreen));

    const toogleFullScreen = (id, type) => {
        const newUserMedias = {...userMedias};
        const crrUserMedia = newUserMedias[id];
        if(crrUserMedia&&crrUserMedia.medias[type]) {
            const media = crrUserMedia.medias[type];
            media.isFullScreen = !media.isFullScreen;
            newUserMedias[id] = crrUserMedia;
        }
        setUserMedias(newUserMedias);
    }

    return {
        userMedias,
        update,
        remove,
        toogleFullScreen,
        get,
        getMedias,
        hasFullScreen
    };
}

export default useMedia;