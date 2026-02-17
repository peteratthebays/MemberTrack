import { useState } from "react";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const NONE_VALUE = "__none__";

interface AddressAutocompleteProps {
  street: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  onFieldChange: (
    field: "addressStreet" | "addressSuburb" | "addressState" | "addressPostcode",
    value: string | null
  ) => void;
}

export function AddressAutocomplete({
  street,
  suburb,
  state,
  postcode,
  onFieldChange,
}: AddressAutocompleteProps) {
  const {
    isAvailable,
    predictions,
    fetchPredictions,
    clearPredictions,
    selectPlace,
  } = useGooglePlaces();

  const [showDropdown, setShowDropdown] = useState(false);

  async function handleSelectPlace(placeId: string) {
    const address = await selectPlace(placeId);
    onFieldChange("addressStreet", address.addressStreet);
    onFieldChange("addressSuburb", address.addressSuburb);
    onFieldChange("addressState", address.addressState);
    onFieldChange("addressPostcode", address.addressPostcode);
    clearPredictions();
    setShowDropdown(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Address</h3>

      {/* Street with autocomplete */}
      <div className="relative space-y-2">
        <Label htmlFor="addressStreet">Street</Label>
        <Input
          id="addressStreet"
          value={street ?? ""}
          onChange={(e) => {
            onFieldChange("addressStreet", e.target.value || null);
            if (isAvailable) {
              fetchPredictions(e.target.value);
              setShowDropdown(true);
            }
          }}
          onFocus={() => {
            if (predictions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 200);
          }}
          autoComplete="off"
          placeholder={
            isAvailable ? "Start typing an address..." : undefined
          }
        />
        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <ul className="max-h-60 overflow-y-auto p-1">
              {predictions.map((prediction) => (
                <li
                  key={prediction.placeId}
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectPlace(prediction.placeId)}
                >
                  <div className="font-medium">{prediction.mainText}</div>
                  <div className="text-xs text-muted-foreground">
                    {prediction.secondaryText}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Suburb, State, Postcode */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="addressSuburb">Suburb</Label>
          <Input
            id="addressSuburb"
            value={suburb ?? ""}
            onChange={(e) =>
              onFieldChange("addressSuburb", e.target.value || null)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addressState">State</Label>
          <Select
            value={state || NONE_VALUE}
            onValueChange={(v) =>
              onFieldChange("addressState", v === NONE_VALUE ? null : v)
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
            value={postcode ?? ""}
            onChange={(e) =>
              onFieldChange("addressPostcode", e.target.value || null)
            }
          />
        </div>
      </div>
    </div>
  );
}
