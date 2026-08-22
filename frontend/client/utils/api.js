/**
 * API Base URL - Uses environment variable for production, localhost for development
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.pickyourhire.com";

/**
 * Resolve a stored file reference into an openable URL.
 * Resumes/CVs used to always be relative paths like "/uploads/resumes/xyz.pdf",
 * so callers prefixed them with API_BASE_URL. Now that resumes are served
 * from Cloudflare R2 via short-lived signed URLs, the backend may hand back
 * a full "https://..." URL instead — in that case, use it as-is.
 */
export function resolveFileUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE_URL}${pathOrUrl}`;
}

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
