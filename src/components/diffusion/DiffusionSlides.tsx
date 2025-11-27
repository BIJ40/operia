import { SlideUniversApporteurs } from './slides/SlideUniversApporteurs';
import { SlideCATechniciens } from './slides/SlideCATechniciens';
import { SlideSegmentation } from './slides/SlideSegmentation';
import { SlideApporteursSAV } from './slides/SlideApporteursSAV';

interface DiffusionSlidesProps {
  currentSlideIndex: number;
  currentMonthIndex: number;
  enabledSlides: string[];
}

export const DiffusionSlides = ({ 
  currentSlideIndex, 
  currentMonthIndex, 
  enabledSlides 
}: DiffusionSlidesProps) => {
  const slideComponents: Record<string, React.ComponentType<{ currentMonthIndex: number }>> = {
    'univers_apporteurs': SlideUniversApporteurs,
    'ca_techniciens': SlideCATechniciens,
    'segmentation': SlideSegmentation,
    'apporteurs_sav': SlideApporteursSAV,
  };

  const CurrentSlide = enabledSlides[currentSlideIndex] 
    ? slideComponents[enabledSlides[currentSlideIndex]]
    : null;

  if (!CurrentSlide) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/20 rounded-2xl">
        <p className="text-muted-foreground">Aucune slide sélectionnée</p>
      </div>
    );
  }

  return (
    <div className="min-h-[500px]">
      <CurrentSlide currentMonthIndex={currentMonthIndex} />
    </div>
  );
};
