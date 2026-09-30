import React, { useEffect, useState } from 'react';
import { api } from './api';

const tabs = ['message', 'url', 'qr', 'payment'];

function RiskBadge({ tier }) {
  const label = tier ? tier.toUpperCase() : 'UNKNOWN';
  return <span className={`badge ${tier || 'unknown'}`}>{label} RISK</span>;
}

function ScanResult({ result, onReport }) {
  if (!result) return null;
  const tier = result.tier || result.analysis?.tier;
  const score = result.score ?? result.analysis?.score ?? 0;
  const reasons = result.reasons || result.analysis?.reasons || [];
  const recommendations = result.recommendations || result.analysis?.recommendations || [];
  const isUrl = result.vector === 'url';
  const registeredDomain = result.registeredDomain || result.analysis?.registeredDomain;
  const disclaimer = result.disclaimer || result.analysis?.disclaimer;

  return <section className="result card">
    <div className="result-head">
      <div><span className="eyebrow">SCAN RESULT</span><h2>{result.label || result.verdict || result.analysis?.verdict || 'Analysis complete'}</h2></div>
      <RiskBadge tier={tier}/>
    </div>

    {isUrl && result.domain && <div className="checked-target"><span>CHECKED DOMAIN</span><strong>{result.domain}</strong>{registeredDomain && registeredDomain !== result.domain && <small>Registered domain: {registeredDomain}</small>}</div>}

    <div className="score">
      <div className="score-number">{score}%</div>
      <div><strong>Risk score</strong><p>Score is based on the warning signals detected by the current heuristic engine. It is not a guarantee that a URL is safe or malicious.</p></div>
    </div>

    <div className="explanation">
      <span className="eyebrow">WHY THIS RESULT?</span>
      <h3>{tier === 'high' ? 'Suspicious or invalid signals were detected' : tier === 'medium' ? 'Some warning signals were detected' : 'No strong warning signals detected'}</h3>
      <div className="signals">
        {reasons.length ? reasons.map((reason, i) => <div className="signal" key={i}><span>{tier === 'low' && i === reasons.length - 1 ? '✓' : '⚠'}</span>{reason}</div>) : <div className="signal"><span>⚠</span>No explanation was returned by the scanner.</div>}
      </div>
    </div>

    <div className={`recommendations ${tier || 'unknown'}`}>
      <span className="eyebrow">RECOMMENDED NEXT STEPS</span>
      <ul>{recommendations.length ? recommendations.map((step, i) => <li key={i}>{step}</li>) : <li>Verify the website independently before opening it or entering any sensitive information.</li>}</ul>
    </div>

    {disclaimer && <p className="result-disclaimer">{disclaimer}</p>}
    <div className="result-actions"><button onClick={() => onReport(result)}>Create incident report</button></div>
  </section>;
}

