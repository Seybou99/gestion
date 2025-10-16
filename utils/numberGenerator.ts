/**
 * Utilitaire pour générer des numéros automatiques
 * pour les entrées de stock, ajustements, factures, etc.
 */

/**
 * Génère un numéro d'entrée de stock
 * Format: ENT-2025-0001
 */
export const generateEntryNumber = (lastNumber?: string): string => {
  const year = new Date().getFullYear();
  const prefix = `ENT-${year}-`;
  
  if (!lastNumber || !lastNumber.startsWith(prefix)) {
    return `${prefix}0001`;
  }
  
  const lastNum = parseInt(lastNumber.split('-')[2]);
  const nextNum = (lastNum + 1).toString().padStart(4, '0');
  
  return `${prefix}${nextNum}`;
};

/**
 * Génère un numéro d'ajustement de stock
 * Format: ADJ-2025-0001
 */
export const generateAdjustmentNumber = (lastNumber?: string): string => {
  const year = new Date().getFullYear();
  const prefix = `ADJ-${year}-`;
  
  if (!lastNumber || !lastNumber.startsWith(prefix)) {
    return `${prefix}0001`;
  }
  
  const lastNum = parseInt(lastNumber.split('-')[2]);
  const nextNum = (lastNum + 1).toString().padStart(4, '0');
  
  return `${prefix}${nextNum}`;
};

/**
 * Génère un numéro de mouvement de stock
 * Format: MOV-2025-0001
 */
export const generateMovementNumber = (lastNumber?: string): string => {
  const year = new Date().getFullYear();
  const prefix = `MOV-${year}-`;
  
  if (!lastNumber || !lastNumber.startsWith(prefix)) {
    return `${prefix}0001`;
  }
  
  const lastNum = parseInt(lastNumber.split('-')[2]);
  const nextNum = (lastNum + 1).toString().padStart(4, '0');
  
  return `${prefix}${nextNum}`;
};

/**
 * Génère un numéro de facture
 * Format: FAC-2025-0001
 */
export const generateInvoiceNumber = (lastNumber?: string): string => {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  
  if (!lastNumber || !lastNumber.startsWith(prefix)) {
    return `${prefix}0001`;
  }
  
  const lastNum = parseInt(lastNumber.split('-')[2]);
  const nextNum = (lastNum + 1).toString().padStart(4, '0');
  
  return `${prefix}${nextNum}`;
};

/**
 * Récupère le dernier numéro d'une série
 */
export const getLastNumber = (numbers: string[], prefix: string): string | undefined => {
  const filtered = numbers.filter(n => n.startsWith(prefix));
  if (filtered.length === 0) return undefined;
  
  return filtered.sort().reverse()[0];
};

