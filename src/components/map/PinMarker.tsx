/**
 * PinMarker - Marker personnalisé pour la carte des RDV
 * 
 * Forme: pictogramme classique de localisation (pin)
 * La tête du pin est une pastille circulaire:
 * - Si 1 technicien: pastille pleine avec couleur du technicien
 * - Si plusieurs: camembert SVG découpé par technicien
 * - Max 4 secteurs visibles, sinon 3 + 1 secteur gris "autres"
 */

import React from 'react';

interface PinUser {
  id: number;
  name: string;
  color: string;
}

interface PinMarkerProps {
  users: PinUser[];
  size?: number;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Génère le path SVG pour un secteur de camembert
 */
function describePieSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

export function PinMarker({ users, size = 40, selected = false, onClick }: PinMarkerProps) {
  const headRadius = size * 0.35;
  const headCx = size / 2;
  const headCy = size * 0.35;
  const tailHeight = size * 0.45;
  
  // Préparer les couleurs des secteurs
  let displayUsers = users.slice(0, 4);
  let hasOthers = false;
  
  if (users.length > 4) {
    displayUsers = users.slice(0, 3);
    hasOthers = true;
  }
  
  const totalSectors = hasOthers ? displayUsers.length + 1 : displayUsers.length;
  const anglePerSector = 360 / totalSectors;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        filter: selected ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.8))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        transform: selected ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 0.2s ease, filter 0.2s ease',
      }}
    >
      {/* Ombre du pin */}
      <ellipse
        cx={headCx}
        cy={size - 2}
        rx={size * 0.15}
        ry={size * 0.05}
        fill="rgba(0,0,0,0.2)"
      />
      
      {/* Queue du pin (triangle pointant vers le bas) */}
      <path
        d={`
          M ${headCx - headRadius * 0.6} ${headCy + headRadius * 0.5}
          L ${headCx} ${headCy + tailHeight}
          L ${headCx + headRadius * 0.6} ${headCy + headRadius * 0.5}
          Z
        `}
        fill={users.length === 1 ? users[0].color : '#6366f1'}
        stroke="white"
        strokeWidth={1.5}
      />
      
      {/* Tête du pin (cercle) */}
      {users.length === 1 ? (
        // Un seul technicien: cercle plein
        <circle
          cx={headCx}
          cy={headCy}
          r={headRadius}
          fill={users[0].color}
          stroke="white"
          strokeWidth={2}
        />
      ) : (
        // Plusieurs techniciens: camembert
        <g>
          {/* Fond blanc pour bordure */}
          <circle
            cx={headCx}
            cy={headCy}
            r={headRadius + 1}
            fill="white"
          />
          
          {/* Secteurs colorés */}
          {displayUsers.map((user, index) => {
            const startAngle = index * anglePerSector;
            const endAngle = startAngle + anglePerSector;
            return (
              <path
                key={user.id}
                d={describePieSlice(headCx, headCy, headRadius, startAngle, endAngle)}
                fill={user.color}
              />
            );
          })}
          
          {/* Secteur "autres" si nécessaire */}
          {hasOthers && (
            <path
              d={describePieSlice(
                headCx,
                headCy,
                headRadius,
                displayUsers.length * anglePerSector,
                360
              )}
              fill="#9ca3af" // Gris
            />
          )}
          
          {/* Bordure extérieure */}
          <circle
            cx={headCx}
            cy={headCy}
            r={headRadius}
            fill="none"
            stroke="white"
            strokeWidth={2}
          />
        </g>
      )}
      
      {/* Compteur si > 4 techniciens */}
      {hasOthers && (
        <text
          x={headCx}
          y={headCy + 3}
          textAnchor="middle"
          fontSize={size * 0.2}
          fontWeight="bold"
          fill="white"
          style={{ pointerEvents: 'none' }}
        >
          {users.length}
        </text>
      )}
    </svg>
  );
}

/**
 * Crée un élément DOM pour le marker Mapbox
 */
export function createPinMarkerElement(
  users: PinUser[],
  size: number = 40,
  selected: boolean = false,
  onClick?: () => void,
  orderNumber?: number
): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cursor = onClick ? 'pointer' : 'default';
  
  // Render SVG to string
  const headRadius = size * 0.35;
  const headCx = size / 2;
  const headCy = size * 0.35;
  const tailHeight = size * 0.45;
  
  let displayUsers = users.slice(0, 4);
  let hasOthers = false;
  
  if (users.length > 4) {
    displayUsers = users.slice(0, 3);
    hasOthers = true;
  }
  
  const totalSectors = hasOthers ? displayUsers.length + 1 : displayUsers.length;
  const anglePerSector = 360 / totalSectors;
  
  let svgContent = '';
  
  // Ombre
  svgContent += `<ellipse cx="${headCx}" cy="${size - 2}" rx="${size * 0.15}" ry="${size * 0.05}" fill="rgba(0,0,0,0.2)"/>`;
  
  // Queue
  const tailPath = `M ${headCx - headRadius * 0.6} ${headCy + headRadius * 0.5} L ${headCx} ${headCy + tailHeight} L ${headCx + headRadius * 0.6} ${headCy + headRadius * 0.5} Z`;
  const tailColor = users.length === 1 ? users[0].color : '#6366f1';
  svgContent += `<path d="${tailPath}" fill="${tailColor}" stroke="white" stroke-width="1.5"/>`;
  
  // Mode tournée avec numéro : cercle plein couleur + numéro blanc
  if (orderNumber != null && users.length >= 1) {
    const pinColor = users[0].color;
    svgContent += `<circle cx="${headCx}" cy="${headCy}" r="${headRadius}" fill="${pinColor}" stroke="white" stroke-width="2"/>`;
    const fontSize = orderNumber > 9 ? size * 0.22 : size * 0.28;
    svgContent += `<text x="${headCx}" y="${headCy + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="white" style="pointer-events:none">${orderNumber}</text>`;
  } else if (users.length === 1) {
    svgContent += `<circle cx="${headCx}" cy="${headCy}" r="${headRadius}" fill="${users[0].color}" stroke="white" stroke-width="2"/>`;
  } else {
    svgContent += `<circle cx="${headCx}" cy="${headCy}" r="${headRadius + 1}" fill="white"/>`;
    
    displayUsers.forEach((user, index) => {
      const startAngle = index * anglePerSector;
      const endAngle = startAngle + anglePerSector;
      const path = describePieSlice(headCx, headCy, headRadius, startAngle, endAngle);
      svgContent += `<path d="${path}" fill="${user.color}"/>`;
    });
    
    if (hasOthers) {
      const othersPath = describePieSlice(headCx, headCy, headRadius, displayUsers.length * anglePerSector, 360);
      svgContent += `<path d="${othersPath}" fill="#9ca3af"/>`;
    }
    
    svgContent += `<circle cx="${headCx}" cy="${headCy}" r="${headRadius}" fill="none" stroke="white" stroke-width="2"/>`;
    
    if (hasOthers) {
      svgContent += `<text x="${headCx}" y="${headCy + 3}" text-anchor="middle" font-size="${size * 0.2}" font-weight="bold" fill="white">${users.length}</text>`;
    }
  }
  
  const filter = selected 
    ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.8))' 
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
  const transform = selected ? 'scale(1.15)' : 'scale(1)';
  
  container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: ${filter}; transform: ${transform}; transition: transform 0.2s ease, filter 0.2s ease;">
      ${svgContent}
    </svg>
  `;
  
  if (onClick) {
    container.addEventListener('click', onClick);
  }
  
  return container;
}

export default PinMarker;
