import asyncio
from app.core.scheduler import send_daily_analytics_summary

if __name__ == '__main__':
    asyncio.run(send_daily_analytics_summary())
