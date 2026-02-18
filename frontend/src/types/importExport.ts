export interface ValidationError {
  row: number;
  donmanId: string | null;
  name: string | null;
  field: string;
  value: string;
  message: string;
}

export interface ValidationResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  skippedCount: number;
  skipped: ImportSkipped[];
  errors: ValidationError[];
}

export interface ImportSkipped {
  donmanId: number;
  name: string;
  reason: string;
}

export interface ImportResult {
  imported: number;
  skipped: ImportSkipped[];
}

export interface ImportProgress {
  processed: number;
  total: number;
}
