const express = require("express");
const crypto = require("crypto");
const { addReport, getReport } = require("../services/store");

const router = express.Router();

router.post("/", (req, res) => {
  const { scan } = req.body || {};
  if (!scan || typeof scan !== "object") {
    return res.status(400).json({ error: "scan object is required." });
  }

  const report = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: "incident-audit",
    anonymized: true,
    scan
  };

  addReport(report);
  res.json({
    ok: true,
    report,
    downloadName: `w2p-incident-${report.id}.json`
  });
});

router.get("/:id", (req, res) => {
  const report = getReport(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  res.json({ ok: true, report });
});

module.exports = router;
