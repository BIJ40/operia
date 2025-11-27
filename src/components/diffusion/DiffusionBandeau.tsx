export const DiffusionBandeau = () => {
  const phrases = [
    "La rentabilité est le fruit d'un travail d'équipe coordonné et engagé.",
    "Comme en trail : chaque pas compte, chaque effort contribue à l'objectif final.",
    "L'excellence est dans les détails, la réussite dans la constance.",
    "Ensemble, nous construisons la performance de demain.",
  ];

  return (
    <div className="w-full bg-primary py-4 overflow-hidden shadow-lg">
      <div className="animate-marquee whitespace-nowrap">
        <span className="text-white text-2xl font-semibold mx-8">
          {phrases.join(' • ')}
        </span>
        <span className="text-white text-2xl font-semibold mx-8">
          {phrases.join(' • ')}
        </span>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
};
