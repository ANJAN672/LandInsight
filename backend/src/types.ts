export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AnalysisContext {
  goal: string;
  features: string;
  concerns: string;
  savedWithoutInsights?: boolean;
  insightsGeneratedAt?: string;
}
