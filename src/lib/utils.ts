import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "dd MMM yyyy") {
  return format(new Date(date), fmt);
}

export function formatTime(date: string | Date) {
  return format(new Date(date), "hh:mm a");
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatSpeed(kmh: number) {
  return `${Math.round(kmh)} km/h`;
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    active: "bg-sv-green-light text-sv-green",
    idle: "bg-gray-100 text-gray-600",
    delayed: "bg-sv-red-light text-sv-red",
    maintenance: "bg-sv-orange-light text-sv-orange",
    picked: "bg-sv-green-light text-sv-green",
    dropped: "bg-sv-teal-light text-sv-teal",
    absent: "bg-sv-orange-light text-sv-orange",
    waiting: "bg-gray-100 text-gray-600",
    not_picked: "bg-sv-red-light text-sv-red",
    on_trip: "bg-sv-navy-light text-sv-navy",
    completed: "bg-sv-green-light text-sv-green",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export function getSeverityColor(severity: string) {
  const map: Record<string, string> = {
    critical: "bg-sv-red-light text-sv-red border-sv-red",
    warning: "bg-sv-orange-light text-sv-orange border-sv-orange",
    info: "bg-sv-blue-light text-sv-blue border-sv-blue",
    success: "bg-sv-green-light text-sv-green border-sv-green",
  };
  return map[severity] ?? "bg-gray-100 text-gray-600 border-gray-300";
}

// Haversine distance in km
export function haversine(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pluralize(count: number, word: string) {
  return `${count} ${word}${count !== 1 ? "s" : ""}`;
}
