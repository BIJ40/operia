import { useMemo } from 'react';
import type { SignaturePayload } from './signatureEngine';
import { cn } from '@/lib/utils';

interface Props {
  payload: SignaturePayload;
  className?: string;
}

export function SignatureCanvas({ payload, className }: Props) {
  const { profile, background, colors, typography, statusBadge, decorations } = payload;
  const initials = `${(profile.first_name?.[0] || '').toUpperCase()}${(profile.last_name?.[0] || '').toUpperCase()}`;

  return (
    <div className={cn("rounded-2xl overflow-hidden shadow-lg border border-border/30", className)}>
      <div className="h-20 relative" style={{ background }}>
        {decorations.length > 0 && (
          <div className="absolute top-2 right-3 text-lg opacity-80 flex gap-1">
            {decorations.map((d, i) => <span key={i}>{d}</span>)}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-card p-5 -mt-8 mx-3 rounded-xl shadow-md relative">
        <div className="flex gap-4">
          <div className="shrink-0">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-border/30 bg-white" />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                style={{ background: colors.primary, fontFamily: typography.heading }}>
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold truncate" style={{ color: colors.primary, fontFamily: typography.heading }}>
                {profile.first_name} {profile.last_name}
              </h3>
              {statusBadge && (
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white", statusBadge.pulse && "animate-pulse")}
                  style={{ background: statusBadge.color }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  {statusBadge.label}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold mt-0.5" style={{ color: colors.accent }}>{profile.job_title}</p>
            <p className="text-xs text-muted-foreground">{profile.agency_name}</p>
            <hr className="my-2 border-border/30" style={{ borderColor: `${colors.accent}33` }} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <a href={`tel:${profile.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">📞 {profile.phone}</a>
              <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors" style={{ color: colors.accent }}>✉️ {profile.email}</a>
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors" style={{ color: colors.accent }}>
                  🌐 {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="h-1.5" style={{ background }} />
    </div>
  );
}
