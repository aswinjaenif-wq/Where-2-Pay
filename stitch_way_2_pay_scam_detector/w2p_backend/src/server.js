const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { ensureDataStore } = require("./services/store");
const scanRoutes = require("./routes/scanRoutes");
const historyRoutes = require("./routes/historyRoutes");
const reportRoutes = require("./routes/reportRoutes");
const communityRoutes = require("./routes/communityRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

ensureDataStore();

app.use(cors({
  origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN.split(",").map(s => s.trim()),
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: process.env.MAX_JSON_SIZE || "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Where 2 Pay API",
    version: "1.0.0",
    time: new Date().toISOString()
  });
});

app.get("/api", (req, res) => {
  res.json({
    name: "Where 2 Pay",
    shortName: "W2P",
    message: "Pre-payment scam detection API",
    endpoints: [
      "POST /api/scan/message",
      "POST /api/scan/url",
      "POST /api/scan/payment",
      "POST /api/scan/qr",
      "GET /api/history",
      "DELETE /api/history",
      "POST /api/reports",
      "GET /api/reports/:id",
      "POST /api/community/reports",
      "GET /api/stats"
    ]
  });
});

app.use("/api/scan", scanRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/community", communityRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`W2P backend running on http://localhost:${PORT}`);
});
