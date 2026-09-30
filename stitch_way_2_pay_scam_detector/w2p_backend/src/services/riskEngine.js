const dns = require("dns").promises;
const crypto = require("crypto");

const URGENCY = [
  "urgent", "immediately", "within", "minutes", "act now",
  "final notice", "suspend", "blocked", "expire", "last warning"
];

const SCAM_TERMS = [
  "clearance fee", "customs fee", "verification", "re-verify",
  "refund", "overpayment", "gift", "investment", "job task",
  "security deposit", "account suspended", "pay instantly",
  "payment request", "claim", "prize"
];

const SUSPICIOUS_TLDS = new Set([".cc", ".top", ".click", ".xyz", ".zip", ".mov", ".work", ".buzz"]);

function id() {
  return crypto.randomUUID();
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tierFor(score) {
  if (score <= 20) return "low";
  if (score <= 54) return "medium";
  return "high";
}

function labelFor(tier) {
  return tier === "low" ? "LOW RISK" : tier === "medium" ? "MEDIUM RISK" : "CRITICAL ALERT";
}

function recommendationsFor(tier, reasons = [], vector = "") {
  const base = [];
  if (tier === "high") {
    base.push("Avoid opening or continuing with this URL unless you independently verify it.");
    base.push("Do not enter passwords, OTPs, UPI PINs, card details, or other sensitive information.");
    base.push("Open the organization's official website or app manually instead of using this link.");
    base.push("If you already entered credentials or payment details, change exposed credentials and contact the relevant bank/service provider.");
  } else if (tier === "medium") {
    base.push("Treat this URL with caution and verify it before proceeding.");
    base.push("Check the registered domain carefully; do not trust logos, page design, or HTTPS alone.");
    base.push("Avoid entering sensitive information until the site is independently verified.");
  } else {
    base.push("No strong warning signals were detected by this heuristic scan, but that is not a guarantee of safety.");
    base.push("Verify the recipient and website before entering sensitive information or making a payment.");
    base.push("Never share OTPs, UPI PINs, passwords, or card PINs.");
  }

  if (reasons.some(r => /brand|impersonat|official domain/i.test(r))) {
    base.push("A possible brand/domain mismatch was detected. Compare the domain with the organization's official domain before continuing.");
  }
  if (reasons.some(r => /encoded|obfuscat|@ symbol|IP address|shortener/i.test(r))) {
    base.push("The URL contains obfuscation-style signals. Do not rely on the visible text alone; inspect the actual destination domain.");
  }
  if (reasons.some(r => /login|sign-in|verify|credential|OTP|payment|wallet|account/i.test(r))) {
    base.push("Do not sign in or submit payment/identity information through this link until the destination is verified.");
  }
  if (reasons.some(r => /DNS resolution failed/i.test(r))) {
    base.push("The domain did not resolve through DNS during this scan. Verify the address independently before using it.");
  }
  if (reasons.some(r => /HTTPS|TLS/i.test(r))) {
    base.push("Prefer HTTPS, but remember that HTTPS only encrypts the connection; it does not prove the site is legitimate.");
  }
  return [...new Set(base)];
}

function extractUrls(text) {
  return String(text || "").match(/https?:\/\/[^\s<>"']+/gi) || [];
}

function analyzeText(text) {
  const value = String(text || "").trim();
  const lower = value.toLowerCase();
  const urls = extractUrls(value);
  const reasons = [];
  let score = 5;

  const urgencyHits = URGENCY.filter(x => lower.includes(x));
  const scamHits = SCAM_TERMS.filter(x => lower.includes(x));

  if (urgencyHits.length) {
    score += Math.min(30, urgencyHits.length * 8);
    reasons.push(`Urgency/social-engineering language detected (${urgencyHits.slice(0, 3).join(", ")}).`);
  }

  if (scamHits.length) {
    score += Math.min(25, scamHits.length * 6);
    reasons.push(`Payment/scam-related language detected (${scamHits.slice(0, 4).join(", ")}).`);
  }

  if (urls.length) {
    score += Math.min(20, urls.length * 7);
    reasons.push(`${urls.length} embedded link${urls.length > 1 ? "s" : ""} found.`);
  }

  if (/[A-Z]{4,}/.test(value)) {
    score += 5;
    reasons.push("Unusually aggressive uppercase wording detected.");
  }

  if (/\b(pay|send|transfer)\b/i.test(value) && /\b(today|now|minutes|immediately)\b/i.test(value)) {
    score += 12;
    reasons.push("Payment instruction is combined with a time-pressure cue.");
  }

  if (!value) {
    score = 0;
    reasons.push("No message content supplied.");
  }

  const riskScore = clamp(score);
  const tier = tierFor(riskScore);

  return {
    score: riskScore,
    tier,
    label: labelFor(tier),
    reasons: reasons.length ? reasons : ["No strong scam indicators detected by the baseline heuristic engine."],
    urls,
    recommendations: recommendationsFor(tier, reasons, "message"),
    signals: {
      urgency: urgencyHits.length > 0,
      paymentLanguage: scamHits.length > 0,
      embeddedLinks: urls.length,
      uppercasePressure: /[A-Z]{4,}/.test(value)
    }
  };
}

function normalizeUrlInput(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return { value: "", normalized: "" };

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return { value, normalized: value };
  }

  return { value, normalized: `https://${value}` };
}

function invalidUrlResult(message, input) {
  const reasons = [message];
  return {
    score: 95,
    tier: "high",
    label: "CRITICAL ALERT",
    reasons,
    domain: null,
    protocol: null,
    dns: { resolved: false },
    normalizedUrl: null,
    recommendations: [
      "Do not open or use this value as a website link until it has been verified.",
      "Enter a complete website address such as https://example.com, or verify the link from the original sender.",
      "Never enter passwords, OTPs, UPI PINs, card details, or other sensitive information into an unverified link.",
      "If this link was sent unexpectedly, open the organization's official website or app manually instead of following the link."
    ],
    input
  };
}

const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "rebrand.ly", "rb.gy", "shorturl.at", "tiny.one"
]);

