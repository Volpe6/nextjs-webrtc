import { useEffect, useState } from "react";

export default function Drag({render}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseUp(e) {
      setIsDragging(false);
    }
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [position, isDragging, cursorOffset]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const { clientX, clientY } = e;
    const { left, top } = e.target.parentNode.getBoundingClientRect();
    setCursorOffset({ x: clientX - left, y: clientY - top });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    // let dragArea = e.target.parentNode;
    // while (dragArea && !dragArea.classList.contains('drag-area')) {
    //   dragArea = dragArea.parentNode;
    // }

    let dragArea = e.target.closest('.drag-area');//closest é experimental, caso nao funcione, utilizar o codigo comentato acima

    if(!dragArea) {
      throw new Error('nao foi encontrada uma area de arraste');
    }

    const { clientX, clientY } = e;
    const { left, top, right, bottom } = dragArea.getBoundingClientRect();


    const newX = clientX - cursorOffset.x - left;
    const newY = clientY - cursorOffset.y - top;

    setPosition({
      x: newX, 
      y: newY,
    });

    // Verifica se a posição atual está dentro das coordenadas limite
    //caso queira limitar a area de arraste
    // if (newX >= left && newX <= right && newY >= top && newY <= bottom) {
    //   setPosition({ x: newX - left, y: newY - top });
    // }
  };

  return render({position, handleMouseDown, handleMouseMove});
}