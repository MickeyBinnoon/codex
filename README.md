# Alchemist

Simple prototype implementing backend for Alchemist trading bot.

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the bot worker in another process:
   ```bash
   python bot.py
   ```

Run tests with:
```bash
npm test
```

The server exposes minimal endpoints for Google OAuth login, saving Alpaca keys, creating a Stripe checkout session and fetching global stats.

### Required environment variables

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET
SESSION_SECRET
ENCRYPTION_KEY
SUCCESS_URL
CANCEL_URL
PORT
```
