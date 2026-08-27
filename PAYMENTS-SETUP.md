# Payments & Documents — Setup Guide

The CRM now has a **Payments & Documents** section (`/payments-docs`) implementing:

> Client → Proposal → E-Signature → Signed PDF → Invoice → Payment → Paid

Client-facing pages (no login required, secure tokenized links):

- `https://<your-domain>/client/proposal/<token>`
- `https://<your-domain>/client/invoice/<token>`

Everything is integrated into the existing stack: React/Vite SPA, Vercel functions,
Neon Postgres. Database tables are **created automatically** on first use — no
migration step needed. PDFs are stored in Neon (max 4MB per file).

---

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | What it does |
|---|---|---|
| `VITE_DATABASE_URL` | already set | Neon Postgres connection string |
| `APP_SECRET` | **recommended** | Secret for signing admin session tokens. Set a long random string (e.g. `openssl rand -hex 32`). Falls back to `WEBHOOK_SECRET`. |
| `ADMIN_BYPASS_PASSWORD` | **strongly recommended** | Replaces the hardcoded `admin123` CEO-bypass password. **Set this immediately.** |
| `DOCS_NOTIFY_EMAIL` | recommended | Where "proposal signed" / "payment reported" notifications are sent (your email). |
| `RESEND_API_KEY` | optional | Enables transactional email via Resend (client proposal/invoice emails + your notifications). You already use Resend for LIMITLESS. |
| `MAKE_WEBHOOK_NOTIFY` | optional | Fallback: if no Resend key, notifications POST `{to, subject, text, html}` to this Make.com webhook. |
| `STRIPE_SECRET_KEY` | for US clients | Stripe secret key. Use `sk_test_...` first, switch to `sk_live_...` when ready. |
| `STRIPE_WEBHOOK_SECRET` | for US clients | Signing secret of the Stripe webhook endpoint (below). |
| `PUBLIC_BASE_URL` | optional | Canonical origin for client links (e.g. `https://app.lithoslabs.agency`). Defaults to the request host. |

After changing env vars, redeploy.

## 2. Stripe setup (test mode first)

1. In the Stripe dashboard → Developers → API keys: copy the **secret key** → `STRIPE_SECRET_KEY`.
2. Developers → Webhooks → **Add endpoint**:
   - URL: `https://<your-domain>/api/webhooks?source=stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `payment_intent.payment_failed`
3. Copy the endpoint's **signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.
4. Test with a test-mode invoice (Stripe card `4242 4242 4242 4242`). The invoice flips to
   **Paid** only after the verified webhook arrives — never from the browser.
5. Going live: swap both values for live-mode ones and add a live webhook endpoint.

Note: Stripe checkout requires a Stripe-supported currency (use **USD** invoices for US
clients — AWG is not supported by Stripe).

## 3. First run

1. **Sign out and back in** to the CRM once after deploying — login now issues a secure
   session token that the Payments & Documents API requires.
2. Open **Payments & Documents → Settings** and fill in:
   - Business info, **Aruba bank details** (shown to bank-transfer clients), numbering
     prefixes, email sender.
   - Set each client's **type** (Aruba / United States / Other) — this picks the default
     payment method on invoices.

## 4. The workflow

**Proposal:** Proposals tab → New Proposal → pick client, title, amount, expiry → drag in
your PDF → *Create Client Link* (copies it) → send via WhatsApp/email or use *Send to
Client (email)*. The client reads the PDF in the browser, signs (draw or type), and the
system generates `...-SIGNED.pdf` (original preserved), flips status to **Signed**, and
notifies you. From the signed proposal → **Create Invoice** (pre-filled).

**Invoice:** upload the invoice PDF, create + copy the client link, send.
- **Aruba client** → sees your bank details → pays → clicks *I've Paid* → status becomes
  **Payment Reported** (never auto-paid) → you verify your bank account → *Confirm
  Payment* in the Overview or Payments tab → **Paid** (client page updates, optional
  confirmation email to the client).
- **US client** → *Pay Invoice* → Stripe Checkout → webhook verifies → **Paid** automatically.

**Links:** every link is a 256-bit random token — revoke/regenerate any time from the
detail view (old links stop working). View counts and last-viewed timestamps are tracked.

## 5. Security notes

- New endpoints require an admin session token (HMAC-signed, 14-day expiry).
- The financial tables (`proposals`, `invoices`, `payments`, `doc_*`) are **blocked** from
  the legacy open `/api/db` SQL endpoint.
- Stripe webhooks are signature-verified against the raw body, with idempotent payment
  inserts (retries and duplicate events are safe).
- Signature audit trail: signer name/email, timestamp, IP, user agent, SHA-256 of the
  exact PDF that was signed, and consent — plus a full event log per client (timeline).

### ⚠️ Outstanding items you should fix (pre-existing, not part of this feature)

1. **Make the GitHub repo private.** It currently exposes your CRM source including the
   admin bypass.
2. **Set `ADMIN_BYPASS_PASSWORD`** so `admin123` stops working.
3. `/api/db` still executes arbitrary SQL for the older tables (leads, deals, etc.) with
   no auth. Longer-term, move those to authenticated actions too.
4. Sales-rep passwords are stored/compared in plaintext (`password_hash` column holds the
   raw password). Worth hashing (bcrypt) when you next touch the team system.
