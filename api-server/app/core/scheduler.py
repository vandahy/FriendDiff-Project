from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.analytics_db import get_daily_summary
from app.services.telegram import send_telegram_notification, ANALYTICS_BOT_TOKEN, ANALYTICS_CHAT_ID
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def send_daily_analytics_summary():
    """
    Job that runs daily to count database events and send the summary text.
    """
    try:
        summary = get_daily_summary()
        installs = summary.get("installs", 0)
        actives = summary.get("actives", 0)
        
        # Only send if there's activity to avoid empty spam, although daily empty reports can be validating
        message = (
            f"📊 <b>FriendDiff Daily Analytics</b>\n\n"
            f"<b>✅ Installations:</b> {installs}\n"
            f"<b>✅ Active Users:</b> {actives}\n\n"
            f"<i>Date: {datetime.now().strftime('%Y-%m-%d')}</i>"
        )
        
        await send_telegram_notification(
            message=message, 
            chat_id=ANALYTICS_CHAT_ID, 
            bot_token=ANALYTICS_BOT_TOKEN
        )
        logger.info(f"Daily analytics summary sent. Installs: {installs}, Actives: {actives}")
    except Exception as e:
        logger.error(f"Error executing daily analytics summary: {e}")

def setup_scheduler():
    scheduler = AsyncIOScheduler()
    # Schedule the job to run every day at 23:59 (11:59 PM)
    scheduler.add_job(send_daily_analytics_summary, 'cron', hour=23, minute=59)
    scheduler.start()
    return scheduler
