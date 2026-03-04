from fastapi import APIRouter, BackgroundTasks
from app.schemas.payload import UnfollowPayload, AnalyticsPayload
from app.services.telegram import send_telegram_notification
from app.services.analytics_db import record_event

router = APIRouter()

async def notify_unfollowers_async(payload: UnfollowPayload):
    """
    Background worker similar to Spring @Async or Laravel queued jobs.
    """
    if not payload.unfollowers:
        return
        
    names = [f"• {item.name or item.id}" for item in payload.unfollowers]
    names_str = "\n".join(names)
    message = f"<b>🚨 FriendDiff Alert</b>\n\nYou have {len(payload.unfollowers)} new unfollower(s):\n{names_str}"
    
    await send_telegram_notification(message, payload.telegram_chat_id)

@router.post("/unfollowers")
async def report_unfollowers(payload: UnfollowPayload, background_tasks: BackgroundTasks):
    """
    Endpoint equivalent to a Spring Boot @PostMapping or a PHP Route::post.
    Expects JSON matching UnfollowPayload schema.
    """
    # Trigger telegram alert in background to not block the request
    background_tasks.add_task(notify_unfollowers_async, payload)
    
    return {"status": "received", "count": len(payload.unfollowers)}

@router.post("/analytics")
async def report_analytics(payload: AnalyticsPayload, background_tasks: BackgroundTasks):
    """
    Receives analytics events from the extension and saves them for the daily summary.
    """
    # Write to DB in background
    def save_event():
        record_event(
            anonymous_id=payload.anonymous_id,
            event_type=payload.event_type,
            extension_version=payload.extension_version,
            timestamp=payload.timestamp
        )
    
    background_tasks.add_task(save_event)
    return {"status": "recorded"}

