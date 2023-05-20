import { useState } from "react";

function useMedia() {

    const [userMedias, setUserMedias] = useState({});

    const update = (id, media) => {
        let crrUserMedia = userMedias[id];
        if(!crrUserMedia) {
            crrUserMedia = {
                id: id,
                medias: {}
            };
        }
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
        update,
        remove,
        toogleFullScreen,
        getMedias,
        hasFullScreen
    };
}

export default useMedia;