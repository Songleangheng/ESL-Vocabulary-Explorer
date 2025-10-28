import type { ReactElement } from 'react';

export interface Meaning {
  partOfSpeech: string;
  definition: string;
}

export interface WordFamilyMember {
  word: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
}

export interface Synonym {
  word: string;
  meaning: string;
  example: string;
}

export interface Antonym extends Synonym {}

export interface CollocationItem {
  phrase: string;
  meaning: string;
  example: string;
}

export interface Collocation {
  heading: string;
  items: CollocationItem[];
}

export interface Translation {
  language: string;
  text: string;
}

export interface Scenario {
  text: string;
}

export interface GrammarRule {
  text: string;
}

export interface SimplifiedDefinition {
    text: string;
}

export interface Details {
  examples: string[];
  wordFamily: WordFamilyMember[];
  synonyms: Synonym[];
  antonyms: Antonym[];
  collocations: Collocation[];
  translations?: Translation[];
  scenarios?: Scenario[];
  grammarRules?: GrammarRule[];
  simplifiedDefinition?: SimplifiedDefinition;
  registerShift?: RegisterShiftData;
  comprehensionQs?: ComprehensionQuestion[];
  conversationChoices?: ConversationChoice[];
  contextSentences?: { sentence: string; correctMeaningIndex: number }[];
}

export interface TermData {
  term: string;
  phonetic: string;
  syllables: string;
  meanings: Meaning[];
  status?: 'learning' | 'mastered';
  imageB64?: { [key: number]: string | null };
  details?: { [key: number]: Details };
  addedTimestamp?: number;
  masteredTimestamp?: number;
}

export interface Library {
  [key: string]: TermData;
}

export interface WordComparisonData {
  word1: {
    term: string;
    definition: string;
    examples: string[];
  };
  word2: {
    term: string;
    definition: string;
    examples: string[];
  };
  summary: string;
}

export interface ConversationChoice {
    scenario: string;
    choices: {
        text: string;
        isCorrect: boolean;
        explanation: string;
    }[];
}

export interface TopicWebData {
    topic: string;
    categories: {
        [key: string]: {
            words: string[];
            phrases: string[];
        };
    };
}

export interface RegisterShiftData {
    casual: string;
    neutral: string;
    formal: string;
    academic: string;
    explanation: string;
}

export interface ComprehensionQuestion {
    type: 'mcq' | 'fill-in-the-blank';
    question: string;
    options?: string[];
    correctAnswer: string;
}

export interface DashboardStats {
    totalWords: number;
    masteredWords: number;
    learningWords: number;
    depthPercentage: number;
    avgTimeToMasteryHours: number | null;
    accuracyTrend: { timestamp: number; accuracy: number }[];
}

export interface DashboardSummary {
    strength: string;
    suggestion: string;
    motivation: string;
}


export interface QuizAttempt {
    timestamp: number;
    quizType: PracticeType;
    score: number;
    total: number;
}


export type PracticeType = 
  | 'meaningMatch' 
  | 'sentence' 
  | 'synonym' 
  | 'collocation' 
  | 'pos' 
  | 'sentencePractice'
  | 'spellingBee'
  | 'syntaxScramble'
  | 'contextCheck'
  | 'conversationChoice'
  | 'collocationMatch'
  | 'comprehensionCheck';

export interface PracticeOption {
    id: PracticeType;
    title: string;
    description: string;
    icon: ReactElement;
    minRequired: number;
    dataCheck: (term: TermData) => boolean;
    warning: string;
}

// Assessment Types
export type AssessmentQuestionType = 'mcq' | 'fill-in-the-blank' | 'match' | 'written';

export interface MCQAssessmentQuestion {
    id: string;
    type: 'mcq';
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface FillBlankAssessmentQuestion {
    id: string;
    type: 'fill-in-the-blank';
    sentence: string; // e.g., "The plan was too ____."
    correctAnswer: string;
}

export interface MatchItem {
    id: string;
    term: string;
}

export interface MatchTarget {
    id: string;
    definition: string;
}

export interface MatchAssessmentQuestion {
    id: string;
    type: 'match';
    instruction: string;
    items: MatchItem[];
    targets: MatchTarget[];
    correctPairs: { [itemId: string]: string }; // itemId -> targetId
}

export interface WrittenAssessmentQuestion {
    id: string;
    type: 'written';
    prompt: string; // e.g., "Write a sentence using 'ambiguous'."
    modelAnswer: string;
}

export type AssessmentQuestion = MCQAssessmentQuestion | FillBlankAssessmentQuestion | MatchAssessmentQuestion | WrittenAssessmentQuestion;

export interface AssessmentData {
    title: string;
    questions: AssessmentQuestion[];
}