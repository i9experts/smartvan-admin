// ─── Auth ──────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  admin: Admin;
}

// ─── Admin ─────────────────────────────────────────────────────
export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  schoolId?: string;
  createdAt: string;
}

// ─── School ────────────────────────────────────────────────────
export interface School {
  _id: string;
  name: string;
  address: string;
  timezone: string;
  currency: string;
  contactNumber: string;
  currentPlan: "starter" | "growth" | "enterprise";
  allowedVans: number;
  allowedStudents: number;
  allowedRoutes: number;
  status: "active" | "inactive";
  createdAt: string;
}

// ─── Van ───────────────────────────────────────────────────────
export interface Van {
  _id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  schoolId: string;
  driverId?: string;
  driver?: Driver;
  status: "active" | "idle" | "maintenance" | "inactive";
  documents: {
    registration: { expiry: string; status: "valid" | "expiring" | "expired" };
    insurance: { expiry: string; status: "valid" | "expiring" | "expired" };
    fitness: { expiry: string; status: "valid" | "expiring" | "expired" };
  };
  mileage: number;
  lastService: string;
  nextService: string;
  createdAt: string;
}

// ─── Driver ────────────────────────────────────────────────────
export interface Driver {
  _id: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  vanId?: string;
  schoolId: string;
  rating: number;
  totalTrips: number;
  status: "active" | "inactive" | "on_trip";
  onTimeRate: number;
  createdAt: string;
}

// ─── Route ─────────────────────────────────────────────────────
export interface Stop {
  _id: string;
  name: string;
  address: string;
  lat: number;
  long: number;
  order: number;
  kidIds: string[];
  estimatedTime?: string;
}

export interface Route {
  _id: string;
  name: string;
  schoolId: string;
  vanId?: string;
  driverId?: string;
  van?: Van;
  driver?: Driver;
  stops: Stop[];
  tripType: "morning" | "afternoon";
  tripDays: Record<string, boolean>;
  departureTime: string;
  totalDistance: number;
  estimatedDuration: number;
  status: "active" | "inactive";
  onTimeRate: number;
  createdAt: string;
}

// ─── Kid ───────────────────────────────────────────────────────
export interface Kid {
  _id: string;
  name: string;
  grade: string;
  schoolId: string;
  parentId: string;
  parent?: Parent;
  VanId?: string;
  van?: Van;
  routeId?: string;
  stopId?: string;
  status: "active" | "inactive";
  verified: boolean;
  attendanceRate: number;
  todayStatus: "picked" | "dropped" | "absent" | "waiting" | "not_picked";
  createdAt: string;
}

// ─── Parent ────────────────────────────────────────────────────
export interface Parent {
  _id: string;
  name: string;
  email: string;
  phone: string;
  schoolId: string;
  kids?: Kid[];
  appInstalled: boolean;
  notificationsEnabled: boolean;
  notificationPrefs: {
    pickup: boolean;
    dropoff: boolean;
    delay: boolean;
    routeChange: boolean;
    sos: boolean;
  };
  openComplaints: number;
  lastActive: string;
  createdAt: string;
}

// ─── Trip ──────────────────────────────────────────────────────
export interface TripLocation {
  lat: number;
  long: number;
  time: string;
}

export interface Trip {
  _id: string;
  routeId: string;
  route?: Route;
  vanId: string;
  van?: Van;
  driverId: string;
  driver?: Driver;
  schoolId: string;
  status: "pending" | "active" | "completed" | "cancelled";
  TripStarted: boolean;
  locations: TripLocation[];
  startTime?: string;
  endTime?: string;
  kidsOnBoard: number;
  currentStopIndex: number;
  speed: number;
  eta?: number;
  createdAt: string;
}

// ─── Alert ─────────────────────────────────────────────────────
export type AlertSeverity = "critical" | "warning" | "info" | "success";
export type AlertType =
  | "sos"
  | "route_deviation"
  | "speed_violation"
  | "delay"
  | "doc_expiry"
  | "absence"
  | "complaint"
  | "trip_complete";

export interface Alert {
  _id: string;
  schoolId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  vanId?: string;
  driverId?: string;
  tripId?: string;
  kidId?: string;
  location?: { lat: number; long: number };
  read: boolean;
  resolved: boolean;
  createdAt: string;
}

// ─── Dashboard stats ───────────────────────────────────────────
export interface DashboardStats {
  totalVans: number;
  totalDrivers: number;
  totalStudents: number;
  activeVans: number;
  delayedTrips: number;
  missedTrips: number;
  onTimeRate: number;
  openTickets: number;
  resolvedTickets: number;
  todayTrips: number;
}

// ─── API response wrapper ──────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Socket events ─────────────────────────────────────────────
export interface LocationUpdate {
  userId: string;
  location: { lat: number; long: number };
  tripId: string;
  at: string;
}

export interface SosEvent {
  tripId: string;
  vanId: string;
  driverId: string;
  location: { lat: number; long: number };
  at: string;
}
