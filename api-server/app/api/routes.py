from fastapi import APIRouter, BackgroundTasks
from app.schemas.payload import UnfollowPayload
from app.services.telegram import send_telegram_notification

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
    
    await send_telegram_notification(message)

@router.post("/unfollowers")
async def report_unfollowers(payload: UnfollowPayload, background_tasks: BackgroundTasks):
    """
    Endpoint equivalent to a Spring Boot @PostMapping or a PHP Route::post.
    Expects JSON matching UnfollowPayload schema.
    """
    # Trigger telegram alert in background to not block the request
    background_tasks.add_task(notify_unfollowers_async, payload)
    
    return {"status": "received", "count": len(payload.unfollowers)}
