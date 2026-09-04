/** Official Llama Cloud credit rate (North America / Europe). */
export const LLAMA_CREDIT_USD_PER_1000 = 1.25;

export function creditsToUsd(credits: number | null | undefined): number {
  if (credits == null || !Number.isFinite(credits) || credits <= 0) return 0;
  return (credits / 1000) * LLAMA_CREDIT_USD_PER_1000;
}
