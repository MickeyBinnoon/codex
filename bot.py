import os
import time
import sqlite3
import requests

DB_PATH = 'alchemist.db'
INTERVAL = int(os.getenv('BOT_INTERVAL', '300'))

API_BASE = os.getenv('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets')

def run_cycle(conn):
    cur = conn.cursor()
    cur.execute("SELECT id, alpaca_api_key, alpaca_secret_key FROM users WHERE is_active=1")
    users = cur.fetchall()
    for uid, api_key, secret_key in users:
        if not api_key or not secret_key:
            continue
        headers = {
            'APCA-API-KEY-ID': api_key,
            'APCA-API-SECRET-KEY': secret_key
        }
        try:
            r = requests.get(f"{API_BASE}/v2/account", headers=headers)
            if r.status_code != 200:
                print(f"User {uid} key error")
                continue
            # simple example: get portfolio value as total_return
            acct = r.json()
            equity = float(acct.get('equity', 0))
            cur.execute("UPDATE global_stats SET total_return=? WHERE id=1", (equity,))
            conn.commit()
        except Exception as e:
            print("error", e)

if __name__ == '__main__':
    while True:
        conn = sqlite3.connect(DB_PATH)
        run_cycle(conn)
        conn.close()
        time.sleep(INTERVAL)
