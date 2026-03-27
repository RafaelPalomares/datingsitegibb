export const TOKEN_KEY = "muduo_token";
export const ROLE_KEY = "muduo_role";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getRole(): "admin" | "user" | null {
  if (typeof window === "undefined") {
    return null;
  }

  const role = window.localStorage.getItem(ROLE_KEY);

  if (role === "admin" || role === "user") {
    return role;
  }

  return null;
}

export function setRole(role: "admin" | "user"): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}
