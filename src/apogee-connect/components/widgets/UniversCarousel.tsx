import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversStats } from "@/apogee-connect/utils/universCalculations";
import { UniversKpiCard } from "./UniversKpiCard";

interface UniversCarouselProps {
  stats: UniversStats[];
  universes: Array<{ slug: string; label: string; colorHex: string; icon?: string }>;
}

export const UniversCarousel = ({ stats, universes }: UniversCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sort by CA descending
  const sortedStats = [...stats].sort((a, b) => b.caHT - a.caHT);
  const universesMap = new Map(universes.map(u => [u.slug, u]));

  const itemsPerPage = 2;
  const totalPages = Math.ceil(sortedStats.length / itemsPerPage);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const visibleStats = sortedStats.slice(
    currentIndex * itemsPerPage,
    currentIndex * itemsPerPage + itemsPerPage
  );

  if (sortedStats.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Top Univers par CA ({currentIndex + 1}/{totalPages})
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPrev}
            disabled={totalPages <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNext}
            disabled={totalPages <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        {visibleStats.map((stat) => {
          const universeRef = universesMap.get(stat.univers);
          return (
            <UniversKpiCard
              key={stat.univers}
              stat={stat}
              color={universeRef?.colorHex || '#6B7280'}
              label={universeRef?.label || stat.univers}
              icon={universeRef?.icon || 'HelpCircle'}
            />
          );
        })}
      </div>

      {/* Dots indicator */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'w-6 bg-primary' 
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
