import React from 'react';
import { Star } from 'lucide-react';

interface GoogleReviewsBannerProps {
  googleReviewsUrl: string;
}

export const GoogleReviewsBanner: React.FC<GoogleReviewsBannerProps> = ({ googleReviewsUrl }) => {
  return (
    <a
      href={googleReviewsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-full mb-4 md:mb-6"
    >
      <div className="relative overflow-hidden rounded-xl border border-amber-400/30 
        bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 
        dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-amber-900/20
        shadow-md hover:shadow-xl transition-all duration-300 
        hover:-translate-y-0.5 hover:border-amber-400/50">
        <div className="flex items-center justify-center gap-3 py-4 px-4">
          {/* Stars left */}
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <Star 
                key={`left-${i}`} 
                className="h-4 w-4 md:h-5 md:w-5 text-amber-400 fill-amber-400 
                  group-hover:scale-110 transition-transform duration-300" 
                style={{ transitionDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          
          {/* Text */}
          <div className="text-center">
            <p className="text-sm md:text-base font-semibold text-amber-800 dark:text-amber-200">
              Votre avis nous intéresse !
            </p>
            <p className="text-xs md:text-sm text-amber-600 dark:text-amber-300">
              Cliquez ici pour nous laisser un avis Google
            </p>
          </div>
          
          {/* Stars right */}
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <Star 
                key={`right-${i}`} 
                className="h-4 w-4 md:h-5 md:w-5 text-amber-400 fill-amber-400 
                  group-hover:scale-110 transition-transform duration-300" 
                style={{ transitionDelay: `${(2 - i) * 50}ms` }}
              />
            ))}
          </div>
        </div>
        
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
          -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      </div>
    </a>
  );
};
