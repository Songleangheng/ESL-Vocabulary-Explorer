
import { Type } from '@google/genai';

export const ESL_LEVELS = [
    "Newbie", "Beginner", "Elementary", "Pre-intermediate", 
    "Intermediate", "Advanced"
];

// --- Schemas ---
export const INITIAL_SEARCH_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        term: { type: Type.STRING },
        phonetic: { type: Type.STRING, description: "IPA transcription in slashes, e.g., /wɜːd/" },
        syllables: { type: Type.STRING },
        meanings: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    partOfSpeech: { type: Type.STRING },
                    definition: { type: Type.STRING }
                },
                required: ["partOfSpeech", "definition"]
            }
        }
    },
    required: ["term", "phonetic", "syllables", "meanings"]
};

export const DETAILS_SEARCH_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        examples: { type: Type.ARRAY, items: { type: Type.STRING } },
        wordFamily: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, partOfSpeech: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } }, required: ["word", "partOfSpeech", "meaning", "example"] } },
        synonyms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } }, required: ["word", "meaning", "example"] } },
        antonyms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } }, required: ["word", "meaning", "example"] } },
        collocations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { heading: { type: Type.STRING, description: "The structural heading, e.g., 'Noun + TERM', 'Adverb + TERM', 'TERM + Noun'." }, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { phrase: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } }, required: ["phrase", "meaning", "example"] } } }, required: ["heading", "items"] } }
    },
    required: ["examples", "wordFamily", "synonyms", "antonyms", "collocations"]
};

export const SUGGESTION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        suggestions: { type: Type.ARRAY, items: { type: Type.STRING, description: "A single word or short phrase (2-3 words max)." } }
    },
    required: ["suggestions"]
};

export const TRANSLATION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        translation: { type: Type.STRING, description: "The translated text." }
    },
    required: ["translation"]
};

export const SCENARIO_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        scenarios: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "A short, specific, conversational scenario. Can be a dialogue." }
        }
    },
    required: ["scenarios"]
};

export const GRAMMAR_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        rules: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "A single, essential grammar rule, formatted with a heading and bullet points using markdown." }
        }
    },
    required: ["rules"]
};

export const SIMPLIFY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        simplifiedDefinition: { type: Type.STRING, description: "A super-short definition, 5 words or less." }
    },
    required: ["simplifiedDefinition"]
}

export const WORD_COMPARE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        word1: {
            type: Type.OBJECT,
            properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 clear example sentences. The target word must be bolded using markdown, e.g., 'This is an **example** sentence.'." }
            },
            required: ["term", "definition", "examples"]
        },
        word2: {
            type: Type.OBJECT,
            properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 clear example sentences. The target word must be bolded using markdown, e.g., 'This is an **example** sentence.'." }
            },
            required: ["term", "definition", "examples"]
        },
        summary: { type: Type.STRING, description: "A simple summary explaining the key difference." }
    },
    required: ["word1", "word2", "summary"]
};

export const SENTENCE_FEEDBACK_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        isCorrect: { type: Type.BOOLEAN, description: "True if the sentence is grammatically correct AND uses the term with the correct meaning." },
        feedback: { type: Type.STRING, description: "A 1-2 sentence encouraging comment. Start with 'Good try!' or 'Nice job!' or 'You're on the right track!'. Be specific about grammar or word choice." },
        explanation: { type: Type.STRING, description: "If incorrect, explain *why* in simple terms. e.g., 'We usually use [term] with [preposition]...' or 'The grammar here is a bit mixed up...'. If correct, say 'This sentence is perfect!'." },
        correctExamples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide 2-3 *different* correct example sentences using the term, relevant to the given meaning." }
    },
    required: ["isCorrect", "feedback", "explanation", "correctExamples"]
};

export const CONVERSATION_CHOICE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        scenario: { type: Type.STRING, description: "A 1-line scenario, e.g., 'Your friend asks: How was the movie?'" },
        choices: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "A possible response sentence using the target word." },
                    isCorrect: { type: Type.BOOLEAN, description: "True if this response is grammatically correct and conversationally appropriate." },
                    explanation: { type: Type.STRING, description: "A brief reason why this choice is correct or incorrect." }
                },
                required: ["text", "isCorrect", "explanation"]
            }
        }
    },
    required: ["scenario", "choices"]
};

export const CONTEXT_SENTENCE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        sentence: { type: Type.STRING, description: "A single, new sentence demonstrating the specified word meaning in context." },
        correctMeaningIndex: { type: Type.INTEGER, description: "The index of the meaning this sentence corresponds to." }
    },
    required: ["sentence", "correctMeaningIndex"]
};

export const CHAT_SUGGESTION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        suggestions: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.STRING, 
                description: "A short, engaging question a student might ask about the vocabulary." 
            } 
        }
    },
    required: ["suggestions"]
};

