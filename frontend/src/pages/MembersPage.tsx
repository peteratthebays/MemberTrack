import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMembers } from "@/services/memberService";
import { bulkUpdateMembershipStatus } from "@/services/bulkService";
import { useLookups } from "@/hooks/useLookups";
import { type MemberListItem, type PagedResult } from "@/types/member";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__all__";
const NONE_VALUE = "__none__";

function statusBadgeVariant(
  status: string | null
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  switch (status) {
    case "Active":
      return "default";
    case "NonActive":
      return "secondary";
    default:
      return "outline";
  }
}

function renewalBadgeVariant(
  status: string | null
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  switch (status) {
    case "Renewed":
    case "New":
      return "default";
    case "ToRenew":
      return "secondary";
    case "Overdue":
    case "NotRenewing":
      return "destructive";
    default:
      return "outline";
  }
}

export function MembersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lookups = useLookups();
  const membershipStatuses = lookups?.membershipStatuses ?? [];
  const memberCategories = lookups?.memberCategories ?? [];
  const renewalStatuses = lookups?.renewalStatuses ?? [];

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const renewalStatus = searchParams.get("renewalStatus") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const [data, setData] = useState<PagedResult<MemberListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>(NONE_VALUE);
  const [bulkRenewalStatus, setBulkRenewalStatus] = useState<string>(NONE_VALUE);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMembers({
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
        renewalStatus: renewalStatus || undefined,
        page,
        pageSize: 20,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [search, status, category, renewalStatus, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set());
    setBulkStatus(NONE_VALUE);
    setBulkRenewalStatus(NONE_VALUE);
    setBulkError(null);
  }, [search, status, category, renewalStatus, page]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") {
      params.delete("page");
    }
    setSearchParams(params);
  }

  function goToPage(newPage: number) {
    updateParam("page", newPage > 1 ? String(newPage) : "");
  }

  function toggleSelectAll() {
    if (!data) return;
    const allIds = data.items.map((m) => m.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkStatus(NONE_VALUE);
    setBulkRenewalStatus(NONE_VALUE);
    setBulkError(null);
  }

  async function applyBulkUpdate() {
    if (selectedIds.size === 0) return;

    const statusValue = bulkStatus !== NONE_VALUE ? bulkStatus : undefined;
    const renewalValue = bulkRenewalStatus !== NONE_VALUE ? bulkRenewalStatus : undefined;

    if (!statusValue && !renewalValue) {
      setBulkError("Please select at least a status or renewal status to apply.");
      return;
    }

    setBulkApplying(true);
    setBulkError(null);
    try {
      await bulkUpdateMembershipStatus({
        memberIds: Array.from(selectedIds),
        status: statusValue,
        renewalStatus: renewalValue,
      });
      clearSelection();
      await fetchMembers();
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : "Failed to apply bulk update"
      );
    } finally {
      setBulkApplying(false);
    }
  }

  const allOnPageSelected =
    data !== null &&
    data.items.length > 0 &&
    data.items.every((m) => selectedIds.has(m.id));

  const someOnPageSelected =
    data !== null &&
    data.items.some((m) => selectedIds.has(m.id)) &&
    !allOnPageSelected;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button onClick={() => navigate("/members/new")}>New Member</Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => updateParam("search", e.target.value)}
          />
        </div>

        <Select
          value={status || ALL_VALUE}
          onValueChange={(v) => updateParam("status", v === ALL_VALUE ? "" : v)}
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
          value={category || ALL_VALUE}
          onValueChange={(v) =>
            updateParam("category", v === ALL_VALUE ? "" : v)
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
          value={renewalStatus || ALL_VALUE}
          onValueChange={(v) =>
            updateParam("renewalStatus", v === ALL_VALUE ? "" : v)
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

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all members on this page"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Renewal Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <span className="text-muted-foreground">
                    Loading members...
                  </span>
                </TableCell>
              </TableRow>
            ) : data && data.items.length > 0 ? (
              data.items.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer"
                  data-selected={selectedIds.has(member.id) || undefined}
                >
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="w-[40px]"
                  >
                    <Checkbox
                      checked={selectedIds.has(member.id)}
                      onCheckedChange={() => toggleSelect(member.id)}
                      aria-label={`Select ${member.firstName} ${member.surname}`}
                    />
                  </TableCell>
                  <TableCell
                    className="font-medium"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    {member.firstName} {member.surname}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    {member.email ?? "-"}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    {member.mobile ?? "-"}
                  </TableCell>
                  <TableCell
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <Badge
                      variant={statusBadgeVariant(
                        member.currentMembershipStatus
                      )}
                    >
                      {member.currentMembershipStatus ?? "None"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <Badge variant="outline">
                      {member.currentCategory ?? "None"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <Badge
                      variant={renewalBadgeVariant(
                        member.currentRenewalStatus
                      )}
                    >
                      {member.currentRenewalStatus ?? "None"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <span className="text-muted-foreground">
                    No members found.
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.totalCount} total
            members)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-3">
            {bulkError && (
              <div className="mb-2 rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
                {bulkError}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium">
                {selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""} selected
              </span>

              <Select
                value={bulkStatus}
                onValueChange={setBulkStatus}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Set Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>-- Set Status --</SelectItem>
                  {membershipStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={bulkRenewalStatus}
                onValueChange={setBulkRenewalStatus}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Set Renewal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>-- Set Renewal --</SelectItem>
                  {renewalStatuses.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={applyBulkUpdate}
                disabled={bulkApplying}
              >
                {bulkApplying ? "Applying..." : "Apply"}
              </Button>

              <Button
                variant="outline"
                onClick={clearSelection}
                disabled={bulkApplying}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