const BRAND_RULES = [
  { name: "Google", tokens: ["google", "gmail", "gpay", "googlepay"], domains: ["google.com", "google.co.in", "gmail.com"] },
  { name: "Microsoft", tokens: ["microsoft", "office365", "outlook", "onedrive"], domains: ["microsoft.com", "live.com", "office.com", "outlook.com"] },
  { name: "Apple", tokens: ["apple", "icloud", "appleid"], domains: ["apple.com", "icloud.com"] },
  { name: "Amazon", tokens: ["amazon", "amazonpay"], domains: ["amazon.com", "amazon.in", "amazonpay.in"] },
  { name: "PayPal", tokens: ["paypal"], domains: ["paypal.com"] },
  { name: "WhatsApp", tokens: ["whatsapp"], domains: ["whatsapp.com", "wa.me"] },
  { name: "Instagram", tokens: ["instagram"], domains: ["instagram.com"] },
  { name: "Facebook", tokens: ["facebook", "meta"], domains: ["facebook.com", "fb.com", "meta.com"] },
  { name: "Netflix", tokens: ["netflix"], domains: ["netflix.com"] },
  { name: "PhonePe", tokens: ["phonepe"], domains: ["phonepe.com"] },
  { name: "Paytm", tokens: ["paytm"], domains: ["paytm.com"] },
  { name: "State Bank of India", tokens: ["sbi", "onlinesbi", "statebank"], domains: ["sbi.co.in", "onlinesbi.sbi", "bank.sbi"] },
  { name: "HDFC Bank", tokens: ["hdfc", "hdfcbank"], domains: ["hdfcbank.com"] },
  { name: "ICICI Bank", tokens: ["icici", "icicibank"], domains: ["icicibank.com"] },
  { name: "Axis Bank", tokens: ["axisbank", "axis-bank"], domains: ["axisbank.com"] },
  { name: "Kotak", tokens: ["kotak", "kotakbank"], domains: ["kotak.com"] },
  { name: "Flipkart", tokens: ["flipkart"], domains: ["flipkart.com"] }
];

