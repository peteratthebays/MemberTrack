import { useRef, useState } from "react";
import { importCsv, exportCsv } from "@/services/importExportService";
import type { ImportResult } from "@/types/importExport";
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

const MEMBERSHIP_STATUSES = ["Active", "NonActive"];
const MEMBER_CATEGORIES = [
  "Community",
  "Life",
  "Volunteer",
  "ExBoard",
  "Board",
  "Doctor",
  "Family",
  "Staff",
];
const RENEWAL_STATUSES = ["New", "Renewed", "ToRenew", "Overdue", "NotRenewing"];

const ALL_VALUE = "__all__";

export function ImportExportPage() {
  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
    setImportResult(null);
    setImportError(null);
  }

  async function handleImport() {
    if (!selectedFile) return;

    setImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const result = await importCsv(selectedFile);
      setImportResult(result);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import CSV"
      );
    } finally {
      setImporting(false);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Import / Export</h1>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv"
              onChange={handleFileChange}
              className="max-w-sm"
            />
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importing}
            >
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>

          {importing && (
            <div className="text-sm text-muted-foreground">
              Processing file, please wait...
            </div>
          )}

          {importError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {importError}
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              {/* Success count */}
              <div className="rounded-md border border-green-500 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
                {importResult.imported} member{importResult.imported !== 1 ? "s" : ""} imported successfully
              </div>

              {/* Skipped duplicates */}
              {importResult.skipped.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500">
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

              {/* Exceptions */}
              {importResult.exceptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {importResult.exceptions.length} Exception{importResult.exceptions.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="rounded-md border border-destructive/50">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.exceptions.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.row}</TableCell>
                            <TableCell className="text-destructive">
                              {item.error}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                              {item.data}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
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
                {MEMBERSHIP_STATUSES.map((s) => (
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
                {MEMBER_CATEGORIES.map((c) => (
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
                {RENEWAL_STATUSES.map((r) => (
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
