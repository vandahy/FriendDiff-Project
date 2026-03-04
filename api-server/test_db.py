import sqlite3

def check_db():
    try:
        conn = sqlite3.connect('analytics.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM analytics_events')
        rows = cursor.fetchall()
        print(f"Total Rows: {len(rows)}")
        for r in rows:
            print(r)
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

check_db()
