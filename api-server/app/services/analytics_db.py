import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime

# Simple SQLite database to store daily analytics events
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'analytics.db')

def init_db():
    """Initializes the SQLite database with the analytics table if it doesn't exist."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                anonymous_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                extension_version TEXT,
                timestamp TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

def record_event(anonymous_id: str, event_type: str, extension_version: str, timestamp: str):
    """Records a single analytics event in the database."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO analytics_events (anonymous_id, event_type, extension_version, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (anonymous_id, event_type, extension_version, timestamp))
        conn.commit()

def get_daily_summary() -> dict:
    """
    Retrieves the daily summary of events and clears the table.
    Normally you might want to keep history, but for a simple daily summary, 
    we count then delete to keep the DB small.
    """
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # Count Installs
        cursor.execute("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'Install'")
        installs = cursor.fetchone()[0]
        
        # Count Actives
        cursor.execute("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'Active'")
        actives = cursor.fetchone()[0]
        
        # Clear the table so tomorrow is fresh
        cursor.execute("DELETE FROM analytics_events")
        conn.commit()
        
    return {
        "installs": installs,
        "actives": actives
    }
