import { useState, useEffect, useRef } from 'react';

interface Position {
  right: number;
  bottom: number;
}

interface DragOffset {
  x: number;
  y: number;
}

export function useChatbotDrag(isOpen: boolean) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const [buttonPosition, setButtonPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('chatbot-position');
    return saved ? JSON.parse(saved) : { right: 24, bottom: 24 };
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isOpen) return;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relativeX = e.clientX - rect.left;
    const buttonWidth = rect.width;
    const isDragZone = relativeX > buttonWidth * 0.75;

    if (isDragZone) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const buttonSize = 80;

      const newRight = windowWidth - e.clientX - dragOffset.x - buttonSize;
      const newBottom = windowHeight - e.clientY - dragOffset.y - buttonSize;

      const clampedRight = Math.max(0, Math.min(windowWidth - buttonSize, newRight));
      const clampedBottom = Math.max(0, Math.min(windowHeight - buttonSize, newBottom));

      setButtonPosition({ right: clampedRight, bottom: clampedBottom });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('chatbot-position', JSON.stringify(buttonPosition));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, buttonPosition]);

  return {
    buttonRef,
    buttonPosition,
    isDragging,
    handleMouseDown,
  };
}
