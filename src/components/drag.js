import { useEffect, useState } from "react";

export default function Drag({render}) {

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        function onMouseUp(e) {setIsDragging(false)}
        document.addEventListener('mouseup', onMouseUp);
        return () => document.removeEventListener('mouseup', onMouseUp);
    }, [position, isDragging, cursorOffset]);

    const onMouseDown = (e) => {
        setIsDragging(true);
        const { clientX, clientY } = e;
        const { left, top } = e.target.getBoundingClientRect();
        setCursorOffset({ x: clientX - left, y: clientY - top });
    }
    
    const onMouseMove = (e) => {
        if (!isDragging) return;
        const { clientX, clientY } = e;
        setPosition({
            x: clientX - cursorOffset.x,
            y: clientY - cursorOffset.y,
        });
    }


    return render({position, onMouseDown, onMouseMove});
}