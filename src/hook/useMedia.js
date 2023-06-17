import { useState, useRef } from "react";
import useAuth from "./useAuth";

function useMedia() {
    const { user } = useAuth();

    /**
     * Uma gambiarra pra ter acesso aos streams anteriores. Fiz desse modo quando o evento de track era disparado e o setUserMedias chamado, 
     * o codigo parava de ouvir eventos de track, nao entendi muito bem o pq(tinha tentado por o userMedias no array de dependencias do useEffec, 
     * mas isso q fazia esse comportamento acontecer). Acho q por disparar o setUserMedias o listener atual era perdido e um novo criado logo em seguida,
     * mas isso fazia com q o evento de track nao finalizasse corretamnte. Ainda disparo setUserMedias pq quero q o componente seja remontado
     */
    const prevUserMedias = useRef({});
    const [userMedias, setUserMedias] = useState({});

    const resetMedias = () => {
        prevUserMedias.current = {};
        setUserMedias({});
    }

    const update = (id, type, media) => {
        let crrUserMedia = prevUserMedias.current[id];
        if(!crrUserMedia) {
            crrUserMedia = {
                id: id,
                isRoot: false,
                medias: {}
            };
        }
        crrUserMedia.medias[type] = media;
        const newMedias = {
            ...prevUserMedias.current,
            [id]: crrUserMedia
        }
        prevUserMedias.current = newMedias;
        console.log('new Medias', newMedias)
        setUserMedias(prevUserMedias.current);
    }

    const getMedias = () => {
        let medias = Object.values(userMedias).filter(userMedia=>userMedia.id!==`${user.name}-media`);
        let root = userMedias[`${user.name}-media`];
        if(root) {
            root.isRoot = true;
            medias.unshift(root);
        }
        return medias;
    };

    const hasFullScreen = () => getMedias().find(userMedia=> Object.values(userMedia.medias).find(media=>media&&media.isFullScreen));

    const toogleFullScreen = (id, type) => {
        const newUserMedias = {...prevUserMedias.current};
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
        resetMedias,
        getMedias,
        hasFullScreen,
        toogleFullScreen
    };
}

export default useMedia;