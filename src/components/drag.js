import { useEffect, useState } from "react";

export default function Drag({ render, initialPosition = { x: 0, y: 0 } }) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleEnd() {
      setIsDragging(false);
    }

    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, []);

  const handleStart = (e) => {
    setIsDragging(true);
    const { clientX, clientY } = e.type.includes('touchstart') ? e.touches[0] : e;
    const { left, top } = e.target.parentNode.getBoundingClientRect();
    setCursorOffset({ x: clientX - left, y: clientY - top });
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    
    let dragArea = e.target.closest('.drag-area');
    if (!dragArea) {
      throw new Error('Nenhuma área de arraste encontrada');
    }

    const { clientX, clientY } = e.type.includes('touchmove') ? e.touches[0] : e;
    const { left, top, right, bottom } = dragArea.getBoundingClientRect();

    const newX = clientX - cursorOffset.x - left;
    const newY = clientY - cursorOffset.y - top;

    setPosition({
      x: newX,
      y: newY,
    });

    // Verifica se a posição atual está dentro das coordenadas limite
    // if (newX >= left && newX <= right && newY >= top && newY <= bottom) {
    //   setPosition({ x: newX - left, y: newY - top });
    // }
  };

  return render({
    position,
    handleMouseDown: handleStart,
    handleTouchStart: handleStart,
    handleMouseMove: handleMove,
    handleTouchMove: handleMove,
  });
}