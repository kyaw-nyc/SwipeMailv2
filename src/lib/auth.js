const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const getApiUrl = (path) => {
  if (!path.startsWith("/")) {
    return path;
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
};

export const redirectToLogin = () => {
  window.location.href = getApiUrl("/api/auth/login");
};

export const fetchSession = async () => {
  try {
    const response = await fetch(getApiUrl("/api/auth/session"), {
      credentials: "include",
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch (error) {
    console.error("Failed to fetch session", error);
    return null;
  }
};

export const logout = async () => {
  const response = await fetch(getApiUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to sign out");
  }
  return true;
};
