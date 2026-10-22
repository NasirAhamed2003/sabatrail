// Shapes returned by the SabaTrail API

export interface Category {
  category_id: number;
  category_name: string;
  description?: string | null;
  _count?: { places: number };
}

export interface Place {
  place_id: number;
  category_id: number;
  place_name: string;
  description?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  distance?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
  best_time_to_visit?: string | null;
  visit_duration?: string | null;
  visit_duration_minutes?: number | null;
  suitability?: string | null;
  travel_tips?: string | null;
  facilities?: string | null;
  before_you_go?: string | null;
  image?: string | null;
  image_credit?: string | null;
  updated_at?: string;
  category?: Category | null;
}

export interface VisitPlan {
  plan_id: number;
  plan_name: string;
  visit_date: string;
  _count?: { plan_places: number };
}

export interface PlanStop {
  plan_place_id: number;
  plan_id: number;
  place_id: number;
  visit_order: number;
  planned_time?: string | null;
  place: Place;
}

export interface PlanDetails {
  plan_id: number;
  plan_name: string;
  visit_date: string;
  total_places: number;
  places: PlanStop[];
}

export const FOOD_CATEGORY = "Restaurants/Dining";
