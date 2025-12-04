/**
 * Utilitaires pour la génération de mots de passe sécurisés
 */

/**
 * Génère un mot de passe sécurisé de 18 caractères
 * - 4 lettres minuscules
 * - 4 lettres majuscules
 * - 4 chiffres
 * - 6 symboles
 */
export function generateSecurePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%&*_+-';

  const getRandomChars = (charset: string, length: number): string => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  };

  // Générer les parties du mot de passe
  const parts = [
    getRandomChars(lowercase, 4),
    getRandomChars(uppercase, 4),
    getRandomChars(numbers, 4),
    getRandomChars(symbols, 6),
  ];

  // Mélanger les caractères pour plus de sécurité
  const combined = parts.join('').split('');
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}
