/**
 * API Base URL - Uses environment variable for production, localhost for development
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Make authenticated API requests
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    try {
      const data = JSON.parse(error);
      throw new Error(data.message || data.error || `Error ${response.status}`);
    } catch {
      throw new Error(`Error ${response.status}: ${error}`);
    }
  }

  return response.json().catch(() => response.text());
}
