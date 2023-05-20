import { createContext, useEffect, useState, useContext } from "react";
import { useRouter } from "next/router";

const MediaContext = createContext();

export const MediaContextProvider = ({ children }) => {
    return (
        <MediaContext.Provider value={{}}>
            { children }
        </MediaContext.Provider>
    );
}

export default function useMediaContext() {
    return useContext(MediaContext);
}