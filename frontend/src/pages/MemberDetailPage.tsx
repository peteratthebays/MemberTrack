import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMember,
  updateMember,
  deleteMember,
} from "@/services/memberService";
import {
  getMemberMemberships,
  createMembership,
} from "@/services/membershipService";
import type { Member, UpdateMember } from "@/types/member";
import type { Membership, CreateMembership } from "@/types/membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Rev"];
const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const MEMBERSHIP_TYPES = ["Single", "Couple", "Family"];
const PAY_TYPES = ["Auto", "Annual", "NotApplicable"];
const MEMBERSHIP_STATUSES = ["Active", "NonActive"];
const MEMBER_RIGHTS = ["Paid", "Associate", "VotingRights"];
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
const MEMBERSHIP_ROLES = ["Primary", "Secondary", "Dependent"];

const NONE_VALUE = "__none__";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.substring(0, 10);
}

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState<UpdateMember>({
    donmanId: null,
    firstName: "",
    surname: "",
    title: null,
    email: null,
    mobile: null,
    mailchimpName: null,
    addressStreet: null,
    addressSuburb: null,
    addressState: null,
    addressPostcode: null,
    notes: null,
    updateEpas: null,
  });

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add membership dialog
  const [addMembershipOpen, setAddMembershipOpen] = useState(false);
  const [creatingMembership, setCreatingMembership] = useState(false);
  const [newMembership, setNewMembership] = useState<CreateMembership>({
    type: "Single",
    payType: "Annual",
    status: "Active",
    rights: "Paid",
    category: "Community",
    renewalStatus: "New",
    startDate: new Date().toISOString().substring(0, 10),
    endDate: null,
    dateLastPaid: null,
    members: [],
  });

  useEffect(() => {
    if (!id) return;
    const memberId = parseInt(id, 10);
    if (isNaN(memberId)) {
      setError("Invalid member ID");
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [memberData, membershipsData] = await Promise.all([
          getMember(memberId),
          getMemberMemberships(memberId),
        ]);
        setMember(memberData);
        setMemberships(membershipsData);
        setForm({
          donmanId: memberData.donmanId,
          firstName: memberData.firstName,
          surname: memberData.surname,
          title: memberData.title,
          email: memberData.email,
          mobile: memberData.mobile,
          mailchimpName: memberData.mailchimpName,
          addressStreet: memberData.addressStreet,
          addressSuburb: memberData.addressSuburb,
          addressState: memberData.addressState,
          addressPostcode: memberData.addressPostcode,
          notes: memberData.notes,
          updateEpas: memberData.updateEpas,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load member"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  function updateForm(field: keyof UpdateMember, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  }

  async function handleSave() {
    if (!id) return;
    const memberId = parseInt(id, 10);
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const updatedMember = await updateMember(memberId, form);
      setMember(updatedMember);
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save member");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    const memberId = parseInt(id, 10);
    setDeleting(true);
    try {
      await deleteMember(memberId);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete member"
      );
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  async function handleCreateMembership() {
    if (!id) return;
    const memberId = parseInt(id, 10);
    setCreatingMembership(true);
    try {
      const payload: CreateMembership = {
        ...newMembership,
        startDate: newMembership.startDate,
        endDate: newMembership.endDate || null,
        dateLastPaid: newMembership.dateLastPaid || null,
        members: [{ memberId, role: "Primary" }],
      };
      await createMembership(payload);
      const updatedMemberships = await getMemberMemberships(memberId);
      setMemberships(updatedMemberships);
      setAddMembershipOpen(false);
      setNewMembership({
        type: "Single",
        payType: "Annual",
        status: "Active",
        rights: "Paid",
        category: "Community",
        renewalStatus: "New",
        startDate: new Date().toISOString().substring(0, 10),
        endDate: null,
        dateLastPaid: null,
        members: [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create membership"
      );
    } finally {
      setCreatingMembership(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted-foreground">Loading member...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="link"
            className="px-0 text-muted-foreground"
            onClick={() => navigate("/")}
          >
            &larr; Back to Members
          </Button>
          <h1 className="text-2xl font-bold">
            {member.firstName} {member.surname}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Member</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {member.firstName}{" "}
                  {member.surname}? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-md border border-green-500 bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Member saved successfully.
        </div>
      )}

      {/* Member Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Select
                value={form.title || NONE_VALUE}
                onValueChange={(v) =>
                  updateForm("title", v === NONE_VALUE ? null : v)
                }
              >
                <SelectTrigger id="title" className="w-full">
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {TITLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => updateForm("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">Surname</Label>
              <Input
                id="surname"
                value={form.surname}
                onChange={(e) => updateForm("surname", e.target.value)}
              />
            </div>
          </div>

          {/* Contact Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) =>
                  updateForm("email", e.target.value || null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                value={form.mobile ?? ""}
                onChange={(e) =>
                  updateForm("mobile", e.target.value || null)
                }
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Address
            </h3>
            <div className="space-y-2">
              <Label htmlFor="addressStreet">Street</Label>
              <Input
                id="addressStreet"
                value={form.addressStreet ?? ""}
                onChange={(e) =>
                  updateForm("addressStreet", e.target.value || null)
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="addressSuburb">Suburb</Label>
                <Input
                  id="addressSuburb"
                  value={form.addressSuburb ?? ""}
                  onChange={(e) =>
                    updateForm("addressSuburb", e.target.value || null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressState">State</Label>
                <Select
                  value={form.addressState || NONE_VALUE}
                  onValueChange={(v) =>
                    updateForm("addressState", v === NONE_VALUE ? null : v)
                  }
                >
                  <SelectTrigger id="addressState" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressPostcode">Postcode</Label>
                <Input
                  id="addressPostcode"
                  value={form.addressPostcode ?? ""}
                  onChange={(e) =>
                    updateForm("addressPostcode", e.target.value || null)
                  }
                />
              </div>
            </div>
          </div>

          {/* Other Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mailchimpName">Mailchimp Name</Label>
              <Input
                id="mailchimpName"
                value={form.mailchimpName ?? ""}
                onChange={(e) =>
                  updateForm("mailchimpName", e.target.value || null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateEpas">Update EPAS</Label>
              <Input
                id="updateEpas"
                value={form.updateEpas ?? ""}
                onChange={(e) =>
                  updateForm("updateEpas", e.target.value || null)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donmanId">Donman ID</Label>
            <Input
              id="donmanId"
              value={member.donmanId ?? ""}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) =>
                updateForm("notes", e.target.value || null)
              }
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Membership History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Membership History</CardTitle>
            <Dialog
              open={addMembershipOpen}
              onOpenChange={setAddMembershipOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Add Membership
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Membership</DialogTitle>
                  <DialogDescription>
                    Create a new membership for {member.firstName}{" "}
                    {member.surname}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newMembership.type}
                        onValueChange={(v) =>
                          setNewMembership((prev) => ({ ...prev, type: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMBERSHIP_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pay Type</Label>
                      <Select
                        value={newMembership.payType}
                        onValueChange={(v) =>
                          setNewMembership((prev) => ({ ...prev, payType: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAY_TYPES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={newMembership.status}
                        onValueChange={(v) =>
                          setNewMembership((prev) => ({ ...prev, status: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMBERSHIP_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rights</Label>
                      <Select
                        value={newMembership.rights}
                        onValueChange={(v) =>
                          setNewMembership((prev) => ({ ...prev, rights: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMBER_RIGHTS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={newMembership.category}
                        onValueChange={(v) =>
                          setNewMembership((prev) => ({
                            ...prev,
                            category: v,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMBER_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Renewal Status</Label>
                      <Select
                        value={newMembership.renewalStatus}
                        onValueChange={(v) =>
                          setNewMembership((prev) => ({
                            ...prev,
                            renewalStatus: v,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RENEWAL_STATUSES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={newMembership.startDate}
                        onChange={(e) =>
                          setNewMembership((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={newMembership.endDate ?? ""}
                        onChange={(e) =>
                          setNewMembership((prev) => ({
                            ...prev,
                            endDate: e.target.value || null,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date Last Paid</Label>
                      <Input
                        type="date"
                        value={newMembership.dateLastPaid ?? ""}
                        onChange={(e) =>
                          setNewMembership((prev) => ({
                            ...prev,
                            dateLastPaid: e.target.value || null,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddMembershipOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateMembership}
                    disabled={creatingMembership}
                  >
                    {creatingMembership ? "Creating..." : "Create Membership"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No memberships found for this member.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rights</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Date Last Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((ms) => (
                    <TableRow key={ms.id}>
                      <TableCell className="font-medium">{ms.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ms.status === "Active" ? "default" : "secondary"
                          }
                        >
                          {ms.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ms.category}</Badge>
                      </TableCell>
                      <TableCell>{ms.rights}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ms.renewalStatus === "Renewed" ||
                            ms.renewalStatus === "New"
                              ? "default"
                              : ms.renewalStatus === "Overdue" ||
                                  ms.renewalStatus === "NotRenewing"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {ms.renewalStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(ms.startDate)}</TableCell>
                      <TableCell>{formatDate(ms.endDate)}</TableCell>
                      <TableCell>{formatDate(ms.dateLastPaid)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
