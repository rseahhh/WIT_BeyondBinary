declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      src?: string
      allowpopups?: string
      partition?: string
      preload?: string
      nodeintegration?: string
      webpreferences?: string
    }, HTMLElement>
  }
}

interface Window {
  api: {
    getApiKey: () => Promise<string>
  }
  __browserPanel: {
    navigateTo: (url: string) => void
    extractContent: () => Promise<any>
    webviewRef: React.RefObject<any>
  }
}
