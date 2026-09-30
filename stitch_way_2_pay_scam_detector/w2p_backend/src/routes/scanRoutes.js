const express = require("express");
const multer = require("multer");
const {
  analyzeText,
  analyzeUrl,
  analyzePayment,
  analyzeQr,
  buildScan
} = require("../services/riskEngine");
const { addHistory } = require("../services/store");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function saveAndSend(res, result) {
  addHistory(result);
  res.json({ ok: true, result });
}

router.post("/message", (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== "string") {
    return res.status(400).json({ error: "message must be a string." });
  }
  const analysis = analyzeText(message);
  saveAndSend(res, buildScan("message", { message }, analysis));
});

router.post("/url", async (req, res, next) => {
  try {
    const { url } = req.body || {};
    if (typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "url is required." });
    }
    const analysis = await analyzeUrl(url.trim());
    saveAndSend(res, buildScan("url", { url: url.trim() }, analysis));
  } catch (err) {
    next(err);
  }
});

router.post("/payment", (req, res) => {
  const { recipient, amount, purpose } = req.body || {};
  const analysis = analyzePayment({ recipient, amount, purpose });
  saveAndSend(res, buildScan("payment", { recipient, amount, purpose }, analysis));
});

router.post("/qr", upload.single("qr"), (req, res) => {
  // The frontend's current QR flow uses a simulated decoded value.
  // If a QR decoder is added later, send its decodedText here.
  const decodedText = req.body?.decodedText || "upi://pay?pa=mule.transfers89@axis&am=350.00";
  const filename = req.file?.originalname || req.body?.filename || "qr-upload";
  const analysis = analyzeQr({ decodedText, filename });
  saveAndSend(res, buildScan("qr", { filename }, analysis));
});

module.exports = router;
