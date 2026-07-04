export type UserRole = "admin" | "analyst" | "health_worker" | "viewer";

export interface AuthUser {
  fullName: string;
  role: UserRole;
}

export interface Region {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
}

export interface PredictionRow {
  region_id: string;
  region_name: string;
  period: string;
  hesitancy_score: number;
  confidence: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  model_version: string;
  created_at?: string;
}

export interface DashboardSummary {
  total_regions: number;
  total_datasets: number;
  average_hesitancy_score: number;
  high_risk_regions: number;
  active_rumors: number;
  pending_reminders: number;
  total_doses_administered: number;
  risk_breakdown: Record<string, number>;
}
