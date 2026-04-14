import json
import os

import httpx
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("Missing OPENAI_API_KEY env var.")

openai_client = AsyncOpenAI(api_key=openai_api_key)


def github_headers() -> dict[str, str]:
    github_token = os.getenv("GITHUB_TOKEN")
    return {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
    }


def extract_readme_summary(readme: str) -> dict:
    lines = readme.strip().split("\n") if readme else []
    opening = readme[:300] if readme else ""
    headings = [line for line in lines if line.startswith("#")]
    total_chars = len(readme or "")
    total_lines = len(lines)

    return {
        "opening": opening,
        "headings": headings[:10],
        "total_chars": total_chars,
        "total_lines": total_lines,
    }


async def fetch_readme_text(owner: str, repo_name: str) -> str:
    if not owner or not repo_name:
        return ""

    url = f"https://api.github.com/repos/{owner}/{repo_name}/readme"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            url,
            headers={
                **github_headers(),
                "Accept": "application/vnd.github.raw+json",
            },
        )

    if response.status_code == 404:
        return ""

    response.raise_for_status()
    return response.text or ""


async def generate_repo_insights(
    username: str,
    repo_name: str,
    raw_data_json: dict,
    readme_summary: dict,
) -> dict:
    system_prompt = """
You are a senior engineering reviewer.
Analyze ONE GitHub repository and return ONLY valid JSON.

Return exactly this shape:
{
  "readme_grade": "missing|weak|basic|good",
  "readme_feedback": "string",
  "commit_pattern": "inconsistent|mixed|consistent",
  "commit_feedback": "string",
  "project_type_reasoning": "string",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string"]
}

Rules:
- Use only provided data.
- Keep strengths/weaknesses/recommendations short and concrete.
- If README is missing, grade must be "missing".
- If commit messages are generic (update/fix/changes), note it in commit_feedback.
""".strip()

    user_prompt = f"""
Repository owner: {username}
Repository name: {repo_name}

Raw repository telemetry:
{json.dumps(raw_data_json, ensure_ascii=True)}

README Analysis:
- Length: {readme_summary.get("total_chars", 0)} characters, {readme_summary.get("total_lines", 0)} lines
- Opening: "{readme_summary.get("opening", "")}"
- Sections found: {readme_summary.get("headings", [])}

Evaluate:
1. Has clear project description?
2. Has setup/install instructions?
3. Has usage examples?
4. Mentions tech stack?
5. Overall quality: missing/weak/basic/good
""".strip()

    response = await openai_client.chat.completions.create(
        model="gpt-5.4-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    content = response.choices[0].message.content
    parsed = json.loads(content)

    # Ensure the expected keys always exist.
    return {
        "readme_grade": parsed.get("readme_grade", "weak"),
        "readme_feedback": parsed.get("readme_feedback", "README quality could be improved."),
        "commit_pattern": parsed.get("commit_pattern", "mixed"),
        "commit_feedback": parsed.get("commit_feedback", "Commit history needs better message quality."),
        "is_tutorial": bool(parsed.get("is_tutorial", False)),
        "project_type_reasoning": parsed.get("project_type_reasoning", "Insufficient data."),
        "strengths": parsed.get("strengths", []),
        "weaknesses": parsed.get("weaknesses", []),
        "recommendations": parsed.get("recommendations", []),
    }
