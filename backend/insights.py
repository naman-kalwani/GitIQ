import os
from dotenv import load_dotenv
from openai import AsyncOpenAI
from typing import List
from pydantic import BaseModel
import json

from models.responseModels import InsightResponse
from models.requestModels import LLMInsightRequest

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_insights(data: LLMInsightRequest) -> InsightResponse:
  SYSTEM_PROMPT = '''
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
    ""developer_type": "...",
    "experience_signal": "...",
    "summary": "...",
    "strengths": ["...", "...", "..."],
    "weaknesses": ["...", "...", "..."],
    "highlights_of_profile": "...",
    "recommendation": "...",
    "confidence": "low/medium/high"
    }
    
    Example : 
    {
    "developer_type": "AI/Backend Enthusiast",
    "experience_signal": "early-stage with growing project exposure",
    "Summary": "The developer shows a strong interest in AI and backend development, with a focus on LLM and RAG projects. However, they are still in the early stages of their journey, with limited community validation and project scale.",
    "strengths": [
      "Strong interest in LLM and AI systems",
      "Working with FastAPI and backend frameworks",
      "Exploring RAG and vector databases"
    ],
    "weaknesses": [
      "20 repos in 2 days possibly all dumped at once, indicating a lack of sustained development",
      "Limited project scale",
      "Low repository count"
    ],
    "highlights_of_profile": "systems this developer builds: GitIQ → AI/LLM + Backend System, AuctionIT → Real-time Full-stack (WebSockets), ARMAS → Distributed / Multi-agent system",
    "recommendation": "Good learning-stage candidate, needs more production-level projects",
    "confidence": "medium"
    }
    
    {
    "developer_type": "Full-Stack Developer",
    "experience_signal": "mid-level with diverse project experience",
    "Summary": "The developer demonstrates a well-rounded skill set with experience in both frontend and backend technologies. They have a decent number of repositories with a moderate star count, indicating some level of community engagement. Their activity level is medium, showing consistent contributions over time.",
    "strengths": [
      "Strong backend development using Node.js and Express (based on topics)",
      "Focused work across a small number of active repositories, suggesting deep involvement",
      "High recent activity with frequent commits indicating consistent development"
    ],
    "weaknesses": [
      "Limited use of advanced technologies or frameworks (e.g., no mention of AI/ML, cloud services)",
      "Activity level is not high, indicating room for more consistent contributions",
      " Work appears concentrated in a specific domain"
    ],
    "highlights_of_profile": "systems this developer builds: curanet → AI + full stack System, Microservices-Uber-Backend → backend system + microservices, secondBrain → Distributed / Multi-agent system",
    "recommendation": "Solid candidate with room for growth in project impact and community engagement",
    "confidence": "High"
  }
      
  '''
  USER_PROMPT = f'''
    Analyze the following GitHub profile data for the user : "{data.username}":
    {data.model_dump_json(indent=2)}
  '''
  
  messages = [
    {"role" : "system" , "content" : SYSTEM_PROMPT},
    {"role" : "user" , "content" : USER_PROMPT}
  ]

  response = await client.chat.completions.create(
    model="gpt-5.4-mini",
    messages=messages
  )
  
  content = response.choices[0].message.content
  print("LLM Response Content:", repr(content))  # Debug print
  try:
    insights_dict = json.loads(content)
    return InsightResponse(**insights_dict)
  except Exception as e:
    print("Error generating insights:", e)
    return InsightResponse(
      developer_type="Unknown",
      experience_signal="Unknown",
      summary="Unable to generate insights due to API error",
      strengths=[],
      weaknesses=[],
      highlights_of_profile="Unable to generate insights due to API error",
      recommendation="Check API configuration",
      confidence="low"
    )
  