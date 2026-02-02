const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type RequestBody = Record<string, unknown> | unknown[] | null;
type RequestOptions = RequestInit & { body?: RequestBody };

type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

type AnalysisContext = {
  goal?: string;
  features?: string;
  concerns?: string;
  savedWithoutInsights?: boolean;
  insightsGeneratedAt?: string;
};

type AnalysisRecord = {
  id: string;
  areaSqMeters: number;
  coordinates?: { lat: number; lng: number }[];
  geojson?: GeoJSONPolygon;
  context?: AnalysisContext | null;
  insights?: string;
  region?: string | null;
  createdAt?: string | Date;
};

const fetchJson = async (path: string, options: RequestOptions = {}) => {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = (payload?.error as string) || (payload?.message as string) || "Request failed";
    throw new Error(message);
  }

  return payload;
};

const pointsToGeoJSON = (points: { lat: number; lng: number }[]) => {
  if (!points || points.length === 0) {
    return { type: "Polygon", coordinates: [] };
  }
  const ring = points.map((p) => [p.lng, p.lat]);
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    ring.push([firstLng, firstLat]);
  }
  return { type: "Polygon", coordinates: [ring] };
};

const geoJSONToPoints = (geojson: GeoJSONPolygon | undefined) => {
  if (!geojson || geojson.type !== "Polygon" || !Array.isArray(geojson.coordinates)) {
    return [];
  }
  const ring = geojson.coordinates[0];
  if (!Array.isArray(ring)) {
    return [];
  }
  const points = ring.map(([lng, lat]: [number, number]) => ({ lat, lng }));
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      points.pop();
    }
  }
  return points;
};

const normalizeAnalysis = (analysis: AnalysisRecord | null) => {
  if (!analysis) return analysis;
  const geojson = analysis.geojson;
  const coordinates = Array.isArray(analysis.coordinates)
    && analysis.coordinates.length > 0
    ? analysis.coordinates
    : geoJSONToPoints(geojson);
  return { ...analysis, coordinates, geojson };
};

export const getCurrentUser = async () => {
  const data = await fetchJson("/api/auth/me");
  return (data as { user?: unknown })?.user || null;
};

export const loginUser = async (email: string, password: string) => {
  return fetchJson("/api/auth/login", { method: "POST", body: { email, password } }) as Promise<unknown>;
};

export const registerUser = async (email: string, password: string, name?: string) => {
  return fetchJson("/api/auth/register", { method: "POST", body: { email, password, name } }) as Promise<unknown>;
};

export const logoutUser = async () => {
  return fetchJson("/api/auth/logout", { method: "POST" }) as Promise<unknown>;
};

export const saveParcelToVault = async (
  area: number,
  coordinates: { lat: number; lng: number }[],
  context?: { goal: string; features: string; concerns: string }
) => {
  const geojson = pointsToGeoJSON(coordinates);
  return fetchJson("/api/analysis/vault", { method: "POST", body: { area, geojson, context } }) as Promise<unknown>;
};

export const getUserAnalyses = async () => {
  const data = await fetchJson("/api/analysis") as { analyses?: AnalysisRecord[] };
  return (data?.analyses || []).map(normalizeAnalysis);
};

export const getAnalysisById = async (id: string) => {
  const data = await fetchJson(`/api/analysis/${id}`) as { analysis?: AnalysisRecord | null };
  return normalizeAnalysis(data?.analysis || null);
};

export const deleteAnalysis = async (id: string) => {
  return fetchJson(`/api/analysis/${id}`, { method: "DELETE" }) as Promise<unknown>;
};

export const getConversations = async () => {
  const data = await fetchJson("/api/conversations") as { conversations?: unknown[] };
  return data?.conversations || [];
};

export const createConversation = async (title?: string) => {
  const data = await fetchJson("/api/conversations", { method: "POST", body: { title } }) as { conversation?: unknown };
  return data?.conversation;
};

export const getConversation = async (id: string) => {
  const data = await fetchJson(`/api/conversations/${id}`) as { conversation?: unknown };
  return data?.conversation || null;
};

export const deleteConversation = async (id: string) => {
  return fetchJson(`/api/conversations/${id}`, { method: "DELETE" }) as Promise<unknown>;
};

export const sendChatMessage = async (conversationId: string, content: string, analysisId?: string) => {
  return fetchJson(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content, analysisId },
  }) as Promise<{ content: string; id: string }>;
};

export const getUserAnalysesForChat = async () => {
  const data = await fetchJson("/api/conversations/analyses") as { analyses?: AnalysisRecord[] };
  return (data?.analyses || []).map(normalizeAnalysis);
};
