const express = require("express");
const { getHistory, clearHistory, getStats } = require("../services/store");

const router = express.Router();

router.get("/", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const tier = req.query.tier;
  let history = getHistory();

  if (tier && ["low", "medium", "high"].includes(tier)) {
    history = history.filter(item => item.tier === tier);
  }

  res.json({
    ok: true,
    total: history.length,
    items: history.slice(0, limit)
  });
});

router.delete("/", (req, res) => {
  clearHistory();
  res.json({ ok: true, message: "History cleared." });
});

module.exports = router;
