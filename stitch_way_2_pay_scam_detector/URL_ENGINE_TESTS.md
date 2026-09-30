# Quick URL Engine Test Cases

Start the backend and frontend, open the URL scanner, and try these values.

| Test input | What it should demonstrate |
|---|---|
| `example.com` | Normal domain input without a scheme; should be normalized automatically. |
| `https://paypal.com` | Official-domain brand match; should not trigger PayPal impersonation. |
| `http://secure-paypal-login.xyz/verify/account` | Multiple phishing indicators and brand/domain mismatch; should be high risk. |
| `https://google-login-security-check.example.com/verify?account=1` | Brand impersonation + suspicious path; should be high risk. |
| `http://192.168.1.25/login?verify=1` | IP-address destination + HTTP + login/verify path; elevated/high risk. |
| `https://bit.ly/example` | Shortened URL; should receive a caution/medium signal. |
| `not a url` | Invalid input; should return a reason and recommended steps. |

Actual scores can vary slightly when DNS succeeds or fails.
