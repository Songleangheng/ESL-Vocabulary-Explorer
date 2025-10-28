
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import type { TermData, Details, WordComparisonData, Meaning, ConversationChoice, TopicWebData, RegisterShiftData, DashboardStats, ComprehensionQuestion, DashboardSummary } from '../types';
import {
    INITIAL_SEARCH_SCHEMA, DETAILS_SEARCH_SCHEMA, SUGGESTION_SCHEMA, TRANSLATION_SCHEMA,
    SCENARIO_SCHEMA, GRAMMAR_SCHEMA, SIMPLIFY_SCHEMA, WORD_COMPARE_SCHEMA, SENTENCE_FEEDBACK_SCHEMA,
    CONTEXT_SENTENCE_SCHEMA, CONVERSATION_CHOICE_SCHEMA, CHAT_SUGGESTION_SCHEMA, TOPIC_WEB_SCHEMA,
    REGISTER_SHIFTER_SCHEMA, DASHBOARD_SUMMARY_SCHEMA, COMPREHENSION_CHECK_SCHEMA,
    INITIAL_SYSTEM_PROMPT, DETAILS_SYSTEM_PROMPT, SUGGESTION_SYSTEM_PROMPT,
    TRANSLATION_SYSTEM_PROMPT, SCENARIO_SYSTEM_PROMPT, GRAMMAR_SYSTEM_PROMPT, SIMPLIFY_SYSTEM_PROMPT,
    WORD_COMPARE_SYSTEM_PROMPT, SENTENCE_FEEDBACK_SYSTEM_PROMPT, CONTEXT_SENTENCE_SYSTEM_PROMPT,
    CONVERSATION_CHOICE_SYSTEM_PROMPT, CHAT_SUGGESTION_SYSTEM_PROMPT, TOPIC_WEB_SYSTEM_PROMPT,
    REGISTER_SHIFTER_SYSTEM_PROMPT, DASHBOARD_SUMMARY_SYSTEM_PROMPT, COMPREHENSION_CHECK_SYSTEM_PROMPT
} from '../constants';

const DEFAULT_API_KEY = process.env.API_KEY;
if (!DEFAULT_API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const model = 'gemini-2.5-flash';

async function attemptApiCall(prompt: string, systemInstruction: string, schema: object, apiKey: string): Promise<GenerateContentResponse> {
    const ai = new GoogleGenAI({ apiKey });
    return await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });
}

