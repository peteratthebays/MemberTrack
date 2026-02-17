import { useEffect, useState } from "react";
import { getLookups } from "@/services/lookupsService";
import type { Lookups } from "@/types/lookups";

let cachedLookups: Lookups | null = null;
let fetchPromise: Promise<Lookups> | null = null;

export function useLookups() {
  const [lookups, setLookups] = useState<Lookups | null>(cachedLookups);

  useEffect(() => {
    if (cachedLookups) {
      setLookups(cachedLookups);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = getLookups().then((data) => {
        cachedLookups = data;
        return data;
      });
    }

    fetchPromise.then((data) => {
      setLookups(data);
    });
  }, []);

  return lookups;
}
