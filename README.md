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
4. Run the bot worker in another process:
   ```bash
   python bot.py
   ```

The server exposes minimal endpoints for Google OAuth login, saving Alpaca keys, creating a Stripe checkout session and fetching global stats.
