export interface ImportResult {
  imported: number;
  skipped: ImportSkipped[];
  exceptions: ImportException[];
}

export interface ImportSkipped {
  donmanId: number;
  name: string;
  reason: string;
}

export interface ImportException {
  row: number;
  data: string;
  error: string;
}
