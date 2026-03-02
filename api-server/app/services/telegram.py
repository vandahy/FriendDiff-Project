import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Map to Spring Boot's application.properties or PHP's .env
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

async def send_telegram_notification(message: str, chat_id: str = None) -> bool:
    """
    Sends a message via Telegram Bot API using httpx (similar to Guzzle in PHP).
    """
    target_chat_id = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target_chat_id:
        logger.warning("Telegram credentials or target chat ID not configured.")
        return False
        
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": target_chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=5.0)
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return False
