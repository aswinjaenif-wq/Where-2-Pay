const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const COMMUNITY_FILE = path.join(DATA_DIR, "community-reports.json");

function ensureDataStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of [HISTORY_FILE, REPORTS_FILE, COMMUNITY_FILE]) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
  }
}

function readJson(file) {
  ensureDataStore();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeJson(file, value) {
  ensureDataStore();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function addRecord(file, record) {
  const records = readJson(file);
  records.unshift(record);
  writeJson(file, records);
  return record;
}

function getHistory() {
  return readJson(HISTORY_FILE);
}

function addHistory(record) {
  return addRecord(HISTORY_FILE, record);
}

function clearHistory() {
  writeJson(HISTORY_FILE, []);
}

function addReport(record) {
  return addRecord(REPORTS_FILE, record);
}

function getReport(id) {
  return readJson(REPORTS_FILE).find(r => r.id === id);
}

function addCommunityReport(record) {
  return addRecord(COMMUNITY_FILE, record);
}

function getStats() {
  const history = getHistory();
  return {
    totalScans: history.length,
    highRisk: history.filter(x => x.tier === "high").length,
    mediumRisk: history.filter(x => x.tier === "medium").length,
    lowRisk: history.filter(x => x.tier === "low").length,
    lastScanAt: history[0]?.createdAt || null
  };
}

module.exports = {
  DATA_DIR,
  ensureDataStore,
  getHistory,
  addHistory,
  clearHistory,
  addReport,
  getReport,
  addCommunityReport,
  getStats
};
