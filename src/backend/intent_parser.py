import json
import os
import re
from typing import Literal, Optional, Union

from pydantic import BaseModel, ValidationError
from groq import Groq

# ---- command schema ----
class OpenURL(BaseModel):
    intent: Literal["open_url"]
    url: str

class YouTubeSearch(BaseModel):
    intent: Literal["youtube_search"]
    query: str

class YouTubePlay(BaseModel):
    intent: Literal["youtube_play"]
    index: int

class ReadPage(BaseModel):
    intent: Literal["read_page"]

class SummarizePage(BaseModel):
    intent: Literal["summarize_page"]

class Scroll(BaseModel):
    intent: Literal["scroll"]
    direction: Literal["up", "down"]
    amount: int = 800

class Clarify(BaseModel):
    intent: Literal["clarify"]
    question: str

Command = Union[OpenURL, YouTubeSearch, YouTubePlay, ReadPage, SummarizePage, Scroll, Clarify]

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM = """
you are an intent parser for a voice-driven web assistant for visually impaired users.
you must output only valid json (no markdown).
choose exactly one intent from:
open_url, youtube_search, youtube_play, read_page, summarize_page, scroll, clarify.

rules:
- if user asks to go to youtube or watch videos, prefer youtube_search or open_url.
- if user says "play the first/second/..." map to youtube_play with index.
- if user asks to read/narrate the current webpage, use read_page.
- if user asks to summarize, use summarize_page.
- if user says scroll up/down, use scroll.
- if missing info (e.g., "play it" but no list exists), use clarify with a short question.

json formats:
{"intent":"open_url","url":"https://youtube.com"}
{"intent":"youtube_search","query":"football highlights"}
{"intent":"youtube_play","index":1}
{"intent":"read_page"}
{"intent":"summarize_page"}
{"intent":"scroll","direction":"down","amount":800}
{"intent":"clarify","question":"do you want me to search youtube, or open a specific site?"}
""".strip()

def _cheap_rules(text: str) -> Optional[dict]:
    t = text.lower().strip()

    # play first/second/third...
    m = re.search(r"\bplay\b.*\b(first|1st|one)\b", t)
    if m:
        return {"intent": "youtube_play", "index": 1}
    m = re.search(r"\bplay\b.*\b(second|2nd|two)\b", t)
    if m:
        return {"intent": "youtube_play", "index": 2}
    m = re.search(r"\bplay\b.*\b(third|3rd|three)\b", t)
    if m:
        return {"intent": "youtube_play", "index": 3}

    # explicit "search youtube ..."
    if "youtube" in t and ("search" in t or "find" in t or "look for" in t or "watch" in t):
        q = t
        q = q.replace("youtube", "")
        q = re.sub(r"\b(search|find|look for|watch|video|videos|on)\b", " ", q)
        q = " ".join(q.split())
        if q:
            return {"intent": "youtube_search", "query": q}

    # open youtube
    if "youtube" in t and ("open" in t or "go to" in t):
        return {"intent": "open_url", "url": "https://www.youtube.com"}

    # scroll
    if "scroll" in t and "down" in t:
        return {"intent": "scroll", "direction": "down", "amount": 800}
    if "scroll" in t and "up" in t:
        return {"intent": "scroll", "direction": "up", "amount": 800}

    # read / summarize
    if any(x in t for x in ["read this", "read page", "narrate", "what does it say"]):
        return {"intent": "read_page"}
    if "summar" in t:
        return {"intent": "summarize_page"}

    # url present
    url_m = re.search(r"(https?://\S+|www\.\S+)", t)
    if url_m:
        u = url_m.group(1)
        if u.startswith("www."):
            u = "https://" + u
        return {"intent": "open_url", "url": u}

    return None

def parse_intent(text: str) -> Command:
    # 1) rules first (fast + reliable)
    ruled = _cheap_rules(text)
    if ruled:
        return _validate(ruled)

    # 2) llm parse (handles "any phrasing")
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},  # groq json mode
    )

    content = resp.choices[0].message.content
    data = json.loads(content)
    return _validate(data)

def _validate(data: dict) -> Command:
    # strict validation so your executor never sees garbage
    for cls in (OpenURL, YouTubeSearch, YouTubePlay, ReadPage, SummarizePage, Scroll, Clarify):
        try:
            return cls(**data)
        except ValidationError:
            pass
    return Clarify(intent="clarify", question="i got that, but i’m not sure what action to take. do you want youtube search, open a site, or read this page?")
