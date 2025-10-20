export interface CompanyRequirement {
  id: number;
  name: string;
  minimumAge: number;
  requiredNationalityId: number;
  minimumSalary: number;
}

export interface StoredProfile {
  name: string;
  birthYearHandle: string;
  nationalityHandle: string;
  salaryHandle: string;
  exists: boolean;
}
