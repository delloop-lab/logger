import { Dimensions } from '@/types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function calculateVolume(dims: Dimensions): number {
  return (dims.length * dims.width * dims.thickness) / 1_000_000_000;
}

export function calculateReplacementValue(species: string, volume: number): number {
  const baseRates: Record<string, number> = {
    'European Oak': 1500,
    'Walnut': 2500,
    'Pine/Pallet': 300,
    'Birch Plywood': 800,
    'Mahogany': 2200,
  };
  const rate = baseRates[species] || 500;
  return Math.round(volume * rate * 100) / 100;
}

export function isIdleStock(acquiredDate: string): boolean {
  const acquired = new Date(acquiredDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - acquired.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 365;
}
