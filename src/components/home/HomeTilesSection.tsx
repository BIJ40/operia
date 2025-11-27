import { PlumbingTile } from "./tiles/PlumbingTile";
import { ElectricityTile } from "./tiles/ElectricityTile";
import { CarpentryTile } from "./tiles/CarpentryTile";
import { PaintingTile } from "./tiles/PaintingTile";

export const HomeTilesSection = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <PlumbingTile />
      <ElectricityTile />
      <CarpentryTile />
      <PaintingTile />
    </div>
  );
};
