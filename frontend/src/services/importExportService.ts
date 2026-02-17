import type { ImportResult } from '@/types/importExport';

const API_BASE = import.meta.env.VITE_API_URL;

export async function importCsv(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/import/csv`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return response.json();
}

export interface ExportCsvParams {
  search?: string;
  status?: string;
  category?: string;
  renewalStatus?: string;
}

export async function exportCsv(params?: ExportCsvParams): Promise<void> {
  const url = new URL(`${API_BASE}/api/export/csv`);

  if (params) {
    if (params.search) url.searchParams.set('search', params.search);
    if (params.status) url.searchParams.set('status', params.status);
    if (params.category) url.searchParams.set('category', params.category);
    if (params.renewalStatus) url.searchParams.set('renewalStatus', params.renewalStatus);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = 'members-export.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
