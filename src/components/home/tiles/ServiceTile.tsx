import { ReactNode } from "react";

interface ServiceTileProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const ServiceTile = ({
  title,
  subtitle,
  icon,
  children,
  className = "",
}: ServiceTileProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="text-3xl">{icon}</div>}
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
};
