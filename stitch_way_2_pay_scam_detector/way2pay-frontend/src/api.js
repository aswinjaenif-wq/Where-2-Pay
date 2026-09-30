const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/health'),
  scanMessage: message => request('/scan/message', { method: 'POST', body: JSON.stringify({ message }) }),
  scanUrl: url => request('/scan/url', { method: 'POST', body: JSON.stringify({ url }) }),
  scanPayment: payload => request('/scan/payment', { method: 'POST', body: JSON.stringify(payload) }),
  scanQr: ({ file, decodedText }) => {
    const form = new FormData();
    if (file) form.append('qr', file);
    if (decodedText) form.append('decodedText', decodedText);
    return fetch(`${API_BASE}/scan/qr`, { method: 'POST', body: form }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'QR scan failed'); return d; });
  },
  history: () => request('/history'),
  clearHistory: () => request('/history', { method: 'DELETE' }),
  report: scan => request('/reports', { method: 'POST', body: JSON.stringify({ scan }) }),
  communityReport: payload => request('/community/reports', { method: 'POST', body: JSON.stringify(payload) })
};
