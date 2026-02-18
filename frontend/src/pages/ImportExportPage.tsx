import { useRef, useState } from "react";
import {
  validateCsv,
  executeCsvImport,
  exportCsv,
} from "@/services/importExportService";
import { useLookups } from "@/hooks/useLookups";
import type {
  ValidationResult,
  ImportResult,
  ImportProgress,
} from "@/types/importExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

const ALL_VALUE = "__all__";

type ImportPhase = "idle" | "validating" | "validated" | "importing" | "complete";

export function ImportExportPage() {
  const lookups = useLookups();
  const membershipStatuses = lookups?.membershipStatuses ?? [];
  const memberCategories = lookups?.memberCategories ?? [];
  const renewalStatuses = lookups?.renewalStatuses ?? [];

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Export state
  const [exportSearch, setExportSearch] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exportCategory, setExportCategory] = useState("");
  const [exportRenewalStatus, setExportRenewalStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPhase("idle");
    setValidationResult(null);
    setImportResult(null);
    setProgress(null);
    setError(null);
  }

  async function handleValidate() {
    if (!selectedFile) return;
    setPhase("validating");
    setError(null);
    setValidationResult(null);
    setImportResult(null);
    setProgress(null);

    try {
      const result = await validateCsv(selectedFile);
      setValidationResult(result);
      setPhase("validated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
      setPhase("idle");
    }
  }

  async function handleImport() {
    if (!selectedFile || !validationResult) return;
    setPhase("importing");
    setError(null);
    setProgress({ processed: 0, total: validationResult.validCount });

    try {
      await executeCsvImport(
        selectedFile,
        (p) => setProgress(p),
        (result) => {
          setImportResult(result);
          setPhase("complete");
        },
        (message) => {
          setError(message);
          setPhase("validated");
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setPhase("validated");
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setPhase("idle");
    setValidationResult(null);
    setImportResult(null);
    setProgress(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);

    try {
      await exportCsv({
        search: exportSearch || undefined,
        status: exportStatus || undefined,
        category: exportCategory || undefined,
        renewalStatus: exportRenewalStatus || undefined,
      });
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Failed to export CSV"
      );
    } finally {
      setExporting(false);
    }
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

  const hasValidationErrors =
    validationResult !== null && validationResult.errorCount > 0;
  const canImport =
    phase === "validated" && validationResult !== null && !hasValidationErrors && validationResult.validCount > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Import / Export</h1>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File input row */}
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv"
              onChange={handleFileChange}
              className="max-w-sm"
              disabled={phase === "validating" || phase === "importing"}
            />
            {phase === "idle" && (
              <Button onClick={handleValidate} disabled={!selectedFile}>
                Validate
              </Button>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Validating spinner */}
          {phase === "validating" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating file...
            </div>
          )}

          {/* Validation results */}
          {phase === "validated" && validationResult && (
            <div className="space-y-4">
              {/* Summary */}
              {hasValidationErrors ? (
                <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm space-y-1">
                  <p className="font-medium text-destructive">
                    {validationResult.errorCount} row
                    {validationResult.errorCount !== 1 ? "s" : ""} with
                    validation errors. Please fix your CSV file and re-upload.
                  </p>
                  <p className="text-muted-foreground">
                    {validationResult.totalRows} total rows:{" "}
                    {validationResult.validCount} valid,{" "}
                    {validationResult.errorCount} with errors
                    {validationResult.skippedCount > 0 &&
                      `, ${validationResult.skippedCount} duplicates skipped`}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-green-500 bg-green-500/10 p-4 text-sm space-y-1">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    All {validationResult.validCount} row
                    {validationResult.validCount !== 1 ? "s" : ""} validated
                    successfully.
                  </p>
                  {validationResult.skippedCount > 0 && (
                    <p className="text-muted-foreground">
                      {validationResult.skippedCount} duplicate
                      {validationResult.skippedCount !== 1 ? "s" : ""} will be
                      skipped.
                    </p>
                  )}
                </div>
              )}

              {/* Validation error table */}
              {hasValidationErrors && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {validationResult.errors.length} Error
                      {validationResult.errors.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="rounded-md border border-destructive/50 overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead className="w-24">DonmanId</TableHead>
                          <TableHead className="w-40">Name</TableHead>
                          <TableHead className="w-32">Field</TableHead>
                          <TableHead className="w-40">Value</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult.errors.map((err, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{err.row}</TableCell>
                            <TableCell>{err.donmanId ?? "\u2014"}</TableCell>
                            <TableCell>{err.name ?? "\u2014"}</TableCell>
                            <TableCell className="font-medium">
                              {err.field}
                            </TableCell>
                            <TableCell className="text-destructive font-mono text-xs">
                              {err.value}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {err.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Skipped duplicates */}
              {validationResult.skipped.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500"
                    >
                      {validationResult.skipped.length} Skipped
                    </Badge>
                  </div>
                  <div className="rounded-md border border-yellow-500/50">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DonmanId</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult.skipped.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.donmanId}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Import button — only if validation passed */}
              <div className="flex items-center gap-4">
                {canImport && (
                  <Button onClick={handleImport}>
                    Import {validationResult.validCount} member
                    {validationResult.validCount !== 1 ? "s" : ""}
                  </Button>
                )}
                <Button variant="outline" onClick={handleReset}>
                  {hasValidationErrors ? "Upload corrected file" : "Cancel"}
                </Button>
              </div>
            </div>
          )}

          {/* Importing — progress bar */}
          {phase === "importing" && progress && (
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-3" />
              <p className="text-sm text-muted-foreground">
                Importing... {progress.processed} of {progress.total} rows (
                {progressPercent}%)
              </p>
            </div>
          )}

          {/* Import complete */}
          {phase === "complete" && importResult && (
            <div className="space-y-4">
              <div className="rounded-md border border-green-500 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
                {importResult.imported} member
                {importResult.imported !== 1 ? "s" : ""} imported successfully.
              </div>

              {importResult.skipped.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500"
                    >
                      {importResult.skipped.length} Skipped
                    </Badge>
                  </div>
                  <div className="rounded-md border border-yellow-500/50">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DonmanId</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.skipped.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.donmanId}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleReset}>
                Import another file
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Export CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name or email..."
                value={exportSearch}
                onChange={(e) => setExportSearch(e.target.value)}
              />
            </div>

            <Select
              value={exportStatus || ALL_VALUE}
              onValueChange={(v) =>
                setExportStatus(v === ALL_VALUE ? "" : v)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
                {membershipStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={exportCategory || ALL_VALUE}
              onValueChange={(v) =>
                setExportCategory(v === ALL_VALUE ? "" : v)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Categories</SelectItem>
                {memberCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={exportRenewalStatus || ALL_VALUE}
              onValueChange={(v) =>
                setExportRenewalStatus(v === ALL_VALUE ? "" : v)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Renewal Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Renewal Statuses</SelectItem>
                {renewalStatuses.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>

          {exportError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {exportError}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
