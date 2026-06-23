'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, MapPin, X, Check, Loader2, Navigation } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface MapPickerProps {
  title?: string;
  initial?: { lat: number; lng: number };
  onConfirm: (location: PickedLocation) => void;
  onClose: () => void;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

let googleLoaded = false;
let loadingPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) { reject(new Error('No Google Maps key')); return; }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=en`;
    script.async = true;
    script.defer = true;
    script.onload = () => { googleLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadingPromise;
}

// ─── Reverse geocode ──────────────────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const geocoder = new (window as any).google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      });
    });
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapPicker({ title = 'Pick Location', initial, onConfirm, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Default center: Karachi, Pakistan
  const defaultCenter = initial ?? { lat: 24.8607, lng: 67.0011 };

  const updatePin = useCallback(async (lat: number, lng: number) => {
    setAddressLoading(true);
    const address = await reverseGeocode(lat, lng);
    setPicked({ lat, lng, address });
    setAddressLoading(false);

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else if (mapInstance.current) {
      markerRef.current = new (window as any).google.maps.Marker({
        position: { lat, lng },
        map: mapInstance.current,
        draggable: true,
        animation: (window as any).google.maps.Animation.DROP,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
              <ellipse cx="20" cy="48" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
              <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32S40 35 40 20C40 9 31 0 20 0z" fill="#1B2B6B"/>
              <circle cx="20" cy="20" r="8" fill="white"/>
            </svg>
          `),
          scaledSize: new (window as any).google.maps.Size(40, 52),
          anchor: new (window as any).google.maps.Point(20, 52),
        },
      });

      // Drag end updates address
      markerRef.current.addListener('dragend', async (e: any) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setAddressLoading(true);
        const addr = await reverseGeocode(newLat, newLng);
        setPicked({ lat: newLat, lng: newLng, address: addr });
        setAddressLoading(false);
      });
    }

    mapInstance.current?.panTo({ lat, lng });
  }, []);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!mapRef.current) return;

        const map = new (window as any).google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: initial ? 16 : 13,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        });

        mapInstance.current = map;

        // Click to drop pin
        map.addListener('click', (e: any) => {
          updatePin(e.latLng.lat(), e.latLng.lng());
        });

        // If initial coords, drop pin immediately
        if (initial) {
          updatePin(initial.lat, initial.lng);
        }

        // Autocomplete on search input
        if (searchRef.current) {
          const autocomplete = new (window as any).google.maps.places.Autocomplete(searchRef.current, {
            fields: ['geometry', 'formatted_address', 'name'],
          });
          autocompleteRef.current = autocomplete;

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              map.setZoom(17);
              updatePin(lat, lng);
              setSearchValue(place.formatted_address ?? place.name ?? '');
            }
          });
        }

        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load Google Maps. Check your API key.');
        setLoading(false);
      });
  }, []);

  function handleMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapInstance.current?.setZoom(17);
        updatePin(lat, lng);
      },
      () => {}
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl mx-4 overflow-hidden flex flex-col" style={{ height: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center">
              <MapPin size={18} className="text-[#1B2B6B]" />
            </div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              ref={searchRef}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Search for a street, area, or landmark…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 focus:border-[#1B2B6B]"
            />
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <Loader2 size={32} className="animate-spin text-[#1B2B6B]" />
                <p className="text-sm">Loading Google Maps…</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <p className="text-sm text-red-500 text-center px-4">{error}</p>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />

          {/* My location button */}
          <button
            onClick={handleMyLocation}
            className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition z-10"
            title="Use my location"
          >
            <Navigation size={18} className="text-[#1B2B6B]" />
          </button>

          {/* Tap hint */}
          {!picked && !loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md z-10">
              <p className="text-xs text-gray-600 font-medium">Tap anywhere on the map to drop a pin</p>
            </div>
          )}
        </div>

        {/* Selected location footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          {picked ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-[#1B2B6B] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    {addressLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-gray-400" />
                        <span className="text-xs text-gray-400">Getting address…</span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-800 truncate">{picked.address}</p>
                    )}
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onConfirm(picked)}
                disabled={addressLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2B6B] text-white text-sm font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-50 shrink-0"
              >
                <Check size={16} /> Confirm
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin size={16} />
              <p className="text-sm">No location selected yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
