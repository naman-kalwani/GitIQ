from fastapi import APIRouter

from models.responseModels import HomeResponse


router = APIRouter(tags=["health"])


@router.get("/", response_model=HomeResponse)
def home() -> HomeResponse:
    return HomeResponse(message="GitIQ Backend Running 🚀")
