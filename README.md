# Aria - Voice-Driven Web Assistant

A voice-controlled web browsing assistant designed for visually impaired users. Aria combines natural language processing with browser automation to provide hands-free web navigation, YouTube search, and page reading capabilities.

## 🎯 Project Overview

Aria is an accessibility-focused application that enables users to browse the web, search YouTube, and consume content through voice commands and text-to-speech feedback. The application uses AI-powered intent parsing to understand natural language commands and executes them through automated browser control.

## 🏗️ Architecture

### Backend (`src/backend/`)
- **FastAPI Server** ([server.py](src/backend/server.py)) - REST API handling command processing
- **Browser Agent** ([agent.py](src/backend/agent.py)) - Playwright-based browser automation
- **Intent Parser** ([intent_parser.py](src/backend/intent_parser.py)) - AI-powered command interpretation using Groq LLM

### Frontend (`src/frontend/`)
- **Electron Desktop App** - Cross-platform desktop interface
- **Voice Recognition** - Web Speech API integration
- **Text-to-Speech** - Audio feedback for user interactions

## ✨ Features

### Core Capabilities
- 🎤 **Voice Command Input** - Speak commands naturally
- ⌨️ **Text Command Input** - Type commands manually
- 🔊 **Text-to-Speech Feedback** - Audio responses to all actions
- 🌐 **Web Navigation** - Open any URL via voice
- 🎥 **YouTube Integration**
  - Search YouTube videos
  - Play search results by index
  - List top search results
- 📄 **Page Interaction**
  - Read page titles
  - Summarize current page
  - Scroll up/down
- 🤖 **AI Intent Recognition** - Natural language understanding with fallback to clarification

### Supported Commands

| Command Type | Examples |
|-------------|----------|
| **Open URL** | "open youtube", "go to youtube.com", "open https://example.com" |
| **YouTube Search** | "search youtube football", "find cat videos on youtube" |
| **Play Results** | "play the first one", "play second result" |
| **Read Page** | "read this page", "narrate the page", "what does it say" |
| **Summarize** | "summarize this page" |
| **Scroll** | "scroll down", "scroll up" |

## 🛠️ Technology Stack

### Backend
- **Python 3.x**
- **FastAPI** - Modern web framework
- **Playwright** - Browser automation
- **Groq API** - LLM intent parsing (Llama 3.3 70B)
- **Pydantic** - Data validation

### Frontend
- **Electron** - Desktop application framework
- **Web Speech API** - Voice recognition
- **SpeechSynthesis API** - Text-to-speech

## 📋 Prerequisites

- Python 3.8+
- Node.js 14+
- Groq API key ([Get one here](https://console.groq.com))

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/WIT_BeyondBinary.git
cd WIT_BeyondBinary
```

### 2. Backend Setup
```bash
cd src/backend

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Set up environment variable
export GROQ_API_KEY="your_groq_api_key_here"
# On Windows use: set GROQ_API_KEY=your_groq_api_key_here
```

### 3. Frontend Setup
```bash
cd src/frontend

# Install Node dependencies
npm install
```

## ▶️ Running the Application

### Start Backend Server
```bash
cd src/backend
uvicorn server:app --host 127.0.0.1 --port 8000
```

The backend server will start at `http://127.0.0.1:8000`

### Start Frontend Application
In a new terminal:
```bash
cd src/frontend
npm start
```

## 💡 Usage

1. **Launch the application** - The Electron window will open
2. **Choose input method**:
   - Click 🎙️ **Voice** button and speak your command
   - Type your command in the text field and click **Send**
3. **Listen to feedback** - Aria will speak the response
4. **View interaction log** - All commands and responses appear in the log area

### Example Workflow
```
You: "search youtube cats"
Aria: "top results. 1. Funny Cats Compilation. 2. Cat Videos..."

You: "play the first one"
Aria: "playing result 1."

You: "scroll down"
Aria: "scrolled down."

You: "read this page"
Aria: "page title is: Funny Cats Compilation - YouTube"
```

## 🧠 How It Works

### Intent Parsing Pipeline
1. **Rule-Based Matching** - Fast pattern matching for common commands
2. **LLM Fallback** - Groq LLM parses ambiguous or complex commands
3. **Validation** - Pydantic models ensure type-safe command execution
4. **Clarification** - If intent is unclear, Aria asks for clarification

### Browser Automation
- Headless browser launched via Playwright
- Persistent session across commands
- Automatic waiting for page elements
- YouTube-specific selectors for reliable video interaction

## 📁 Project Structure

```
WIT_BeyondBinary/
├── src/
│   ├── backend/
│   │   ├── server.py           # FastAPI REST API
│   │   ├── agent.py            # Browser automation logic
│   │   ├── intent_parser.py    # AI-powered intent recognition
│   │   └── requirements.txt    # Python dependencies
│   └── frontend/
│       ├── index.html          # UI layout
│       ├── main.js             # Electron main process
│       ├── renderer.js         # UI logic & event handling
│       ├── preload.js          # Secure IPC bridge
│       └── package.json        # Node dependencies
├── app/                        # Additional app resources (empty)
├── public/                     # Static assets (empty)
└── README.md
```

## 🔒 Security Considerations

- **Context Isolation** - Electron preload script uses `contextBridge`
- **Environment Variables** - API keys stored in environment, not code
- **Local-Only Backend** - Server binds to localhost only

## 🙏 Acknowledgments

- Built with accessibility in mind for visually impaired users
- Powered by Groq's Llama 3.3 70B model
- Uses Playwright for reliable browser automation
- Electron for cross-platform desktop support

