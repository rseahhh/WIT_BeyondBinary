// Sign language gesture classification using MediaPipe hand landmarks
// Each hand has 21 landmarks with x, y, z coordinates

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface DetectedSign {
  sign: string
  confidence: number
  dialect: 'ASL' | 'ISL'
}

// Landmark indices
const WRIST = 0
const THUMB_TIP = 4
const THUMB_IP = 3
const THUMB_MCP = 2
const INDEX_TIP = 8
const INDEX_PIP = 6
const INDEX_MCP = 5
const MIDDLE_TIP = 12
const MIDDLE_PIP = 10
const MIDDLE_MCP = 9
const RING_TIP = 16
const RING_PIP = 14
const RING_MCP = 13
const PINKY_TIP = 20
const PINKY_PIP = 18
const PINKY_MCP = 17

function distance(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

function isFingerExtended(landmarks: HandLandmark[], tip: number, pip: number, mcp: number): boolean {
  // A finger is extended if tip is farther from wrist than pip
  const tipDist = distance(landmarks[tip], landmarks[WRIST])
  const pipDist = distance(landmarks[pip], landmarks[WRIST])
  return tipDist > pipDist * 1.05
}

function isThumbExtended(landmarks: HandLandmark[]): boolean {
  const tipDist = distance(landmarks[THUMB_TIP], landmarks[INDEX_MCP])
  const mcpDist = distance(landmarks[THUMB_MCP], landmarks[INDEX_MCP])
  return tipDist > mcpDist * 1.2
}

function getFingerStates(landmarks: HandLandmark[]): boolean[] {
  return [
    isThumbExtended(landmarks),
    isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP),
    isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP),
    isFingerExtended(landmarks, RING_TIP, RING_PIP, RING_MCP),
    isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP, PINKY_MCP)
  ]
}

function fingerPattern(states: boolean[]): string {
  return states.map(s => s ? '1' : '0').join('')
}

// ASL sign definitions based on finger patterns
const ASL_SIGNS: Record<string, { pattern: string; name: string; description: string }> = {
  // Common signs
  '11111': { pattern: '11111', name: 'Open Hand / Hello', description: 'All fingers extended - wave for hello or stop' },
  '00000': { pattern: '00000', name: 'Fist / Yes', description: 'Closed fist - ASL for "yes" or "S"' },
  '01000': { pattern: '01000', name: 'Point / One', description: 'Index finger pointing - number 1 or pointing' },
  '01100': { pattern: '01100', name: 'Peace / Two', description: 'Index and middle extended - number 2 or peace' },
  '01110': { pattern: '01110', name: 'Three / W', description: 'Index, middle, ring extended - number 3' },
  '01111': { pattern: '01111', name: 'Four', description: 'All fingers except thumb - number 4' },
  '10000': { pattern: '10000', name: 'Thumbs Up / Good', description: 'Thumb up - approval, "good", or number 10' },
  '10001': { pattern: '10001', name: 'Call Me / Six', description: 'Thumb and pinky extended - "call me" or 6' },
  '11001': { pattern: '11001', name: 'I Love You', description: 'ILY handshape - thumb, index, pinky extended' },
  '01001': { pattern: '01001', name: 'Rock On / Eight', description: 'Index and pinky extended' },
  '10100': { pattern: '10100', name: 'L / Loser', description: 'Thumb and index at right angle - letter L' },
  '00100': { pattern: '00100', name: 'Middle Finger', description: 'Middle finger only (filtered)' },
}

// ISL (Indian Sign Language) - similar base gestures with different meanings
const ISL_SIGNS: Record<string, { pattern: string; name: string; description: string }> = {
  '11111': { pattern: '11111', name: 'Namaste / Hello', description: 'Open palm - greeting in ISL' },
  '00000': { pattern: '00000', name: 'Haan (Yes)', description: 'Closed fist nod - ISL affirmation' },
  '01000': { pattern: '01000', name: 'Ek (One)', description: 'Index pointing - number one in ISL' },
  '01100': { pattern: '01100', name: 'Do (Two)', description: 'Two fingers - number two in ISL' },
  '10000': { pattern: '10000', name: 'Accha (Good)', description: 'Thumbs up - good/okay in ISL' },
  '11001': { pattern: '11001', name: 'Pyaar (Love)', description: 'ILY shape - love in ISL' },
  '01110': { pattern: '01110', name: 'Teen (Three)', description: 'Three fingers - number three in ISL' },
}

export function classifyGesture(landmarks: HandLandmark[], dialect: 'ASL' | 'ISL' = 'ASL'): DetectedSign | null {
  if (landmarks.length < 21) return null

  const states = getFingerStates(landmarks)
  const pattern = fingerPattern(states)

  const signs = dialect === 'ASL' ? ASL_SIGNS : ISL_SIGNS
  const match = signs[pattern]

  if (match) {
    // Filter out inappropriate gestures
    if (match.name === 'Middle Finger') return null

    return {
      sign: match.name,
      confidence: 0.85,
      dialect
    }
  }

  return null
}

export function classifyBothDialects(landmarks: HandLandmark[]): { asl: DetectedSign | null; isl: DetectedSign | null } {
  return {
    asl: classifyGesture(landmarks, 'ASL'),
    isl: classifyGesture(landmarks, 'ISL')
  }
}
