import { useState, useEffect, useRef } from 'react';

interface UseAutoRotationOptions {
  enabled: boolean;
  rotationSpeedSeconds: number;
  nbSlides: number;
  nbMonths: number;
}

export const useAutoRotation = ({
  enabled,
  rotationSpeedSeconds,
  nbSlides,
  nbMonths,
}: UseAutoRotationOptions) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || isPaused || nbSlides === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const nextSlide = (prev + 1) % nbSlides;
        
        // À chaque tour complet de slides, passer au mois suivant
        if (nextSlide === 0) {
          setCurrentMonthIndex((prevMonth) => (prevMonth + 1) % nbMonths);
        }
        
        return nextSlide;
      });
    }, rotationSpeedSeconds * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, rotationSpeedSeconds, nbSlides, nbMonths, isPaused]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);
  
  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index % nbSlides);
  };
  
  const goToMonth = (index: number) => {
    setCurrentMonthIndex(index % nbMonths);
  };

  return {
    currentSlideIndex,
    currentMonthIndex,
    pause,
    resume,
    goToSlide,
    goToMonth,
    isPaused,
  };
};
