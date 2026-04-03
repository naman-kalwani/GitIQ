import os
from fastapi import FastAPI, HTTPException
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

app = FastAPI()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
origins = [
    "http://127.0.0.1:5173",
    # Add more origins here
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TopRepo(BaseModel):
    name: str
    stars: int


class AnalyzeResponse(BaseModel):
    username: str
    total_repos: int
    total_stars: int
    top_language: str
    top_repo: TopRepo

class HomeResponse(BaseModel):
    message: str


@app.get("/", response_model=HomeResponse)
def home() -> HomeResponse:
    return HomeResponse(message="GitIQ Backend Running 🚀")


@app.get("/analyze/{username}", response_model=AnalyzeResponse)
async def analyze_user(username: str) -> AnalyzeResponse:
    try:
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/users/{username}/repos",
                headers=headers
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json()
            )

        data = response.json()

        total_repos = len(data)
        freq_map: dict[str | None, int] = {}
        total_stars = 0

        for repo in data:
            language = repo.get("language") or "Unknown"
            total_stars += repo.get("stargazers_count", 0)
            freq_map[language] = freq_map.get(language, 0) + 1

        top_language = max(freq_map, key=freq_map.get) if freq_map else "None"

        top_repo = (
            max(data, key=lambda x: x.get("stargazers_count", 0))
            if data
            else {"name": "None", "stargazers_count": 0}
        )
        
        # Return the analysis results
        return AnalyzeResponse(
            username=username,
            total_repos=total_repos,
            total_stars=total_stars,
            top_language=top_language,
            top_repo=TopRepo(
                name=top_repo.get("name", "None"),
                stars=top_repo.get("stargazers_count", 0)
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