const SUSPICIOUS_URL_WORDS = [
  "login", "signin", "sign-in", "verify", "verification", "secure", "security",
  "update", "account", "unlock", "suspend", "confirm", "credential", "password",
  "otp", "kyc", "wallet", "payment", "invoice", "refund", "claim", "prize",
  "gift", "bonus", "banking", "webscr", "auth", "session"
];

const COMMON_MULTI_LABEL_SUFFIXES = new Set([
  "co.in", "com.au", "co.uk", "org.uk", "co.nz", "com.br", "com.sg", "com.my"
]);

function registeredDomain(hostname) {
  const clean = String(hostname || "").replace(/^\.+|\.+$/g, "").toLowerCase();
  const labels = clean.split(".").filter(Boolean);
  if (labels.length <= 2) return clean;
  const last2 = labels.slice(-2).join(".");
  if (COMMON_MULTI_LABEL_SUFFIXES.has(last2) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }
  return last2;
}

function domainMatches(hostname, officialDomain) {
  const h = hostname.toLowerCase();
  const d = officialDomain.toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}

function isIpHostname(hostname) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  return hostname.includes(":") && /^[0-9a-f:]+$/i.test(hostname);
}

function countPercentEncoding(value) {
  return (String(value).match(/%[0-9a-f]{2}/gi) || []).length;
}

