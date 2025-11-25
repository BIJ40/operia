/**
 * Utilitaires de formatage conformes aux exigences
 */

/**
 * Formater un montant en euros avec séparateur de milliers français
 * OBLIGATOIRE : toujours utiliser cette fonction, jamais de "k"
 * 
 * @param amount - Montant à formater
 * @returns Montant formaté en euros (ex: "1 235 €")
 */
export function formatEuros(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 €';
  }
  
  const rounded = Math.round(amount);
  return rounded.toLocaleString('fr-FR') + ' €';
}

/**
 * Formater un pourcentage avec 1 décimale
 * 
 * @param value - Valeur du pourcentage
 * @returns Pourcentage formaté (ex: "12.5%")
 */
export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  
  return value.toFixed(1) + '%';
}

/**
 * Formater une date en français
 * 
 * @param date - Date à formater (string ISO ou Date)
 * @returns Date formatée (ex: "25/11/2025")
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR');
  } catch {
    return 'N/A';
  }
}

/**
 * Formater une date avec heure en français
 * 
 * @param date - Date à formater (string ISO ou Date)
 * @returns Date et heure formatées (ex: "25/11/2025 14:30")
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'N/A';
  }
}

/**
 * Obtenir les initiales d'un nom complet
 * 
 * @param fullName - Nom complet
 * @returns Initiales (ex: "JD" pour "John Doe")
 */
export function getInitials(fullName: string): string {
  if (!fullName) return '?';
  
  return fullName
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
