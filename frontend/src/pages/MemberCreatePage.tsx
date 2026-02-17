import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMember } from "@/services/memberService";
import type { CreateMember } from "@/types/member";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Rev"];

const NONE_VALUE = "__none__";

export function MemberCreatePage() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateMember>({
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

  function updateForm(field: keyof CreateMember, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.surname.trim()) {
      setError("First name and surname are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const newMember = await createMember(form);
      navigate(`/members/${newMember.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create member"
      );
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-bold">New Member</h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
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
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => updateForm("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">
                Surname <span className="text-destructive">*</span>
              </Label>
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
          <AddressAutocomplete
            street={form.addressStreet}
            suburb={form.addressSuburb}
            state={form.addressState}
            postcode={form.addressPostcode}
            onFieldChange={updateForm}
          />

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
              type="number"
              value={form.donmanId ?? ""}
              onChange={(e) =>
                updateForm(
                  "donmanId",
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
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

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Creating..." : "Create Member"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