export const TOPIC_WEB_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING },
        categories: {
            type: Type.OBJECT,
            properties: {
                Synonyms: {
                    type: Type.OBJECT,
                    properties: {
                        words: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 single-word synonyms." },
                        phrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-5 synonymous phrases." }
                    },
                    required: ["words", "phrases"]
                },
                Antonyms: {
                    type: Type.OBJECT,
                    properties: {
                        words: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 single-word antonyms." },
                        phrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-5 antonymous phrases." }
                    },
                    required: ["words", "phrases"]
                },
                "Related Concepts": {
                    type: Type.OBJECT,
                    properties: {
                        words: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 related single words." },
                        phrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-5 related concepts as phrases." }
                    },
                    required: ["words", "phrases"]
                },
                Collocations: {
                    type: Type.OBJECT,
                    properties: {
                        words: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 single words that commonly collocate." },
                        phrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-5 common collocation phrases." }
                    },
                    required: ["words", "phrases"]
                },
            }
        }
    },
    required: ["topic", "categories"]
};

export const REGISTER_SHIFTER_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        casual: { type: Type.STRING },
        neutral: { type: Type.STRING },
        formal: { type: Type.STRING },
        academic: { type: Type.STRING },
        explanation: { type: Type.STRING }
    },
    required: ["casual", "neutral", "formal", "academic", "explanation"]
};

export const DASHBOARD_SUMMARY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        strength: { type: Type.STRING },
        suggestion: { type: Type.STRING },
        motivation: { type: Type.STRING }
    },
    required: ["strength", "suggestion", "motivation"]
};

export const COMPREHENSION_CHECK_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['mcq', 'fill-in-the-blank'] },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING }
                },
                required: ["type", "question", "correctAnswer"]
            }
        }
    },
    required: ["questions"]
};

// --- System Prompts ---
export const INITIAL_SYSTEM_PROMPT = `You are an ESL dictionary expert. Provide clear, concise, and accurate data for the given English word. Focus on the most common meanings.`;
export const DETAILS_SYSTEM_PROMPT = `You are an advanced ESL linguist. Provide detailed linguistic information for the given word and its specific meaning. Be comprehensive.`;
export const SUGGESTION_SYSTEM_PROMPT = `You are a helpful ESL teacher's assistant. Generate a list of relevant vocabulary words based on a topic.`;
export const TRANSLATION_SYSTEM_PROMPT = `You are a translation engine. Provide a direct and accurate translation.`;
export const SCENARIO_SYSTEM_PROMPT = `You are a creative writer for ESL materials. Write short, natural-sounding scenarios that clearly demonstrate the word's meaning.`;
export const GRAMMAR_SYSTEM_PROMPT = `You are an expert grammarian. Explain key grammar rules related to the word in simple, easy-to-understand terms.`;
export const SIMPLIFY_SYSTEM_PROMPT = `You are an expert at simplifying complex ideas. Provide a very short, simple definition (5 words or less) for an ESL learner.`;
export const WORD_COMPARE_SYSTEM_PROMPT = `You are an ESL teacher. Clearly explain the difference in meaning and usage between two similar words.`;
export const SENTENCE_FEEDBACK_SYSTEM_PROMPT = `You are a friendly and encouraging ESL tutor. Review the user's sentence, check for correct grammar and word usage, and provide helpful, constructive feedback.`;
export const CONTEXT_SENTENCE_SYSTEM_PROMPT = `You are an ESL curriculum developer. Write a clear sentence that uses the given word in a way that makes its specific meaning obvious from the context.`;
export const CONVERSATION_CHOICE_SYSTEM_PROMPT = `You are an ESL conversation coach. Create a realistic mini-dialogue where a user must choose the most natural and appropriate response using the target word.`;
export const CHAT_SUGGESTION_SYSTEM_PROMPT = `You are an AI assistant for an ESL student. Based on the words they are studying (Level: {LEVEL}, Terms: {TERMS}), generate 3-4 short, engaging follow-up questions they might have. Frame them as if the student is asking.`;
export const TOPIC_WEB_SYSTEM_PROMPT = `You are a visual learning expert. For the given topic, generate a structured web of related vocabulary, including synonyms, antonyms, related concepts, and collocations, separating single words and multi-word phrases.`;
export const REGISTER_SHIFTER_SYSTEM_PROMPT = `You are a sociolinguistics expert. Take the given term in its example sentence and show how to express the same idea across different registers: casual, neutral, formal, and academic. Provide a simple explanation.`;
export const DASHBOARD_SUMMARY_SYSTEM_PROMPT = `You are 'Visakha', a positive and encouraging AI language coach. Based on the user's learning stats, provide a short, motivational summary of their strengths, one friendly suggestion for improvement, and an inspiring call to action.`;
export const COMPREHENSION_CHECK_SYSTEM_PROMPT = `You are an ESL quiz creator. Generate 2-3 multiple-choice comprehension questions that test a deep understanding of the word's specific meaning. The questions should be subtle and require critical thinking, not just memorization.`;
export const VISAKHA_CHAT_PROMPT = `You are Visakha, a friendly and knowledgeable AI language coach from Cambodia, specializing in helping ESL learners. Your persona is encouraging, patient, and a little bit fun. You should use emojis to make the conversation more engaging. Your primary goal is to help users understand English vocabulary in depth. You can answer questions about definitions, usage, grammar, idioms, and more. When relevant, you can offer to create practice quizzes or give examples. You must not answer questions outside the topic of learning English. If the user asks something unrelated, gently steer them back to vocabulary. The user you are talking to is at the {LEVEL} English level, so tailor your explanations and language accordingly.`;
