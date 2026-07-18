// Unit conversions. The DB stores metric (cm, kg); the UI shows US units
// (feet/inches, pounds) since the app's audience uses the US system.

export function cmToFeetInches(cm: number | null | undefined): { ft: number; inch: number } {
  if (!cm) return { ft: 0, inch: 0 };
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches - ft * 12);
  // handle rounding to 12"
  if (inch === 12) return { ft: ft + 1, inch: 0 };
  return { ft, inch };
}

export function feetInchesToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54 * 10) / 10;
}

export function kgToLbs(kg: number | null | undefined): number {
  if (!kg) return 0;
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

export function formatHeightUS(cm: number | null | undefined): string {
  if (!cm) return "—";
  const { ft, inch } = cmToFeetInches(cm);
  return `${ft}'${inch}"`;
}

export function formatWeightUS(kg: number | null | undefined): string {
  if (!kg) return "—";
  return `${kgToLbs(kg)} lb`;
}
