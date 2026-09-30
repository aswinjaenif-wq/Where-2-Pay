# Where 2 Pay – URL Risk Engine v2.0

The URL scanner now uses a stronger local heuristic engine. It produces a risk score, a list of detected reasons, and recommended next steps for every URL result.

## URL inputs supported

- `example.com` (automatically normalized to `https://example.com`)
- Full HTTP/HTTPS URLs
- Suspicious/fake-looking URLs
- Invalid values

## Signals checked

1. **HTTPS / protocol**
   - Warns when the URL uses plain HTTP.
   - Rejects unsupported schemes.

2. **Phishing-pattern detection**
   - Detects terms such as `login`, `verify`, `account`, `password`, `OTP`, `KYC`, `wallet`, `payment`, `invoice`, `refund`, and similar sensitive-action words.
   - Gives more weight when several phishing-related terms appear together.

3. **Brand/domain mismatch detection**
   - Detects references to selected brands and banks in the hostname/path.
   - If a known brand is mentioned but the destination is not one of its known official domains, the engine adds a strong impersonation warning.
   - Current examples include Google, Microsoft, Apple, Amazon, PayPal, WhatsApp, Instagram, Facebook/Meta, Netflix, PhonePe, Paytm, SBI, HDFC, ICICI, Axis Bank, Kotak, and Flipkart.

4. **Suspicious path/query detection**
   - Looks for login, verification, payment, refund, credential, KYC, OTP, account-unlock and related terms in the path/query.

5. **URL obfuscation detection**
   - Raw IP-address destinations
   - `@` / URL user-info tricks
   - Punycode/look-alike hostnames
   - Non-ASCII hostnames
   - Excessive subdomains
   - Many hyphens/digits
   - Heavy or double percent-encoding
   - Embedded second URLs
   - Backslashes
   - Uncommon explicit ports
   - URL shorteners
   - Very long URLs

6. **File-download risk**
   - Raises risk for direct executable/installable downloads.
   - Adds a smaller warning for archive downloads.

7. **TLD heuristic**
   - Adds a warning for selected higher-abuse/suspicious suffixes such as `.xyz`, `.top`, `.click`, `.zip`, and others.
   - The suffix alone is never treated as proof of fraud.

8. **DNS resolution**
   - Checks whether the hostname resolves.
   - DNS success only means the domain exists; it does **not** prove the website is legitimate.

## Risk bands

- **0–20**: Low risk
- **21–54**: Medium risk
- **55–100**: High risk / Critical alert

The final number is a heuristic score based on detected signals. It is not a mathematical probability that the site is malicious.

## Example behavior

### Normal-looking URL
`example.com`

Expected when DNS resolves: low risk, because no strong suspicious URL patterns are detected.

### Obvious phishing-style URL
`http://secure-paypal-login.xyz/verify/account`

Expected: high risk because it combines HTTP, suspicious TLD, phishing terms, brand/domain mismatch, and deceptive hostname patterns.

### Brand impersonation pattern
`https://google-login-security-check.example.com/verify?account=1`

Expected: high risk because Google branding appears on a non-Google registered domain together with login/security/verification terms.

### Raw IP + login page
`http://192.168.1.25/login?verify=1`

Expected: high risk due to raw IP destination, HTTP, and credential/verification-style path terms.

### URL shortener
`https://bit.ly/example`

Expected: medium caution because the final destination is hidden until redirected.

## Important limitation

This engine is intentionally local and dependency-free. It does **not** currently query Google Safe Browsing, VirusTotal, WHOIS/domain-age data, certificate-transparency feeds, or live threat-intelligence databases.

Because of that:

- A newly registered malicious domain with a clean-looking URL can still receive a low score.
- A legitimate URL can receive warnings if it resembles common phishing patterns.
- HTTPS and successful DNS resolution do not prove legitimacy.

For production-grade detection, add at least one reputation/threat-intelligence source and combine it with these heuristics.
