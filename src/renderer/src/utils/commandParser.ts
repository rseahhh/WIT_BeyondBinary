export interface ParsedCommand {
  type: 'navigate' | 'read' | 'click' | 'scroll' | 'search' | 'contrast' | 'textsize' | 'mode' | 'stop' | 'help' | 'youtube' | 'volume' | 'chat'
  payload?: string
}

const SITE_SHORTCUTS: Record<string, string> = {
  'youtube': 'https://www.youtube.com',
  'google': 'https://www.google.com',
  'wikipedia': 'https://www.wikipedia.org',
  'bbc': 'https://www.bbc.com',
  'cnn': 'https://www.cnn.com',
  'reddit': 'https://www.reddit.com'
}

export function parseCommand(transcript: string): ParsedCommand | null {
  const text = transcript.toLowerCase().trim()

  // Stop commands
  if (['stop', 'quiet', 'shut up', 'stop reading', 'be quiet', 'silence'].some(c => text.includes(c))) {
    return { type: 'stop' }
  }

  // Help
  if (text === 'help' || text.includes('what can you do') || text.includes('list commands')) {
    return { type: 'help' }
  }

  // Read page
  if (text.includes('read this') || text.includes('read the page') || text.includes('read article') || text.includes('read page') || text === 'read') {
    return { type: 'read' }
  }

  // Navigation
  if (text.startsWith('go to ') || text.startsWith('open ') || text.startsWith('navigate to ')) {
    const target = text.replace(/^(go to |open |navigate to )/, '').trim()
    const url = SITE_SHORTCUTS[target] || (target.includes('.') ? `https://${target}` : null)
    if (url) return { type: 'navigate', payload: url }
    // If it doesn't look like a URL, search for it
    return { type: 'search', payload: target }
  }

  // Search
  if (text.startsWith('search for ') || text.startsWith('search ') || text.startsWith('look up ')) {
    const query = text.replace(/^(search for |search |look up )/, '').trim()
    return { type: 'search', payload: query }
  }

  // Click
  if (text.startsWith('click ') || text.startsWith('press ') || text.startsWith('select ')) {
    const target = text.replace(/^(click |press |select )/, '').trim()
    return { type: 'click', payload: target }
  }

  // Scroll
  if (text.includes('scroll down') || text.includes('page down')) {
    return { type: 'scroll', payload: 'down' }
  }
  if (text.includes('scroll up') || text.includes('page up')) {
    return { type: 'scroll', payload: 'up' }
  }
  if (text.includes('scroll to top') || text.includes('go to top')) {
    return { type: 'scroll', payload: 'top' }
  }
  if (text.includes('scroll to bottom') || text.includes('go to bottom')) {
    return { type: 'scroll', payload: 'bottom' }
  }

  // High contrast
  if (text.includes('high contrast') || text.includes('contrast mode')) {
    return { type: 'contrast' }
  }

  // Text size
  if (text.includes('text bigger') || text.includes('bigger text') || text.includes('increase text') || text.includes('zoom in') || text.includes('larger text')) {
    return { type: 'textsize', payload: 'increase' }
  }
  if (text.includes('text smaller') || text.includes('smaller text') || text.includes('decrease text') || text.includes('zoom out')) {
    return { type: 'textsize', payload: 'decrease' }
  }

  // Mode switching
  if (text.includes('show camera') || text.includes('open camera') || text.includes('sign language') || text.includes('eye tracking')) {
    return { type: 'mode', payload: 'camera' }
  }
  if (text.includes('show browser') || text.includes('open browser') || text.includes('browse')) {
    return { type: 'mode', payload: 'browser' }
  }

  // YouTube
  if (text.includes('what video') || text.includes('list video') || text.includes('show video')) {
    return { type: 'youtube', payload: 'list' }
  }
  if (text.includes('play first') || text.includes('first video') || text.includes('click first')) {
    return { type: 'youtube', payload: 'play-1' }
  }
  if (text.includes('play second') || text.includes('second video')) {
    return { type: 'youtube', payload: 'play-2' }
  }
  if (text.includes('play third') || text.includes('third video')) {
    return { type: 'youtube', payload: 'play-3' }
  }
  if (text === 'play' || text === 'pause' || text.includes('play video') || text.includes('pause video')) {
    return { type: 'youtube', payload: 'toggle-play' }
  }

  // Volume
  if (text.includes('volume up') || text.includes('louder')) {
    return { type: 'volume', payload: 'up' }
  }
  if (text.includes('volume down') || text.includes('quieter') || text.includes('softer')) {
    return { type: 'volume', payload: 'down' }
  }
  if (text.includes('mute') || text.includes('unmute')) {
    return { type: 'volume', payload: 'mute' }
  }

  // If nothing matched, treat as chat message
  if (text.length > 3) {
    return { type: 'chat', payload: transcript }
  }

  return null
}

export const HELP_TEXT = `Available voice commands:
- "Read this page" - reads the current page aloud
- "Go to [website]" - navigates to a site (e.g., "go to youtube")
- "Search for [query]" - searches Google
- "Click [text]" - clicks a button or link
- "Scroll down" or "Scroll up" - scrolls the page
- "High contrast" - toggles high contrast mode
- "Make text bigger" or "Make text smaller" - adjusts text size
- "Show camera" - opens sign language recognition
- "Show browser" - switches back to browsing
- "What videos are here?" - lists YouTube video titles
- "Play first video" - plays the first YouTube result
- "Play" or "Pause" - controls video playback
- "Volume up" or "Volume down" - adjusts volume
- "Stop" - stops reading or speaking
- "Help" - lists these commands
- Or just ask any question and the AI will respond!`
