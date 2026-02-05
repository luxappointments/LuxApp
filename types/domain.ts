export type UserRole = "client" | "owner" | "staff" | "admin";

export type AppointmentStatus =
  | "pending_confirmation"
  | "confirmed"
  | "awaiting_payment"
  | "paid"
  | "canceled_by_client"
  | "canceled_by_business"
  | "no_show"
  | "completed";

export type SubscriptionPlan = "free" | "silver" | "gold" | "black";

export interface SearchFilters {
  city?: string;
  category?: string;
  query?: string;
}

export interface BusinessCard {
  id: string;
  slug: string;
  name: string;
  city: string;
  category: string;
  rating?: number;
  coverUrl?: string;
  logoUrl?: string;
  availableToday: boolean;
}

export interface ServiceItem {
  id: string;
  businessId: string;
  name: string;
  durationMin: number;
  priceCents: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  requiresConfirmation: boolean;
  requiresPayment: boolean;
}

export interface SlotOption {
  staffId: string;
  startsAt: string;
  endsAt: string;
  score: number;
  recommended: boolean;
}
