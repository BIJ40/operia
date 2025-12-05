export const DiffusionBandeau = () => {
  const phrases = [
    "La rentabilité est le fruit d'un travail d'équipe coordonné et engagé.",
    "Comme en trail : chaque pas compte, chaque effort contribue à l'objectif final.",
    "L'excellence est dans les détails, la réussite dans la constance.",
    "Ensemble, nous construisons la performance de demain.",
  ];

  return (
    <div className="w-full bg-helpconfort-blue py-3 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        <span className="text-white text-lg font-medium mx-8">
          {phrases.join(' • ')}
        </span>
        <span className="text-white text-lg font-medium mx-8">
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
          animation: marquee 45s linear infinite;
        }
      `}</style>
    </div>
  );
};