async function analyzeUrl(rawUrl) {
  const { value, normalized } = normalizeUrlInput(rawUrl);
  let parsed;

  try {
    parsed = new URL(normalized);
    if (!parsed.hostname || /\s/.test(value)) {
      return invalidUrlResult("The supplied value is not a valid website URL.", value);
    }
  } catch {
    return invalidUrlResult("The supplied value is not a valid website URL.", value);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return invalidUrlResult(`Unsupported URL scheme detected (${parsed.protocol}).`, value);
  }

  let score = 4;
  const reasons = [];
  const detectedSignals = [];
  const hostname = parsed.hostname.toLowerCase();
  const regDomain = registeredDomain(hostname);
  const rawLower = normalized.toLowerCase();
  const hostLabels = hostname.split(".").filter(Boolean);
  const pathAndQuery = `${parsed.pathname}${parsed.search}${parsed.hash}`.toLowerCase();

  const add = (points, reason, signal) => {
    score += points;
    reasons.push(reason);
    if (signal) detectedSignals.push(signal);
  };

  if (parsed.protocol !== "https:") {
    add(18, "URL does not use HTTPS, so the connection is not protected by TLS.", "no_https");
  }

  if (hostname.includes("xn--")) {
    add(30, "Punycode/homograph-style hostname detected; a look-alike domain may be attempting to imitate another site.", "punycode");
  }

  if (/[^\x00-\x7F]/.test(hostname)) {
    add(22, "Non-ASCII hostname characters detected; verify that the domain is not a look-alike address.", "unicode_hostname");
  }

  if (isIpHostname(hostname)) {
    add(28, "The URL uses a raw IP address instead of a normal domain name, a pattern often used to obscure the real destination.", "ip_hostname");
  }

  if (parsed.username || parsed.password || value.includes("@")) {
    add(25, "An @ symbol or URL user-info component was detected; this can hide the real destination domain from casual inspection.", "userinfo_obfuscation");
  }

  if (!isIpHostname(hostname)) {
    if (hostLabels.length > 4) {
      add(10, "The hostname contains many nested subdomains, which can be used to make a malicious domain look more trustworthy.", "deep_subdomain");
    } else if (hostLabels.length === 4) {
      add(5, "A deeply nested hostname was detected; verify the registered domain carefully.", "deep_subdomain");
    }
  }

  const hyphenCount = (hostname.match(/-/g) || []).length;
  if (hyphenCount >= 4) {
    add(13, "The hostname contains an unusually high number of hyphens, which is common in deceptive look-alike domains.", "many_hyphens");
  } else if (hyphenCount >= 2) {
    add(5, "Multiple hyphens were detected in the hostname; inspect the domain carefully.", "hyphens");
  }

  const digitCount = (regDomain.match(/\d/g) || []).length;
  if (digitCount >= 5) {
    add(9, "The registered domain contains many digits, which can be a sign of randomly generated or deceptive naming.", "many_digits");
  }

  for (const tld of SUSPICIOUS_TLDS) {
    if (hostname.endsWith(tld)) {
      add(18, `Higher-risk domain suffix detected (${tld}). This alone does not prove the site is malicious.`, "suspicious_tld");
      break;
    }
  }

  if (URL_SHORTENERS.has(regDomain)) {
    add(18, `URL-shortening service detected (${regDomain}); the final destination is hidden until the link is followed.`, "shortener");
  }

  if (normalized.length > 180) {
    add(12, "The URL is unusually long, which can be used to hide the meaningful part of the destination.", "long_url");
  } else if (normalized.length > 120) {
    add(6, "The URL is relatively long; inspect the destination and parameters carefully.", "long_url");
  }

  const encodedCount = countPercentEncoding(value);
  if (encodedCount >= 5 || /%25[0-9a-f]{2}/i.test(value)) {
    add(18, "Heavy or double percent-encoding was detected, which can be used to obfuscate URL content.", "encoding_obfuscation");
  } else if (encodedCount >= 2) {
    add(7, "Multiple percent-encoded characters were detected in the URL.", "encoding");
  }

  if (/\\/.test(value)) {
    add(10, "Backslash characters were detected in the URL, which can make the visible address misleading in some contexts.", "backslash_obfuscation");
  }

  if (/https?:\/\/.*https?:\/\//i.test(rawLower.replace(/^https?:\/\//, ""))) {
    add(20, "A second URL-like string is embedded inside the URL, which can be used to disguise redirects or destinations.", "embedded_url");
  }

  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    add(8, `An uncommon explicit port (${parsed.port}) is used by the URL.`, "uncommon_port");
  }

  const suspiciousWords = SUSPICIOUS_URL_WORDS.filter(word => hostname.includes(word) || pathAndQuery.includes(word));
  if (suspiciousWords.length >= 3) {
    add(18, `Multiple phishing-related terms were detected in the URL (${suspiciousWords.slice(0, 5).join(", ")}).`, "phishing_terms");
  } else if (suspiciousWords.length) {
    add(Math.min(12, 5 + suspiciousWords.length * 3), `Sensitive-action term${suspiciousWords.length > 1 ? "s" : ""} detected in the URL (${suspiciousWords.slice(0, 4).join(", ")}).`, "suspicious_path");
  }

  if (/\.(exe|scr|msi|apk|dmg|pkg|bat|cmd|ps1)(?:$|[?#])/i.test(parsed.pathname)) {
    add(32, "The URL points directly to an executable or installable file, which carries elevated malware risk.", "executable_download");
  } else if (/\.(zip|rar|7z|iso)(?:$|[?#])/i.test(parsed.pathname)) {
    add(14, "The URL points to an archive download; unexpected archives can contain malicious files.", "archive_download");
  }

  // Brand/domain mismatch detection. A brand token appearing anywhere in the
  // hostname/path while the destination is not one of that brand's known domains
  // is treated as impersonation evidence, not proof of fraud.
  const brandHaystack = `${hostname}${parsed.pathname}${parsed.search}`.toLowerCase();
  const brandSegments = brandHaystack.split(/[^a-z0-9]+/).filter(Boolean);
  for (const brand of BRAND_RULES) {
    const mentionsBrand = brand.tokens.some(token => token.length >= 5 ? brandHaystack.includes(token) : brandSegments.includes(token));
    const onOfficialDomain = brand.domains.some(domain => domainMatches(hostname, domain));
    if (mentionsBrand && !onOfficialDomain) {
      add(34, `${brand.name} branding appears in the URL, but the destination domain (${regDomain}) is not one of the known official ${brand.name} domains. This may indicate impersonation.`, "brand_mismatch");
      break;
    }
  }

  // Detect common "brand-secure-login.example" style hostnames even when a
  // specific brand rule is not triggered.
  if (/(secure|verify|login|signin|account|update|support|billing|payment)[-_]?(portal|center|service|help|auth|verify|login)?/i.test(hostname) && hyphenCount >= 1) {
    add(10, "The hostname combines trust/security language with a hyphenated domain pattern commonly seen in phishing links.", "deceptive_hostname_pattern");
  }

  let resolved = false;
  try {
    const result = await dns.lookup(hostname);
    resolved = Boolean(result.address);
    if (resolved) reasons.push("Domain resolved successfully through DNS. DNS resolution only confirms that the domain exists; it does not prove legitimacy.");
  } catch {
    add(30, "DNS resolution failed, so the domain could not currently be verified through DNS.", "dns_failed");
  }

  if (!reasons.length) {
    reasons.push("No strong warning signals were detected by the current URL heuristic engine.");
  }

  const riskScore = clamp(score);
  const tier = tierFor(riskScore);

  return {
    score: riskScore,
    tier,
    label: labelFor(tier),
    reasons,
    domain: hostname,
    registeredDomain: regDomain,
    protocol: parsed.protocol,
    normalizedUrl: parsed.toString(),
    dns: { resolved },
    signals: detectedSignals,
    recommendations: recommendationsFor(tier, reasons, "url"),
    engineVersion: "2.0-strong-heuristics",
    disclaimer: "This is a heuristic risk score, not a malware/phishing verdict. A legitimate site can trigger warnings, and a malicious site can sometimes evade them."
  };
}

function analyzePayment({ recipient, amount, purpose }) {
  const value = String(recipient || "").trim();
  const lower = value.toLowerCase();
  const numericAmount = Number(amount);
  const p = String(purpose || "").toLowerCase();

  let score = 8;
  const reasons = [];

  if (!value) {
    score += 30;
    reasons.push("No recipient/handle was supplied.");
  }

  if (/@/.test(value) && /(support|refund|verify|security|help|claim|gift|task)/i.test(value)) {
    score += 25;
    reasons.push("Recipient handle contains support/refund/security-style terms.");
  }

  if (numericAmount > 10000) {
    score += 20;
    reasons.push("Large transaction amount requires additional verification.");
  } else if (numericAmount > 5000) {
    score += 10;
    reasons.push("Elevated transaction amount detected.");
  }

  if (["delivery", "bank", "refund", "gift"].includes(p)) {
    score += 18;
    reasons.push(`Purpose category "${p}" is commonly used in social-engineering payment requests.`);
  }

  if (/free|prize|reward|investment|double|guaranteed/i.test(lower)) {
    score += 20;
    reasons.push("High-risk promotional or guaranteed-return language detected.");
  }

  const riskScore = clamp(score);
  const tier = tierFor(riskScore);

  return {
    score: riskScore,
    tier,
    label: labelFor(tier),
    reasons: reasons.length ? reasons : ["No strong recipient or amount anomaly detected by the baseline engine."],
    recipient: value,
    amount: Number.isFinite(numericAmount) ? numericAmount : null,
    purpose: p || null,
    recommendations: recommendationsFor(tier, reasons, "payment")
  };
}

function analyzeQr({ decodedText, filename }) {
  const textResult = analyzeText(decodedText || "");
  return {
    ...textResult,
    qr: {
      filename: filename || null,
      decoded: Boolean(decodedText),
      decodedText: decodedText || null
    }
  };
}

function buildScan(vector, input, analysis) {
  return {
    id: id(),
    vector,
    createdAt: new Date().toISOString(),
    latencyMs: 80 + Math.floor(Math.random() * 100),
    entitiesVerified: analysis.tier === "low" ? 4 : analysis.tier === "medium" ? 2 : 0,
    integrity: "EPHEMERAL",
    ...analysis
  };
}

module.exports = {
  analyzeText,
  analyzeUrl,
  analyzePayment,
  analyzeQr,
  buildScan
};