export default function App() {
  const [tab, setTab] = useState('message');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [payment, setPayment] = useState({ recipient: '', amount: '', purpose: '' });
  const [qrFile, setQrFile] = useState(null);
  const [qrText, setQrText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const loadHistory = async () => { try { const d = await api.history(); setHistory(d.items || []); } catch {} };
  useEffect(() => { loadHistory(); }, []);

  const runScan = async () => {
    setLoading(true); setNotice('');
    try {
      let data;
      if (tab === 'message') data = await api.scanMessage(message);
      if (tab === 'url') data = await api.scanUrl(url);
      if (tab === 'payment') data = await api.scanPayment(payment);
      if (tab === 'qr') data = await api.scanQr({ file: qrFile, decodedText: qrText });
      setResult(data.result); await loadHistory();
    } catch (e) { setNotice(e.message); }
    finally { setLoading(false); }
  };

  const report = async scan => { try { const d = await api.report(scan); setNotice(`Incident report created: ${d.report.id}`); } catch(e) { setNotice(e.message); } };
  const clear = async () => { await api.clearHistory(); setHistory([]); setNotice('History cleared.'); };

  return <div className="app">
    <header><div className="topline"><span>●</span> Pause. Check. Then Pay. <i>•</i> Real-time AI pre-payment intelligence active <i>•</i> 0% sensitive credentials stored</div>
      <div className="nav"><div className="brand"><div className="shield">W2P</div><div><strong>Where 2 Pay <em>AI CYBER-GUARD</em></strong><small>Sovereign Telemetry Protocol</small></div></div>
      <nav>{['home','scan','payment-safety','history','learn','about','privacy'].map(x => <button key={x} className={x === 'scan' ? 'active' : ''} onClick={() => x === 'history' ? document.getElementById('history').scrollIntoView({behavior:'smooth'}) : x === 'scan' ? window.scrollTo({top:0,behavior:'smooth'}) : null}>{x.replace('-', ' ')}</button>)}</nav>
      <div className="status">● DEFENSE ACTIVE <button className="scan-now" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>⌁ Scan Now</button></div></div>
    </header>

    <main><div className="hero"><span className="eyebrow">PRE-PAYMENT INTELLIGENCE</span><h1>Check before you <span>pay.</span></h1><p>Analyze messages, links, QR codes, and payment requests for scam indicators before money leaves your account.</p></div>
      <section className="scanner card"><div className="tabs">{tabs.map(t => <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => {setTab(t);setResult(null);}}>{t === 'message' ? '✉ Message' : t === 'url' ? '⌕ URL' : t === 'qr' ? '▦ QR Code' : '◈ Payment Request'}</button>)}</div>
        {tab === 'message' && <div className="panel"><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Paste the message, SMS, WhatsApp text, or chat snippet you received..."/><div className="row"><span>{message.length} chars • Context Parser Ready</span><button onClick={runScan} disabled={loading || !message.trim()}>{loading ? 'Analyzing...' : '⌁ Analyze Message'}</button></div></div>}
        {tab === 'url' && <div className="panel"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="example.com or https://pay-invoice-express.co/checkout?token=89234"/><div className="row"><span>Phishing patterns • Brand mismatch • Obfuscation • DNS • HTTPS</span><button onClick={runScan} disabled={loading || !url.trim()}>{loading ? 'Checking...' : '⌕ Check URL'}</button></div></div>}
        {tab === 'payment' && <div className="panel grid"><input value={payment.recipient} onChange={e=>setPayment({...payment,recipient:e.target.value})} placeholder="Recipient / UPI ID"/><input value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})} placeholder="Amount" type="number"/><input className="wide" value={payment.purpose} onChange={e=>setPayment({...payment,purpose:e.target.value})} placeholder="Payment purpose / note"/><button onClick={runScan} disabled={loading}>{loading ? 'Analyzing...' : '⌁ Analyze Payment'}</button></div>}
        {tab === 'qr' && <div className="panel qr"><label className="drop">▦<strong>Upload QR Code</strong><small>PNG, JPG, WebP</small><input type="file" accept="image/*" onChange={e=>setQrFile(e.target.files?.[0] || null)}/></label><input value={qrText} onChange={e=>setQrText(e.target.value)} placeholder="Optional decoded QR value (e.g. UPI URL)"/><button onClick={runScan} disabled={loading}>{loading ? 'Scanning...' : '⌁ Scan QR'}</button></div>}
      </section>
      {notice && <div className="notice">{notice}</div>}
      <ScanResult result={result} onReport={report}/>
      <section id="history" className="card history"><div className="section-head"><div><span className="eyebrow">LOCAL TELEMETRY</span><h2>Scan history</h2></div><button onClick={clear}>Clear history</button></div>{history.length === 0 ? <p className="muted">No scans yet. Results from the backend appear here.</p> : <div className="history-list">{history.map((h,i)=><div className="history-item" key={h.id || i}><div><strong>{h.type?.toUpperCase()}</strong><small>{new Date(h.createdAt).toLocaleString()}</small></div><RiskBadge tier={h.tier}/><span>{h.score ?? 0}</span></div>)}</div>}</section>
      <section className="info-grid"><article className="card"><span className="eyebrow">PAYMENT SAFETY</span><h2>Pause. Check. Then Pay.</h2><p>Use multiple independent signals instead of trusting urgency, branding, or a payment request at face value.</p></article><article className="card"><span className="eyebrow">PRIVACY</span><h2>Credentials stay out.</h2><p>The supplied backend is designed around pre-payment heuristics and a local data store. Do not enter passwords, OTPs, PINs, or card secrets.</p></article><article className="card"><span className="eyebrow">LEARN</span><h2>Common warning signals</h2><p>Urgency, impersonation, suspicious domains, unusual payment requests, and inconsistent recipient details can all be useful signals.</p></article></section>
    </main><footer>Where 2 Pay • AI Cyber-Guard • Demo frontend connected to the supplied W2P API</footer>
  </div>;
}
