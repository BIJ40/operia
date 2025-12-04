/**
 * Utilitaires pour la génération de mots de passe sécurisés
 */

/**
 * Génère un mot de passe sécurisé de 20 caractères
 * Utilise crypto.getRandomValues() pour une vraie aléatoire cryptographique
 * Évite les mots de passe prévisibles qui seraient dans les bases "pwned"
 */
export function generateSecurePassword(): string {
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Exclus i, l, o pour lisibilité
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // Exclus I, L, O pour lisibilité
  const numbers = '23456789'; // Exclus 0, 1 pour lisibilité
  const symbols = '!@#$%&*_+-=';

  const getSecureRandomChars = (charset: string, length: number): string => {
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(array[i] % charset.length);
    }
    return result;
  };

  // Générer les parties du mot de passe (20 caractères total)
  const parts = [
    getSecureRandomChars(lowercase, 5),
    getSecureRandomChars(uppercase, 5),
    getSecureRandomChars(numbers, 5),
    getSecureRandomChars(symbols, 5),
  ];

  // Mélanger les caractères avec crypto aléatoire
  const combined = parts.join('').split('');
  const shuffleArray = new Uint32Array(combined.length);
  crypto.getRandomValues(shuffleArray);
  
  for (let i = combined.length - 1; i > 0; i--) {
    const j = shuffleArray[i] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}
