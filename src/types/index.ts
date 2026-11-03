export type WoodSource = 'Pallet' | 'Cut-off' | 'Furniture Teardown' | 'Salvage';
export type DefectType = 'Screw holes' | 'Nail holes' | 'Loose knots' | 'Hairline checks' | 'Discoloration' | 'Waney edges' | 'Live edge';

export interface Dimensions {
  length: number;
  width: number;
  thickness: number;
}

export interface Board {
  id: string;
  tagId: string;
  species: string;
  source: WoodSource;
  location: string;
  dimensions: Dimensions;
  defects: DefectType[];
  volume: number;
  value: number;
  acquiredDate: string;
  notes?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  requiredSpecies: string[];
  minDimensions: Dimensions;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface Alert {
  id: string;
  type: 'idle' | 'defect' | 'stock';
  message: string;
  boardId?: string;
  resolved: boolean;
  createdAt: string;
}

export interface InventoryStats {
  totalBoards: number;
  totalVolume: number;
  replacementValue: number;
  idleStock: number;
  activeProjects: number;
  recentAdditions: number;
}
