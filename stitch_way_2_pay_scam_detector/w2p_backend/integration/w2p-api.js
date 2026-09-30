const W2P_API_BASE = "http://localhost:5000/api";

async function w2pRequest(path, options = {}) {
  const response = await fetch(`${W2P_API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function scanMessageFromBackend(message) {
  return w2pRequest("/scan/message", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

async function scanUrlFromBackend(url) {
  return w2pRequest("/scan/url", {
    method: "POST",
    body: JSON.stringify({ url })
  });
}

async function scanPaymentFromBackend(recipient, amount, purpose) {
  return w2pRequest("/scan/payment", {
    method: "POST",
    body: JSON.stringify({ recipient, amount, purpose })
  });
}

async function scanQrFromBackend(decodedText, filename) {
  return w2pRequest("/scan/qr", {
    method: "POST",
    body: JSON.stringify({ decodedText, filename })
  });
}

async function getW2PHistory(tier = "all") {
  const query = tier === "all" ? "" : `?tier=${encodeURIComponent(tier)}`;
  return w2pRequest(`/history${query}`);
}

async function clearW2PHistory() {
  return w2pRequest("/history", { method: "DELETE" });
}

async function createIncidentReport(scan) {
  return w2pRequest("/reports", {
    method: "POST",
    body: JSON.stringify({ scan })
  });
}

async function reportToW2PCommunity(scanId, category = "suspected-scam", notes = "") {
  return w2pRequest("/community/reports", {
    method: "POST",
    body: JSON.stringify({ scanId, category, notes })
  });
}
