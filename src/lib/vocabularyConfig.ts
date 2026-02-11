import { SignCategory } from "@/types/hand";

export interface SignDefinition {
  label: string;
  displayName: string;
  category: SignCategory;
  description: string;
}

export const VOCABULARY: SignDefinition[] = [
  // Letters A-Z
  {
    label: "A",
    displayName: "A",
    category: "letter",
    description: "Fist with thumb to the side",
  },
  {
    label: "B",
    displayName: "B",
    category: "letter",
    description: "Four fingers extended, thumb curled",
  },
  {
    label: "C",
    displayName: "C",
    category: "letter",
    description: "Curved hand, partially open",
  },
  {
    label: "D",
    displayName: "D",
    category: "letter",
    description: "Index up, thumb touches middle",
  },
  {
    label: "E",
    displayName: "E",
    category: "letter",
    description: "All curled, tips touching thumb",
  },
  {
    label: "F",
    displayName: "F",
    category: "letter",
    description: "Thumb + index circle, others extended",
  },
  {
    label: "G",
    displayName: "G",
    category: "letter",
    description: "Thumb + index pointing sideways",
  },
  {
    label: "H",
    displayName: "H",
    category: "letter",
    description: "Index + middle pointing sideways",
  },
  {
    label: "I",
    displayName: "I",
    category: "letter",
    description: "Pinky only extended",
  },
  {
    label: "J",
    displayName: "J",
    category: "letter",
    description: "Pinky extended, draw a J motion",
  },
  {
    label: "K",
    displayName: "K",
    category: "letter",
    description: "Index + middle + thumb extended",
  },
  {
    label: "L",
    displayName: "L",
    category: "letter",
    description: "Thumb + index in L shape",
  },
  {
    label: "M",
    displayName: "M",
    category: "letter",
    description: "Thumb under ring finger in fist",
  },
  {
    label: "N",
    displayName: "N",
    category: "letter",
    description: "Thumb between middle and ring",
  },
  {
    label: "O",
    displayName: "O",
    category: "letter",
    description: "All curled, thumb + index circle",
  },
  {
    label: "P",
    displayName: "P",
    category: "letter",
    description: "Like K but fingers point down",
  },
  {
    label: "Q",
    displayName: "Q",
    category: "letter",
    description: "Like L but fingers point down",
  },
  {
    label: "R",
    displayName: "R",
    category: "letter",
    description: "Index + middle crossed",
  },
  {
    label: "S",
    displayName: "S",
    category: "letter",
    description: "Fist with thumb over fingers",
  },
  {
    label: "T",
    displayName: "T",
    category: "letter",
    description: "Thumb tucked between index + middle",
  },
  {
    label: "U",
    displayName: "U",
    category: "letter",
    description: "Index + middle together, pointing up",
  },
  {
    label: "V",
    displayName: "V",
    category: "letter",
    description: "Index + middle spread apart",
  },
  {
    label: "W",
    displayName: "W",
    category: "letter",
    description: "Index + middle + ring extended",
  },
  {
    label: "X",
    displayName: "X",
    category: "letter",
    description: "Index hooked, others curled",
  },
  {
    label: "Y",
    displayName: "Y",
    category: "letter",
    description: "Thumb + pinky extended",
  },
  {
    label: "Z",
    displayName: "Z",
    category: "letter",
    description: "Index extended, draw a Z motion",
  },

  // Numbers 1-10
  {
    label: "1",
    displayName: "1",
    category: "number",
    description: "Index finger up",
  },
  {
    label: "2",
    displayName: "2",
    category: "number",
    description: "Index + middle spread",
  },
  {
    label: "3",
    displayName: "3",
    category: "number",
    description: "Thumb + index + middle",
  },
  {
    label: "4",
    displayName: "4",
    category: "number",
    description: "Four fingers, no thumb",
  },
  {
    label: "5",
    displayName: "5",
    category: "number",
    description: "All five fingers spread",
  },
  {
    label: "6",
    displayName: "6",
    category: "number",
    description: "Thumb + pinky touching, others up",
  },
  {
    label: "7",
    displayName: "7",
    category: "number",
    description: "Thumb + ring touching, others up",
  },
  {
    label: "8",
    displayName: "8",
    category: "number",
    description: "Thumb + middle touching, others up",
  },
  {
    label: "9",
    displayName: "9",
    category: "number",
    description: "Thumb + index circle, others up",
  },
  {
    label: "10",
    displayName: "10",
    category: "number",
    description: "Thumbs up, shake hand",
  },

  // Phrases
  {
    label: "ILY",
    displayName: "I Love You",
    category: "phrase",
    description: "Thumb + index + pinky extended",
  },
  {
    label: "GOOD",
    displayName: "Good",
    category: "phrase",
    description: "Thumbs up",
  },
  {
    label: "BAD",
    displayName: "Bad",
    category: "phrase",
    description: "Thumbs down",
  },
  {
    label: "OK",
    displayName: "OK",
    category: "phrase",
    description: "Thumb + index circle, fingers spread",
  },
  {
    label: "STOP",
    displayName: "Stop",
    category: "phrase",
    description: "Open palm, fingers together",
  },
  {
    label: "HI",
    displayName: "Hello",
    category: "phrase",
    description: "Open hand, fingers spread",
  },

  // New phrases
  {
    label: "THANK_YOU",
    displayName: "Thank You",
    category: "phrase",
    description: "Flat hand moves from chin forward",
  },
  {
    label: "YES",
    displayName: "Yes",
    category: "phrase",
    description: "Fist nodding up and down",
  },
  {
    label: "NO",
    displayName: "No",
    category: "phrase",
    description: "Index + middle close together repeatedly",
  },
  {
    label: "PLEASE",
    displayName: "Please",
    category: "phrase",
    description: "Flat hand circles on chest",
  },
  {
    label: "SORRY",
    displayName: "Sorry",
    category: "phrase",
    description: "Fist circles on chest",
  },
  {
    label: "DONE",
    displayName: "Done",
    category: "phrase",
    description: "Open hands flick outward",
  },
];

export function getSignDefinition(label: string): SignDefinition | undefined {
  return VOCABULARY.find((s) => s.label === label);
}

export function getSignsByCategory(category: SignCategory): SignDefinition[] {
  return VOCABULARY.filter((s) => s.category === category);
}
