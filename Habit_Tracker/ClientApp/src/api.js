import { API_URL } from "./config.js";

export const getToken = () => localStorage.getItem("token");

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
