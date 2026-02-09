import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBrowserStore } from '@/store/browserStore'
import { useAppStore } from '@/store/appStore'

interface BrowserPanelProps {
  onPageContent: (content: string, title: string) => void
}

export function BrowserPanel({ onPageContent }: BrowserPanelProps) {
  const { url, setUrl, setPageTitle, setPageContent, setLoading } = useBrowserStore()
  const { isHighContrast, textScale } = useAppStore()
  const [inputUrl, setInputUrl] = useState(url)
  const webviewRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  const navigateTo = useCallback((targetUrl: string) => {
    let finalUrl = targetUrl
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`
    }
    setUrl(finalUrl)
    setInputUrl(finalUrl)
    if (webviewRef.current) {
      webviewRef.current.src = finalUrl
    }
  }, [setUrl])

  const extractContent = useCallback(async () => {
    if (!webviewRef.current) return null

    try {
      const result = await webviewRef.current.executeJavaScript(`
        (function() {
          const title = document.title || '';
          const mainEl = document.querySelector('article') ||
                         document.querySelector('main') ||
                         document.querySelector('[role="main"]') ||
                         document.body;

          const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .filter(el => el.offsetHeight > 0)
            .map(el => el.textContent.trim())
            .filter(Boolean);

          const paragraphs = Array.from(mainEl.querySelectorAll('p'))
            .filter(el => el.offsetHeight > 0 && el.textContent.trim().length > 20)
            .map(el => el.textContent.trim())
            .slice(0, 20);

          const links = Array.from(document.querySelectorAll('a'))
            .filter(el => el.offsetHeight > 0 && el.textContent.trim().length > 2)
            .map(el => el.textContent.trim())
            .slice(0, 20);

          const isYouTube = window.location.hostname.includes('youtube');
          let youtubeData = null;
          if (isYouTube) {
            const videoTitles = Array.from(document.querySelectorAll('#video-title'))
              .map(el => el.textContent.trim())
              .filter(Boolean)
              .slice(0, 10);
            const currentTitle = document.querySelector('h1.ytd-watch-metadata')?.textContent?.trim();
            youtubeData = { videoTitles, currentTitle };
          }

          return JSON.stringify({ title, headings, paragraphs, links, youtubeData, isYouTube, url: window.location.href });
        })()
      `)

      const data = JSON.parse(result)
      const contentParts = [
        `Title: ${data.title}`,
        data.headings.length ? `Headings: ${data.headings.join('. ')}` : '',
        data.paragraphs.length ? `Content: ${data.paragraphs.join(' ')}` : ''
      ].filter(Boolean)

      const content = contentParts.join('\n\n')
      setPageTitle(data.title)
      setPageContent(content)
      onPageContent(content, data.title)
      return data
    } catch (error) {
      console.error('Failed to extract content:', error)
      return null
    }
  }, [setPageTitle, setPageContent, onPageContent])

  // Set up webview event listeners using DOM events (not React props)
  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const handleFinishLoad = () => {
      setLoading(false)
      setIsReady(true)
      extractContent()
    }

    const handleStartLoading = () => {
      setLoading(true)
    }

    const handleNavigate = (e: any) => {
      setUrl(e.url)
      setInputUrl(e.url)
    }

    wv.addEventListener('did-finish-load', handleFinishLoad)
    wv.addEventListener('did-start-loading', handleStartLoading)
    wv.addEventListener('did-navigate', handleNavigate)
    wv.addEventListener('did-navigate-in-page', handleNavigate)

    return () => {
      wv.removeEventListener('did-finish-load', handleFinishLoad)
      wv.removeEventListener('did-start-loading', handleStartLoading)
      wv.removeEventListener('did-navigate', handleNavigate)
      wv.removeEventListener('did-navigate-in-page', handleNavigate)
    }
  }, [setLoading, setUrl, extractContent])

  // Inject high contrast CSS when settings change (only when webview is ready)
  useEffect(() => {
    if (!webviewRef.current || !isReady) return

    const css = isHighContrast
      ? `* { background-color: #000 !important; color: #fff !important; border-color: #666 !important; }
         a { color: #ffff00 !important; }
         img { filter: brightness(0.8) contrast(1.2); }
         h1, h2, h3, h4, h5, h6 { color: #00ffff !important; }
         button, input, select, textarea { background-color: #222 !important; color: #fff !important; border: 2px solid #fff !important; }
         body { font-size: ${textScale}% !important; }`
      : `body { font-size: ${textScale}% !important; }`

    try {
      webviewRef.current.insertCSS(css)
    } catch {
      // webview not ready yet
    }
  }, [isHighContrast, textScale, isReady])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigateTo(inputUrl)
  }

  // Expose for command system
  useEffect(() => {
    (window as any).__browserPanel = { navigateTo, extractContent, webviewRef }
  }, [navigateTo, extractContent])

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-b bg-card/50">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => webviewRef.current?.goBack()} aria-label="Go back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => webviewRef.current?.goForward()} aria-label="Go forward">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => webviewRef.current?.reload()} aria-label="Reload">
          <RotateCw className="w-4 h-4" />
        </Button>
        <div className="flex-1 flex items-center gap-2 bg-secondary rounded-md px-3 py-1">
          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Enter URL or say 'go to youtube'..."
            aria-label="URL address bar"
          />
        </div>
      </form>

      {/* Webview */}
      <div className="flex-1 relative">
        {/* @ts-ignore - webview is an Electron-only element */}
        <webview
          ref={webviewRef}
          src={url}
          className="w-full h-full absolute inset-0"
          allowpopups="true"
          partition="persist:vocaleyes"
          style={{ display: 'flex' }}
        />
      </div>
    </div>
  )
}
