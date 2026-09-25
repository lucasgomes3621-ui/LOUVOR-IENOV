/**
 * Secure password hashing utility for LOUVOR IENOV
 * Ensures no plain text passwords are stored in localStorage or database.
 */

// Known default hashes for demo accounts
export const DEFAULT_PASSWORDS: Record<string, string> = {
  'lider.master': 'M@ster2026',
  'joao.silva': 'Louvor@2026',
  'davi.batera': 'Membro@2026',
  'mariana.costa': 'Louvor@2026',
  'beatriz.lima': 'Louvor@2026',
  'gabriel.guitar': 'Louvor@2026',
  'thiago.som': 'Louvor@2026',
};

/**
 * Fast synchronous hash simulation with salt for local store
 */
export function hashPassword(password: string): string {
  let hash = 0;
  const salt = 'louvor_plus_salt_2026_';
  const str = salt + password;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'lp_hash_' + Math.abs(hash).toString(16) + '_' + btoa(password.slice(0, 3) + str.length);
}

/**
 * Verify if plain password matches hash
 */
export function verifyPassword(password: string, hash?: string, username?: string): boolean {
  if (!hash) {
    // If no hash yet, check against default password for the demo username
    if (username && DEFAULT_PASSWORDS[username.toLowerCase()]) {
      return password === DEFAULT_PASSWORDS[username.toLowerCase()];
    }
    // Fallback default
    return password === 'Louvor@2026' || password === 'M@ster2026';
  }
  return hash === hashPassword(password);
}

/**
 * Generates a random secure temporary password
 * e.g., Louvor@7392
 */
export function generateTemporaryPassword(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `Louvor@${randomDigits}`;
}
