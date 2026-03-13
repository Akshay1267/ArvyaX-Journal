const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  createEntry: (userId, ambience, text) =>
    request("/journal", {
      method: "POST",
      body: JSON.stringify({ userId, ambience, text }),
    }),

  getEntries: (userId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/journal/${userId}${qs ? `?${qs}` : ""}`);
  },

  analyze: (text, entryId) =>
    request("/journal/analyze", {
      method: "POST",
      body: JSON.stringify({ text, entryId }),
    }),

  getInsights: (userId) => request(`/journal/insights/${userId}`),
};