async function makeApiCall(prompt: string, systemInstruction: string, schema: object, userApiKey: string | null): Promise<GenerateContentResponse> {
    const isQuotaError = (error: any) => 
        error instanceof Error && (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED'));

    // Try with user key first
    if (userApiKey) {
        try {
            return await attemptApiCall(prompt, systemInstruction, schema, userApiKey);
        } catch (error: any) {
            const isInvalid = error.message.includes('API key not valid');
            if (isInvalid || isQuotaError(error)) {
                console.warn(`User API key failed (${isInvalid ? 'invalid' : 'quota'}). Falling back to default key.`);
                // Fall through to default key attempt
            } else {
                throw error; // Re-throw other errors
            }
        }
    }

    // Attempt with default key (or as a fallback)
    try {
        return await attemptApiCall(prompt, systemInstruction, schema, DEFAULT_API_KEY);
    } catch (error: any) {
        if (isQuotaError(error)) {
            // Throw a more user-friendly error if the final attempt fails with a quota issue.
            throw new Error("The API usage quota has been exceeded. If you've added your own API key, please check its usage. Otherwise, the application's daily limit may have been reached. Please try again later.");
        }
        throw error;
    }
}


function parseResponse(response: GenerateContentResponse): any {
    const text = response.text;
    if (!text || text.trim() === '{}') {
        throw new Error("The AI returned an empty response. Please try a different term.");
    }
    try {
        // Gemini sometimes returns JSON wrapped in markdown, so we strip it.
        const cleanedText = text.replace(/^```json\s*|```\s*$/g, '');
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("Received an invalid response from the AI.");
    }
}

export async function fetchInitialWordData(term: string, level: string, userApiKey: string | null): Promise<TermData> {
    const prompt = `Get vocabulary info for "${term}" (ESL Level: ${level}).`;
    const response = await makeApiCall(prompt, INITIAL_SYSTEM_PROMPT, INITIAL_SEARCH_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return { ...data, status: 'learning', imageB64: {}, details: {} };
}

export async function fetchMeaningDetails(termData: TermData, meaningIndex: number, level: string, userApiKey: string | null): Promise<TermData> {
    const term = termData.term;
    const meaning = termData.meanings[meaningIndex];
    if (!meaning?.partOfSpeech || !meaning.definition) {
        throw new Error("Invalid meaning object provided for detail search.");
    }
    const prompt = `Get detailed info for "${term}" (ESL Level: ${level}), meaning: "(${meaning.partOfSpeech}) ${meaning.definition}"`;
    const response = await makeApiCall(prompt, DETAILS_SYSTEM_PROMPT, DETAILS_SEARCH_SCHEMA, userApiKey);
    const detailsData: Details = parseResponse(response);

    const updatedTermData = { ...termData };
    if (!updatedTermData.details) updatedTermData.details = {};
    updatedTermData.details[meaningIndex] = detailsData;
    
    return updatedTermData;
}

export async function fetchSuggestions(topic: string, count: number, level: string, userApiKey: string | null): Promise<string[]> {
    const prompt = `Get ${count} vocabulary suggestions for the topic "${topic}" (ESL Level: ${level}).`;
    const response = await makeApiCall(prompt, SUGGESTION_SYSTEM_PROMPT, SUGGESTION_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return data.suggestions || [];
}

export async function fetchTopicWeb(topic: string, level: string, userApiKey: string | null): Promise<TopicWebData> {
    const prompt = `Generate a topic web for the word "${topic}" (ESL Level: ${level}).`;
    const response = await makeApiCall(prompt, TOPIC_WEB_SYSTEM_PROMPT, TOPIC_WEB_SCHEMA, userApiKey);
    return parseResponse(response);
}

export async function fetchTranslation(term: string, definition: string, language: string, userApiKey: string | null): Promise<string> {
    const prompt = `Translate the following definition of '${term}' into ${language}: "${definition}". Provide only the translated text.`;
    const response = await makeApiCall(prompt, TRANSLATION_SYSTEM_PROMPT, TRANSLATION_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return data.translation || "Translation not available.";
}

export async function fetchScenarios(term: string, pos: string, definition: string, level: string, userApiKey: string | null): Promise<string[]> {
    const prompt = `For the word "${term}" meaning "(${pos}) ${definition}", generate 5 short scenarios for an ${level} ESL learner.`;
    const response = await makeApiCall(prompt, SCENARIO_SYSTEM_PROMPT, SCENARIO_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return (data.scenarios || []).map((s: string) => s.replace(/^Scenario:\s*/, ''));
}

export async function fetchGrammarRules(term: string, level: string, userApiKey: string | null): Promise<string[]> {
    const prompt = `For the word "${term}", provide 2-3 essential grammar rules for an ${level} ESL learner.`;
    const response = await makeApiCall(prompt, GRAMMAR_SYSTEM_PROMPT, GRAMMAR_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return (data.rules || []).map((r: string) => r.replace(/^Rule:\s*/, ''));
}

export async function fetchSimplifiedDefinition(term: string, pos: string, definition: string, level: string, userApiKey: string | null): Promise<string> {
    const prompt = `Term: "${term}" (Meaning: "(${pos}) ${definition}", ESL Level: ${level}).`;
    const response = await makeApiCall(prompt, SIMPLIFY_SYSTEM_PROMPT, SIMPLIFY_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return data.simplifiedDefinition || "Could not simplify.";
}

export async function fetchWordComparison(word1: string, word2: string, level: string, userApiKey: string | null): Promise<WordComparisonData> {
    const prompt = `Explain the difference between "${word1}" and "${word2}" for an ${level} ESL learner.`;
    const response = await makeApiCall(prompt, WORD_COMPARE_SYSTEM_PROMPT, WORD_COMPARE_SCHEMA, userApiKey);
    return parseResponse(response);
}

export async function fetchSentenceFeedback(term: string, meaning: string, userSentence: string, level: string, userApiKey: string | null): Promise<any> {
    const prompt = `Term: "${term}" (Meaning: "${meaning}", ESL Level: ${level}). User's sentence: "${userSentence}". Please provide feedback.`;
    const response = await makeApiCall(prompt, SENTENCE_FEEDBACK_SYSTEM_PROMPT, SENTENCE_FEEDBACK_SCHEMA, userApiKey);
    return parseResponse(response);
}

export async function fetchContextSentence(term: string, meaning: Meaning, meaningIndex: number, level: string, userApiKey: string | null): Promise<{ sentence: string, correctMeaningIndex: number }> {
    const prompt = `For the word "${term}" with the specific meaning "(${meaning.partOfSpeech}) ${meaning.definition}", create a new context sentence for an ${level} ESL learner. The meaning index is ${meaningIndex}.`;
    const response = await makeApiCall(prompt, CONTEXT_SENTENCE_SYSTEM_PROMPT, CONTEXT_SENTENCE_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return data || { sentence: "Could not generate a sentence.", correctMeaningIndex: meaningIndex };
}

export async function fetchConversationChoice(term: string, meaning: Meaning, level: string, userApiKey: string | null): Promise<ConversationChoice> {
    const prompt = `Term: "${term}" (Meaning: "(${meaning.partOfSpeech}) ${meaning.definition}", ESL Level: ${level}). Create a conversation choice quiz.`;
    const response = await makeApiCall(prompt, CONVERSATION_CHOICE_SYSTEM_PROMPT, CONVERSATION_CHOICE_SCHEMA, userApiKey);
    return parseResponse(response);
}

export async function fetchRegisterShift(term: string, meaning: Meaning, example: string, level: string, userApiKey: string | null): Promise<RegisterShiftData> {
    // FIX: Use meaning.definition instead of undefined 'definition' variable.
    const prompt = `Term: "${term}" (Meaning: "(${meaning.partOfSpeech}) ${meaning.definition}", ESL Level: ${level}). Base sentence: "${example}".`;
    const response = await makeApiCall(prompt, REGISTER_SHIFTER_SYSTEM_PROMPT, REGISTER_SHIFTER_SCHEMA, userApiKey);
    return parseResponse(response);
}

export async function fetchDashboardSummary(stats: DashboardStats, learningWords: string[], userApiKey: string | null): Promise<DashboardSummary> {
    const learningWordsList = learningWords.length > 0 ? `They are currently learning these words: ${learningWords.slice(0, 5).join(', ')}.` : '';
    const prompt = `The user's stats are: Total Words: ${stats.totalWords}, Mastered: ${stats.masteredWords}, Depth Score: ${stats.depthPercentage}%, Average Time to Mastery: ${stats.avgTimeToMasteryHours?.toFixed(1) ?? 'N/A'} hours. ${learningWordsList}`;
    const response = await makeApiCall(prompt, DASHBOARD_SUMMARY_SYSTEM_PROMPT, DASHBOARD_SUMMARY_SCHEMA, userApiKey);
    return parseResponse(response);
}

export async function fetchComprehensionCheck(term: string, meaning: Meaning, level: string, userApiKey: string | null): Promise<ComprehensionQuestion[]> {
    // FIX: Use meaning.definition instead of undefined 'definition' variable.
    const prompt = `Generate comprehension questions for the term "${term}" (Meaning: "(${meaning.partOfSpeech}) ${meaning.definition}", ESL Level: ${level}).`;
    const response = await makeApiCall(prompt, COMPREHENSION_CHECK_SYSTEM_PROMPT, COMPREHENSION_CHECK_SCHEMA, userApiKey);
    const data = parseResponse(response);
    return data.questions || [];
}

export async function fetchChatSuggestions(terms: TermData[], level: string, userApiKey: string | null): Promise<string[]> {
    if (terms.length === 0) {
        return [
            "What's a common idiom in English?",
            "Can you explain the difference between 'affect' and 'effect'?",
            "Give me a synonym for 'happy'."
        ];
    }
    const termList = terms.map(t => `'${t.term}'`).join(', ');
    const prompt = `Student is studying: ${termList}.`;
    const systemInstruction = CHAT_SUGGESTION_SYSTEM_PROMPT.replace('{TERMS}', termList).replace('{LEVEL}', level);

    try {
        const response = await makeApiCall(prompt, systemInstruction, CHAT_SUGGESTION_SCHEMA, userApiKey);
        const data = parseResponse(response);
        return data.suggestions || [];
    } catch (e) {
        console.error("Failed to fetch chat suggestions:", e);
        // Provide fallback suggestions
        return [
            `What's the difference between ${terms[0].term} and...?`,
            `Can you use ${terms[0].term} in a funny sentence?`,
            "Tell me a short story using the words I'm studying."
        ];
    }
}

export async function speakWord(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            return reject(new Error('Your browser does not support speech synthesis.'));
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;

        utterance.onend = () => {
            resolve();
        };

        utterance.onerror = (event) => {
            reject(new Error(`Speech synthesis failed: ${event.error}`));
        };

        // Cancel any ongoing speech before starting a new one
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
}
