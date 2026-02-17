import { useCallback, useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export interface AddressFields {
  addressStreet: string | null;
  addressSuburb: string | null;
  addressState: string | null;
  addressPostcode: string | null;
}

export interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface UseGooglePlacesReturn {
  isAvailable: boolean;
  predictions: Prediction[];
  isLoading: boolean;
  fetchPredictions: (input: string) => void;
  clearPredictions: () => void;
  selectPlace: (placeId: string) => Promise<AddressFields>;
}

const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined;

let loaderPromise: Promise<typeof google.maps> | null = null;

function getLoaderPromise(): Promise<typeof google.maps> {
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: apiKey!,
      libraries: ["places"],
    });
    loaderPromise = loader.load();
  }
  return loaderPromise;
}

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined
): AddressFields {
  const map = new Map<string, google.maps.GeocoderAddressComponent>();
  for (const component of components ?? []) {
    for (const type of component.types) {
      map.set(type, component);
    }
  }

  const streetNumber = map.get("street_number")?.long_name ?? "";
  const route = map.get("route")?.long_name ?? "";
  const street = [streetNumber, route].filter(Boolean).join(" ") || null;

  const suburb =
    map.get("locality")?.long_name ??
    map.get("sublocality_level_1")?.long_name ??
    null;

  const state =
    map.get("administrative_area_level_1")?.short_name ?? null;

  const postcode = map.get("postal_code")?.long_name ?? null;

  return {
    addressStreet: street,
    addressSuburb: suburb,
    addressState: state,
    addressPostcode: postcode,
  };
}

export function useGooglePlaces(): UseGooglePlacesReturn {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef =
    useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const isAvailable = !!apiKey;

  useEffect(() => {
    if (!apiKey) return;

    getLoaderPromise()
      .then(() => {
        autocompleteServiceRef.current =
          new google.maps.places.AutocompleteService();
        const div = document.createElement("div");
        placesServiceRef.current = new google.maps.places.PlacesService(div);
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
        setApiLoaded(true);
      })
      .catch((err) => {
        console.warn("Failed to load Google Places API:", err);
      });
  }, []);

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!apiLoaded || !autocompleteServiceRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (input.length < 3) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        autocompleteServiceRef.current!.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: "au" },
            types: ["address"],
            sessionToken: sessionTokenRef.current!,
          },
          (results, status) => {
            setIsLoading(false);
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              results
            ) {
              setPredictions(
                results.map((r) => ({
                  placeId: r.place_id,
                  description: r.description,
                  mainText: r.structured_formatting.main_text,
                  secondaryText: r.structured_formatting.secondary_text,
                }))
              );
            } else {
              setPredictions([]);
            }
          }
        );
      }, 300);
    },
    [apiLoaded]
  );

  const clearPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  const selectPlace = useCallback(
    (placeId: string): Promise<AddressFields> => {
      return new Promise((resolve) => {
        if (!placesServiceRef.current) {
          resolve({
            addressStreet: null,
            addressSuburb: null,
            addressState: null,
            addressPostcode: null,
          });
          return;
        }

        placesServiceRef.current.getDetails(
          {
            placeId,
            fields: ["address_components"],
            sessionToken: sessionTokenRef.current!,
          },
          (place, status) => {
            // Create a new session token after place selection (per Google billing best practice)
            sessionTokenRef.current =
              new google.maps.places.AutocompleteSessionToken();

            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              place
            ) {
              resolve(parseAddressComponents(place.address_components));
            } else {
              resolve({
                addressStreet: null,
                addressSuburb: null,
                addressState: null,
                addressPostcode: null,
              });
            }
          }
        );
      });
    },
    []
  );

  return {
    isAvailable,
    predictions,
    isLoading,
    fetchPredictions,
    clearPredictions,
    selectPlace,
  };
}
