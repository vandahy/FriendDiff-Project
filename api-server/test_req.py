import httpx
import asyncio

async def main():
    payload = {
        "anonymous_id": "1234-test-1234-test",
        "extension_version": "1.0.0",
        "event_type": "Install",
        "timestamp": "2026-03-04T12:00:00Z"
    }
    
    async with httpx.AsyncClient() as client:
        r = await client.post("http://127.0.0.1:8000/api/analytics", json=payload)
        print("Status", r.status_code)
        print("Response", r.text)

asyncio.run(main())
