/**
 * SQAuto API Client Wrapper
 * Handles safe JSON parsing and provides descriptive error messages
 * when the server returns non-JSON responses (like 500 HTML errors).
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  status: number;
}

export async function safeFetch<T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);
    const status = response.status;
    const contentType = response.headers.get("content-type");

    // Check if the response is JSON
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          data: null,
          error: data.detail || data.message || `Server returned error (${status})`,
          status
        };
      }

      return {
        success: true,
        data,
        error: null,
        status
      };
    } else {
      // Non-JSON response (likely an Internal Server Error or Bad Gateway HTML)
      const text = await response.text();
      const shortText = text.substring(0, 50).replace(/<[^>]*>?/gm, ''); // Strip HTML tags and truncate
      
      return {
        success: false,
        data: null,
        error: `Server returned non-JSON error (${status}). ${shortText ? `Snippet: "${shortText}..."` : "Check API logs."}`,
        status
      };
    }
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: `Network error: ${err.message || "Failed to reach server"}`,
      status: 0
    };
  }
}
