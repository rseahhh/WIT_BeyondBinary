from playwright.async_api import async_playwright

class BrowserAgent:
    def __init__(self):
        self.pw = None
        self.browser = None
        self.page = None

    async def start(self):
        if self.page: 
            return
        self.pw = await async_playwright().start()
        # launches a "chrome-like" chromium window
        self.browser = await self.pw.chromium.launch(headless=False)
        self.page = await self.browser.new_page()

    async def goto(self, url: str):
        await self.start()
        await self.page.goto(url)

    async def youtube_search(self, query: str):
        await self.goto(f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}")

    async def list_youtube_results(self, limit: int = 5):
        await self.start()
        # wait for results to appear
        await self.page.wait_for_selector("ytd-video-renderer", timeout=10000)
        items = await self.page.query_selector_all("ytd-video-renderer")  # top results
        out = []
        for i, it in enumerate(items[:limit], start=1):
            title_el = await it.query_selector("#video-title")
            title = (await title_el.inner_text()) if title_el else "untitled"
            title = " ".join(title.split())
            out.append({"index": i, "title": title[:120]})
        return out

    async def play_youtube_result(self, index: int):
        await self.start()
        await self.page.wait_for_selector("ytd-video-renderer", timeout=10000)
        items = await self.page.query_selector_all("ytd-video-renderer")
        idx = index - 1
        if idx < 0 or idx >= len(items):
            return False
        title_el = await items[idx].query_selector("#video-title")
        if not title_el:
            return False
        await title_el.click()
        return True

    async def read_page_title(self):
        await self.start()
        return await self.page.title()

    async def close(self):
        if self.browser:
            await self.browser.close()
        if self.pw:
            await self.pw.stop()
