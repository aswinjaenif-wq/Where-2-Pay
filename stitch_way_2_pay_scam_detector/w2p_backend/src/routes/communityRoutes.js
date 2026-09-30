const express = require("express");
const crypto = require("crypto");
const { addCommunityReport } = require("../services/store");

const router = express.Router();

router.post("/reports", (req, res) => {
  const { scanId, category, notes } = req.body || {};
  const record = {
    id: crypto.randomUUID(),
    scanId: scanId || null,
    category: category || "suspected-scam",
    notes: typeof notes === "string" ? notes.slice(0, 1000) : "",
    createdAt: new Date().toISOString(),
    status: "queued",
    anonymized: true
  };

  addCommunityReport(record);

  res.status(201).json({
    ok: true,
    message: "Signal anonymized and queued for community review.",
    report: record
  });
});

module.exports = router;
