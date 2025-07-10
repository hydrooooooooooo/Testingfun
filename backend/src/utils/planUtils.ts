// This is a mock implementation. Replace with actual plan logic.
export function getPlanDetails(packId: string): { limit: number } {
  console.log(`Getting plan details for packId: ${packId}`);
  // Mock response
  if (packId === 'pro') {
    return { limit: 1000 };
  }
  return { limit: 100 };
}
