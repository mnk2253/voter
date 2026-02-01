
export type Gender = 'পুরুষ' | 'মহিলা' | 'অন্যান্য';

export interface Voter {
  id: string;
  name: string;
  fatherName: string;
  motherName: string;
  age: number;
  gender: Gender;
  nid: string;
  ward: string;
  address: string;
}

export interface VillageStats {
  totalVoters: number;
  maleVoters: number;
  femaleVoters: number;
  otherVoters: number;
  wardDistribution: Record<string, number>;
  ageGroups: {
    young: number; // 18-30
    middle: number; // 31-50
    senior: number; // 51+
  };
}
