import json
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

from models.requestModels import LLMInsightRequest
from models.responseModels import InsightResponse

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
  raise ValueError("Missing OPENAI_API_KEY env var.")

openai_client = AsyncOpenAI(api_key=openai_api_key)

async def generate_insights(data: LLMInsightRequest) -> InsightResponse:
  system_prompt = '''
  You are a senior technical recruiter.
  Analyze the developer strictly based on the provided data and return ONLY valid JSON.

  Rules:
  - limit responses to 4-5 sentences for summary and 3 points each for strengths and weaknesses
  - Based on the data, classify the developer into a specific type (e.g., "AI/Backend Enthusiast", "Full-Stack Developer", "Android Developer", etc.)
  - Be specific and avoid generic statements
  - Mention exact technologies (from languages/topics)
  - prioritize pinned repos for insights on current focus areas
  - check for average commits per repo to gauge sustained development vs dumping
  - Include activity behavior (recency, intensity)
  - Include collaboration signals (org experience)
  - Include work style (highly focused vs focused vs diverse)
  - provide genuine recommendation based on data and current market scenarios for specific roles
  - Avoid repeating raw data
  - Do not assume anything not present in the data
  - Output strictly valid JSON

  Return Format:
  {
  "developer_type": "...",
  "experience_signal": "...",
  "summary": "...",
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "highlights_of_profile": "...",
  "recommendation": "...",
  "confidence": "low/medium/high"
  }
  '''
  user_prompt = f'''
  Analyze the following GitHub profile data for the user : "{data.username}":
  {data.model_dump_json(indent=2)}
  '''

  response = await openai_client.chat.completions.create(
    model="gpt-5.4-mini",
    messages=[
      {"role": "system", "content": system_prompt},
      {"role": "user", "content": user_prompt},
    ],
  )

  content = response.choices[0].message.content
  try:
    insights_dict = json.loads(content)
    return InsightResponse(**insights_dict)
  except Exception:
    return InsightResponse(
      developer_type="Unknown",
      experience_signal="Unknown",
      summary="Unable to generate insights due to API error",
      strengths=[],
      weaknesses=[],
      highlights_of_profile="Unable to generate insights due to API error",
      recommendation="Check API configuration",
      confidence="low",
    )
