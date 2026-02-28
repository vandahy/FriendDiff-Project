from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class UnfollowerItem(BaseModel):
    id: str  # maps to a Spring Boot String or PHP string identifier
    name: Optional[str] = None
    
    # Optional ConfigDict for pydantic V2
    model_config = ConfigDict(from_attributes=True)

class UnfollowPayload(BaseModel):
    unfollowers: List[UnfollowerItem]
    timestamp: Optional[int] = None
