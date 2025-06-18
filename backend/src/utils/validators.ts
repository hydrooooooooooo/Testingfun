/**
 * Utility functions for input validation
 */

/**
 * Validate a marketplace URL (Facebook or LinkedIn)
 */
export const isValidMarketplaceUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Trim the URL and check if it matches the expected pattern
  const trimmedUrl = url.trim();
  
  // Facebook Marketplace URL pattern
  const facebookPattern = /^https:\/\/(www\.)?(facebook|fb)\.com\/marketplace\/(?:item\/)?[\w-]+/i;
  
  // LinkedIn Marketplace URL pattern (hypothetical, adjust as needed)
  const linkedinPattern = /^https:\/\/(www\.)?linkedin\.com\/marketplace\/(?:item\/)?[\w-]+/i;
  
  return facebookPattern.test(trimmedUrl) || linkedinPattern.test(trimmedUrl);
};

/**
 * Validate a session ID
 */
export const isValidSessionId = (sessionId: string): boolean => {
  if (!sessionId) return false;
  
  // Session ID should be a string with a specific format (adjust as needed)
  const sessionIdPattern = /^sess_[a-zA-Z0-9_-]+$/;
  
  return sessionIdPattern.test(sessionId);
};

/**
 * Validate a pack ID
 */
export const isValidPackId = (packId: string): boolean => {
  if (!packId) return false;
  
  // Pack ID should match one of our defined packs
  const validPackIds = [
    'pack-decouverte',
    'pack-essentiel',
    'pack-business',
    'pack-pro',
    'pack-enterprise'
  ];
  
  return validPackIds.includes(packId);
};

/**
 * Generate a random ID with a prefix
 */
export const generateId = (prefix: string = 'id'): string => {
  const randomPart = Math.random().toString(36).substring(2, 8);
  const timestampPart = Date.now().toString().slice(-4);
  
  return `${prefix}_${randomPart}${timestampPart}`;
};

/**
 * Format price for display
 */
export const formatPrice = (price: number, currency: string = 'eur'): string => {
  if (currency === 'eur') {
    return `${price} €`;
  } else if (currency === 'ar') {
    return `${price * 5000} Ar`; // Assuming 1 EUR = 5000 Ariary
  }
  
  return `${price}`;
};
