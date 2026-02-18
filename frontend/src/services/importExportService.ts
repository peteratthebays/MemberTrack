import type {
  ValidationResult,
  ImportResult,
  ImportProgress,
} from "@/types/importExport";

const API_BASE = import.meta.env.VITE_API_URL;

export async function validateCsv(file: File): Promise<ValidationResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/import/validate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API returned ${response.status}`);
  }

  return response.json();
}

export async function executeCsvImport(
  file: File,
  onProgress: (progress: ImportProgress) => void,
  onComplete: (result: ImportResult) => void,
  onError: (message: string) => void
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/import/execute`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (currentEvent === "progress") {
          onProgress(data as ImportProgress);
        } else if (currentEvent === "complete") {
          onComplete(data as ImportResult);
        } else if (currentEvent === "error") {
          onError(data.message);
        }
      }
    }
  }
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
    if (params.search) url.searchParams.set("search", params.search);
    if (params.status) url.searchParams.set("status", params.status);
    if (params.category) url.searchParams.set("category", params.category);
    if (params.renewalStatus)
      url.searchParams.set("renewalStatus", params.renewalStatus);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "members-export.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
