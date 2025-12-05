import { SlideCATechniciens } from './slides/SlideCATechniciens';

interface DiffusionSlidesProps {
  currentSlideIndex: number;
  currentMonthIndex: number;
  enabledSlides: string[];
}

export const DiffusionSlides = ({ currentMonthIndex }: DiffusionSlidesProps) => {
  // Graphique CA/Technicien figé (plus de rotation)
  return (
    <div className="min-h-[450px]">
      <SlideCATechniciens currentMonthIndex={currentMonthIndex} />
    </div>
  );
};
