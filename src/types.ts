export type CardType = 'identification' | 'enumeration' | 'fill-in-the-blank' | 'multiple-choice' | 'flip-card';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  type: CardType;
  options?: string[]; // For multiple-choice
  mastered?: boolean;
}

export interface Deck {
  id: string;
  name: string;
  cards: Flashcard[];
  progress: number;
  createdAt: number;
  updatedAt?: number;
  lastStudied?: number;
}

export type View = 'auth' | 'signup' | 'dashboard' | 'study' | 'edit' | 'profile';

export type StudyMode = 'classic' | 'timed' | 'mastery';

export const INITIAL_DECKS: Deck[] = [
  {
    id: '1',
    name: "Biology Basics",
    progress: 0.75,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    cards: [
      { id: '101', question: "What is photosynthesis?", answer: "The process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy.", type: 'identification', mastered: true },
      { id: '102', question: "What is the powerhouse of the cell?", answer: "Mitochondria", type: 'identification', mastered: true },
       { id: '103', question: "What is DNA?", answer: "Deoxyribonucleic acid, the hereditary material in humans and almost all other organisms.", type: 'identification', mastered: false },
    ],
  },
  {
    id: '2',
    name: "Spanish Vocabulary",
    progress: 0.33,
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
    cards: [
      { id: '201', question: "Hola", answer: "Hello", type: 'identification', mastered: true },
      { id: '202', question: "Adiós", answer: "Goodbye", type: 'identification', mastered: false },
      { id: '203', question: "Gracias", answer: "Thank you", type: 'identification', mastered: false },
    ],
  },
];
