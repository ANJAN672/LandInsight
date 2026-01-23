
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface LandAnalysis {
  id: string;
  timestamp: number;
  areaSqMeters: number;
  coordinates: PolygonPoint[];
  context?: {
    goal: string;
    features: string;
    concerns: string;
  };
  // Changed to string to follow grounding guidelines: "do not attempt to parse it as JSON"
  insights: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
