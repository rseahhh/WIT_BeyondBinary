from fastapi import FastAPI
from pydantic import BaseModel
from agent import BrowserAgent
from intent_parser import parse_intent, Clarify

app = FastAPI()
agent = BrowserAgent()

class CommandIn(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/command")
async def command(cmd: CommandIn):
    try:
        action = parse_intent(cmd.text)

        if isinstance(action, Clarify):
            return {"say": action.question}

        # --- executors ---
        if action.intent == "open_url":
            await agent.goto(action.url)
            return {"say": f"opened {action.url}"}

        if action.intent == "youtube_search":
            await agent.youtube_search(action.query)
            results = await agent.list_youtube_results(5)
            say = "top results. " + " ".join([f"{r['index']}. {r['title']}." for r in results])
            return {"say": say}

        if action.intent == "youtube_play":
            ok = await agent.play_youtube_result(action.index)
            return {"say": f"playing result {action.index}." if ok else "i couldn’t play that. say ‘list results’ or ‘search youtube …’ first."}

        if action.intent == "read_page":
            title = await agent.read_page_title()
            return {"say": f"page title is: {title}"}

        if action.intent == "summarize_page":
            # keep mvp simple: reuse title for now; upgrade later to real summary
            title = await agent.read_page_title()
            return {"say": f"quick summary: this page is about {title}."}

        if action.intent == "scroll":
            await agent.start()
            dy = action.amount if action.direction == "down" else -action.amount
            await agent.page.evaluate(f"window.scrollBy(0, {dy});")
            return {"say": f"scrolled {action.direction}."}

        return {"say": "i’m not sure what to do. try: ‘search youtube football’ or ‘open youtube’."}

    except Exception as e:
        print("backend error:", repr(e))
        return {"say": f"backend error: {e}"}
