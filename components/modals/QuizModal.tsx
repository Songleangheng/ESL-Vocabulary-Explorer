
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../ui/Modal';
import type { TermData, PracticeType, ConversationChoice, ComprehensionQuestion, Details } from '../../types';
import { fetchSentenceFeedback, fetchContextSentence, fetchConversationChoice, speakWord, fetchComprehensionCheck } from '../../services/geminiService';
import { Spinner } from '../ui/Spinner';

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    quizType: PracticeType;
    questions: TermData[];
    allTerms: TermData[];
    userApiKey: string | null;
    onQuizComplete: (quizType: PracticeType, score: number, total: number) => void;
    onUpdateTermData: (updatedTerm: TermData) => void;
    level: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;
  const newArray = [...array];
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};


export const QuizModal: React.FC<QuizModalProps> = (props) => {
    const { isOpen, onClose, quizType, questions, userApiKey, onQuizComplete, onUpdateTermData, level } = props;
    const [gameState, setGameState] = useState<'playing' | 'results'>('playing');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wrongAnswers, setWrongAnswers] = useState<TermData[]>([]);
    const [shuffledQuestions, setShuffledQuestions] = useState<TermData[]>([]);

    useEffect(() => {
        if (isOpen) {
            setGameState('playing');
            setCurrentIndex(0);
            setWrongAnswers([]);
            setShuffledQuestions(shuffleArray(questions));
        }
    }, [isOpen, questions]);

    const handleNextQuestion = (isCorrect: boolean) => {
        const currentTerm = shuffledQuestions[currentIndex];
        if (!isCorrect) {
            setWrongAnswers(prev => {
                if (!prev.find(t => t.term === currentTerm.term)) return [...prev, currentTerm];
                return prev;
            });
        }
        
        if (currentIndex + 1 < shuffledQuestions.length) {
            setCurrentIndex(prev => prev + 1);
        } else {
            let finalWrongAnswers = wrongAnswers;
            if (!isCorrect && !finalWrongAnswers.find(t => t.term === currentTerm.term)) {
                finalWrongAnswers = [...finalWrongAnswers, currentTerm];
            }
            const score = shuffledQuestions.length - finalWrongAnswers.length;
            onQuizComplete(quizType, score, shuffledQuestions.length);
            setGameState('results');
        }
    };
    
    const handleRedeem = () => {
        setShuffledQuestions(shuffleArray(wrongAnswers));
        setWrongAnswers([]);
        setCurrentIndex(0);
        setGameState('playing');
    };

    const currentQuestion = shuffledQuestions[currentIndex];
    
    const renderQuizContent = () => {
        if (gameState === 'results') {
            const score = shuffledQuestions.length - wrongAnswers.length;
            const percentage = shuffledQuestions.length > 0 ? Math.round((score / shuffledQuestions.length) * 100) : 0;
            return (
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">Quiz Complete!</h3>
                    <p className="text-lg mb-4">{`Score: ${score} / ${shuffledQuestions.length} (${percentage}%)`}</p>
                    {wrongAnswers.length > 0 && (
                        <div className="mb-6 p-3 bg-slate-50 rounded-lg border">
                             <p className="text-slate-600 mb-2 font-medium">Terms to review:</p>
                             <div className="flex flex-wrap justify-center gap-2">
                                {wrongAnswers.map(t => <span key={t.term} className="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full">{t.term}</span>)}
                             </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        {wrongAnswers.length > 0 && <button onClick={handleRedeem} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Redeem Wrong Terms</button>}
                        <button onClick={onClose} className="w-full px-6 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200">Back to Library</button>
                    </div>
                </div>
            );
        }
        
        if (!currentQuestion) return null;

        switch(quizType) {
            case 'comprehensionCheck':
                return <ComprehensionCheckView question={currentQuestion} onNext={handleNextQuestion} userApiKey={userApiKey} onUpdateTermData={onUpdateTermData} />;
            case 'spellingBee':
                return <SpellingBeeView question={currentQuestion} onNext={handleNextQuestion} />;
            case 'syntaxScramble':
                return <SyntaxScrambleView question={currentQuestion} onNext={handleNextQuestion} />;
            case 'contextCheck':
                return <ContextCheckView question={currentQuestion} onNext={handleNextQuestion} userApiKey={userApiKey} onUpdateTermData={onUpdateTermData} />;
            case 'conversationChoice':
                return <ConversationChoiceView question={currentQuestion} onNext={handleNextQuestion} userApiKey={userApiKey} onUpdateTermData={onUpdateTermData} />;
            case 'sentencePractice':
                return <SentencePracticeView question={currentQuestion} onNext={handleNextQuestion} userApiKey={userApiKey} level={level} />;
            case 'collocationMatch':
                return <CollocationMatchView question={currentQuestion} onNext={handleNextQuestion} />;
            case 'meaningMatch':
            case 'sentence':
                return <MultipleChoiceView question={currentQuestion} quizType={quizType} allTerms={props.allTerms} onNext={handleNextQuestion} />;
            default:
                 return (
                    <div className="text-center">
                        <p className="text-slate-600">This quiz type is not available yet.</p>
                        <button onClick={() => handleNextQuestion(true)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg">Continue</button>
                    </div>
                );
        }
    };

    const title = quizType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-2xl">
            {gameState === 'playing' && <p className="text-center text-sm text-slate-500 font-medium mb-3">{`Question ${currentIndex + 1} / ${shuffledQuestions.length}`}</p>}
            {renderQuizContent()}
        </Modal>
    );
};


const ComprehensionCheckView: React.FC<{ question: TermData, onNext: (isCorrect: boolean) => void, userApiKey: string | null, onUpdateTermData: (updatedTerm: TermData) => void }> = ({ question, onNext, userApiKey, onUpdateTermData }) => {
    const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [key, setKey] = useState(0);

    const meaningIndex = 0;
    const details = question.details?.[meaningIndex];

    const getQuestions = async () => {
        setLoading(true);
        try {
            const fetchedQuestions = await fetchComprehensionCheck(question.term, question.meanings[meaningIndex], 'Intermediate', userApiKey);
            const updatedDetails: Details = {
                ...(details || { examples: [], wordFamily: [], synonyms: [], antonyms: [], collocations: [] }),
                comprehensionQs: [...(details?.comprehensionQs || []), ...fetchedQuestions],
            };
            onUpdateTermData({ ...question, details: { ...question.details, [meaningIndex]: updatedDetails } });
            setQuestions(fetchedQuestions);
            setKey(prev => prev + 1);
        } catch (e) {
            console.error("Failed to fetch comprehension questions", e);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (details?.comprehensionQs?.length) {
            setQuestions(shuffleArray(details.comprehensionQs).slice(0, 3));
            setLoading(false);
        } else {
            getQuestions();
        }
    }, [question]);
    
    const handleAnswer = (isCorrect: boolean) => {
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        if (currentQIndex + 1 < questions.length) {
            setCurrentQIndex(prev => prev + 1);
        } else {
            const finalScore = isCorrect ? score + 1 : score;
            const pass = questions.length > 0 ? finalScore / questions.length >= 0.66 : true;
            onNext(pass);
        }
    };

    if (loading) return <div className="text-center py-10"><Spinner /><p className="mt-3 text-slate-500">Preparing your questions...</p></div>;
    if (questions.length === 0) return <div className="text-center"><p>Could not load questions.</p><button onClick={() => onNext(true)} className="px-4 py-2 mt-2 bg-indigo-600 text-white rounded-lg">Continue</button></div>;

    const currentQ = questions[currentQIndex];

    return (
        <div key={key}>
             {currentQ.type === 'mcq' ? (
                <MCQComprehension question={currentQ} onAnswer={handleAnswer} />
             ) : (
                <MCQComprehension question={currentQ} onAnswer={handleAnswer} /> // Fallback for other types
             )}
             <button onClick={getQuestions} disabled={loading} className="text-sm text-indigo-600 hover:underline disabled:opacity-50 mt-4 text-center w-full">
                 {loading ? 'Getting more...' : 'Get more questions'}
             </button>
        </div>
    );
};

const MCQComprehension: React.FC<{ question: ComprehensionQuestion, onAnswer: (isCorrect: boolean) => void }> = ({ question, onAnswer }) => {
    const [answered, setAnswered] = useState<string | null>(null);
    const options = useMemo(() => shuffleArray(question.options || []), [question]);

    return (
        <div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800">{question.question}</p>
            </div>
            <div className="space-y-3">
                {options.map((option, idx) => {
                    let btnClass = 'w-full p-3 bg-white border-2 border-slate-200 rounded-lg shadow-sm text-left hover:border-indigo-400 disabled:cursor-not-allowed';
                    if (answered) {
                        if (option === question.correctAnswer) btnClass += ' bg-green-100 border-green-500';
                        else if (option === answered) btnClass += ' bg-red-100 border-red-500';
                    }
                    return <button key={idx} onClick={() => setAnswered(option)} disabled={!!answered} className={btnClass}>{option}</button>;
                })}
            </div>
            {answered && <button onClick={() => onAnswer(answered === question.correctAnswer)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Next</button>}
        </div>
    );
};

const OnScreenKeyboard: React.FC<{ onKeyPress: (key: string) => void }> = ({ onKeyPress }) => {
    const rows = [ "qwertyuiop", "asdfghjkl", "zxcvbnm" ];
    return (
        <div className="space-y-2 mt-4">
            {rows.map(row => (
                <div key={row} className="flex justify-center gap-1.5 flex-wrap">
                    {row.split('').map(char => (
                        <button key={char} onClick={() => onKeyPress(char)} className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors">
                            {char}
                        </button>
                    ))}
                </div>
            ))}
            <div className="flex justify-center gap-1.5">
                <button onClick={() => onKeyPress('backspace')} className="h-8 sm:h-10 px-4 bg-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors flex items-center gap-2">
                    <i className="fas fa-backspace"></i>
                    <span>Backspace</span>
                </button>
            </div>
        </div>
    );
};

const SpellingBeeView = ({ question, onNext }: { question: TermData, onNext: (isCorrect: boolean) => void }) => {
    const [userInput, setUserInput] = useState('');
    const [answered, setAnswered] = useState(false);
    
    useEffect(() => {
        setUserInput('');
        setAnswered(false);
    }, [question]);

    const isCorrect = question.term.toLowerCase() === userInput.trim().toLowerCase();

    const handleKeyPress = (key: string) => {
        if (answered) return;
        if (key === 'backspace') {
            setUserInput(prev => prev.slice(0, -1));
        } else {
            setUserInput(prev => prev + key);
        }
    };

    const checkAnswer = () => {
        if (!userInput.trim()) return;
        setAnswered(true);
    };
    
    const playInstruction = async (btn: HTMLButtonElement) => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<span class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin inline-block"></span>`;
        btn.disabled = true;
        try {
            await speakWord(question.term);
        } catch (e) {
            console.error("Pronunciation failed", e);
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    };

    return (
        <div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800 font-semibold">Listen, then spell the word.</p>
                <p className="text-sm text-slate-500 mt-1">"{question.meanings[0].definition}"</p>
                <button onClick={(e) => playInstruction(e.currentTarget)} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <i className="fas fa-play mr-2"></i> Play Sound
                </button>
            </div>
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={answered}
                className={`w-full p-3 text-lg text-center border-2 rounded-lg tracking-widest font-mono ${answered ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-slate-300 bg-white focus:border-indigo-500 focus:ring-indigo-500'}`}
                placeholder="Type the word here"
            />
            <OnScreenKeyboard onKeyPress={handleKeyPress} />
             {answered && (
                <div className="text-center mt-4 font-semibold">
                    {isCorrect ? <p className="text-green-600">Correct!</p> : <p className="text-red-600">Not quite. The correct spelling is: <strong>{question.term}</strong></p>}
                </div>
            )}
            <button onClick={() => answered ? onNext(isCorrect) : checkAnswer()} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                {answered ? 'Next' : 'Check Spelling'}
            </button>
        </div>
    );
};

const SyntaxScrambleView = ({ question, onNext }: { question: TermData, onNext: (isCorrect: boolean) => void }) => {
    const originalSentence = useMemo(() => question.details?.[0]?.examples?.[0]?.replace(/\*\*/g, '') || '', [question]);
    const originalWords = useMemo(() => originalSentence.split(' '), [originalSentence]);
    
    const [scrambled, setScrambled] = useState<string[]>([]);
    const [userAnswer, setUserAnswer] = useState<string[]>([]);
    const [answered, setAnswered] = useState(false);

    useEffect(() => {
        setScrambled(shuffleArray(originalWords));
        setUserAnswer([]);
        setAnswered(false);
    }, [originalWords]);
    
    const isCorrect = userAnswer.join(' ') === originalSentence;

    const handleWordClick = (word: string, index: number) => {
        setUserAnswer(prev => [...prev, word]);
        setScrambled(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleAnswerClick = (word: string, index: number) => {
        setScrambled(prev => [...prev, word]);
        setUserAnswer(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800 font-semibold">Unscramble the sentence!</p>
            </div>
            <div className="p-4 min-h-[6rem] bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-wrap gap-2 items-center justify-center">
                {userAnswer.map((word, i) => <button key={`${word}-${i}`} onClick={() => !answered && handleAnswerClick(word, i)} className="px-3 py-1 bg-white rounded-md shadow-sm border">{word}</button>)}
            </div>
            <div className="my-4 text-center text-2xl text-slate-400"><i className="fas fa-arrows-alt-v"></i></div>
            <div className="p-4 min-h-[6rem] bg-white rounded-lg border flex flex-wrap gap-2 items-center justify-center">
                {scrambled.map((word, i) => <button key={`${word}-${i}`} onClick={() => !answered && handleWordClick(word, i)} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md shadow-sm hover:bg-indigo-200">{word}</button>)}
            </div>
            {answered && (
                <div className="text-center mt-4 font-semibold">
                    {isCorrect ? <p className="text-green-600">Correct!</p> : <p className="text-red-600">Correct sentence: <strong>{originalSentence}</strong></p>}
                </div>
            )}
            <button onClick={() => answered ? onNext(isCorrect) : setAnswered(true)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                {answered ? 'Next' : 'Check Answer'}
            </button>
        </div>
    );
};

const ContextCheckView = ({ question, onNext, userApiKey, onUpdateTermData }: { question: TermData, onNext: (isCorrect: boolean) => void, userApiKey: string | null, onUpdateTermData: (updatedTerm: TermData) => void }) => {
    const [contextData, setContextData] = useState<{ sentence: string; correctMeaningIndex: number; } | null>(null);
    const [loading, setLoading] = useState(true);
    const [answered, setAnswered] = useState<number | null>(null);
    const [key, setKey] = useState(0);

    const meaningIndex = 0;
    const details = question.details?.[meaningIndex];

    const generateContext = async () => {
        setLoading(true);
        setAnswered(null);
        const meaningIdxToTest = Math.floor(Math.random() * question.meanings.length);
        
        try {
            const data = await fetchContextSentence(question.term, question.meanings[meaningIdxToTest], meaningIdxToTest, 'Intermediate', userApiKey);
            const updatedDetails: Details = {
                ...(details || { examples: [], wordFamily: [], synonyms: [], antonyms: [], collocations: [] }),
                contextSentences: [...(details?.contextSentences || []), data],
            };
            onUpdateTermData({ ...question, details: { ...question.details, [meaningIndex]: updatedDetails } });
            setContextData(data);
        } catch (e) { 
            console.error(e);
            setContextData({ sentence: "Error generating sentence.", correctMeaningIndex: 0 });
        } finally { 
            setLoading(false); 
            setKey(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (details?.contextSentences?.length) {
            const randomSentence = details.contextSentences[Math.floor(Math.random() * details.contextSentences.length)];
            setContextData(randomSentence);
            setLoading(false);
        } else {
            generateContext();
        }
    }, [question]);

    if (loading) return <div className="flex justify-center"><Spinner /></div>;
    if (!contextData) return <div className="text-center"><p>Could not load sentence.</p><button onClick={() => onNext(true)} className="px-4 py-2 mt-2 bg-indigo-600 text-white rounded-lg">Continue</button></div>;

    return (
        <div key={key}>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800 font-semibold">Which meaning of <strong>{question.term}</strong> is used in the sentence below?</p>
                <p className="mt-3 text-base italic">"{contextData.sentence}"</p>
            </div>
            <div className="space-y-3">
                {question.meanings.map((meaning, idx) => {
                    let btnClass = 'w-full p-3 bg-white border-2 border-slate-200 rounded-lg shadow-sm text-left hover:border-indigo-400 disabled:cursor-not-allowed';
                    if (answered !== null) {
                        if (idx === contextData.correctMeaningIndex) btnClass += ' bg-green-100 border-green-500';
                        else if (idx === answered) btnClass += ' bg-red-100 border-red-500';
                    }
                    return (
                        <button key={idx} onClick={() => setAnswered(idx)} disabled={answered !== null} className={btnClass}>
                           ({meaning.partOfSpeech}) {meaning.definition}
                        </button>
                    )
                })}
            </div>
            {answered !== null && <button onClick={() => onNext(answered === contextData.correctMeaningIndex)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Next</button>}
             <button onClick={generateContext} disabled={loading} className="text-sm text-indigo-600 hover:underline disabled:opacity-50 mt-4 text-center w-full">
                {loading ? 'Getting another...' : 'Get another sentence'}
             </button>
        </div>
    );
};

const ConversationChoiceView = ({ question, onNext, userApiKey, onUpdateTermData }: { question: TermData, onNext: (isCorrect: boolean) => void, userApiKey: string | null, onUpdateTermData: (updatedTerm: TermData) => void }) => {
    const [quizData, setQuizData] = useState<ConversationChoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [answered, setAnswered] = useState<number | null>(null);
    const [key, setKey] = useState(0);

    const meaningIndex = 0;
    const details = question.details?.[meaningIndex];

    const generateQuiz = async () => {
        setLoading(true);
        setAnswered(null);
        try {
            const data = await fetchConversationChoice(question.term, question.meanings[meaningIndex], 'Intermediate', userApiKey);
            const updatedDetails: Details = {
                ...(details || { examples: [], wordFamily: [], synonyms: [], antonyms: [], collocations: [] }),
                conversationChoices: [...(details?.conversationChoices || []), data],
            };
            onUpdateTermData({ ...question, details: { ...question.details, [meaningIndex]: updatedDetails } });
            setQuizData({ ...data, choices: shuffleArray(data.choices) });
            setKey(prev => prev + 1);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };
    
    useEffect(() => {
        if (details?.conversationChoices?.length) {
            const randomChoice = details.conversationChoices[Math.floor(Math.random() * details.conversationChoices.length)];
            setQuizData({ ...randomChoice, choices: shuffleArray(randomChoice.choices) });
            setLoading(false);
        } else {
            generateQuiz();
        }
    }, [question]);

    if (loading) return <div className="flex justify-center"><Spinner /></div>;
    if (!quizData) return <p className="text-center text-red-500">Could not load quiz.</p>;

    return (
        <div key={key}>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800 font-semibold">{quizData.scenario}</p>
            </div>
            <p className="text-center text-sm text-slate-500 mb-3">Choose the most natural response:</p>
            <div className="space-y-3">
                {quizData.choices.map((choice, idx) => {
                     let btnClass = 'w-full p-3 bg-white border-2 border-slate-200 rounded-lg shadow-sm text-left hover:border-indigo-400 disabled:cursor-not-allowed';
                     if (answered === idx) {
                         if (choice.isCorrect) btnClass += ' bg-green-100 border-green-500';
                         else btnClass += ' bg-red-100 border-red-500';
                     }
                    return (
                        <button key={idx} onClick={() => setAnswered(idx)} disabled={answered !== null} className={btnClass}>
                            {choice.text}
                            {answered === idx && <p className={`text-xs mt-1 ${choice.isCorrect ? 'text-green-700' : 'text-red-700'}`}>{choice.explanation}</p>}
                        </button>
                    );
                })}
            </div>
             {answered !== null && <button onClick={() => onNext(quizData.choices[answered!].isCorrect)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Next</button>}
             <button onClick={generateQuiz} disabled={loading} className="text-sm text-indigo-600 hover:underline disabled:opacity-50 mt-4 text-center w-full">
                 {loading ? 'Getting another...' : 'Get another scenario'}
             </button>
        </div>
    );
};

const CollocationMatchView = ({ question, onNext }: { question: TermData, onNext: (isCorrect: boolean) => void }) => {
    const { quizItems, shuffledMeanings, correctMapping } = useMemo(() => {
        const allCollocations = question.details?.[0]?.collocations?.flatMap(c => c.items) || [];
        const sampleSize = Math.min(allCollocations.length, 4);
        const sampled = shuffleArray(allCollocations).slice(0, sampleSize);

        const correctMapping = new Map(sampled.map(item => [item.phrase, item.meaning]));
        const meanings = sampled.map(item => item.meaning);
        
        return {
            quizItems: sampled,
            shuffledMeanings: shuffleArray(meanings),
            correctMapping: correctMapping,
        };
    }, [question]);

    const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
    const [answered, setAnswered] = useState(false);

    const handleSelect = (phrase: string, meaning: string) => {
        setUserAnswers(prev => new Map(prev).set(phrase, meaning));
    };

    const checkAnswers = () => {
        setAnswered(true);
    };

    const allCorrect = useMemo(() => {
        if (!answered) return false;
        if (userAnswers.size !== quizItems.length) return false;
        return quizItems.every(item => userAnswers.get(item.phrase) === item.meaning);
    }, [answered, userAnswers, quizItems]);

    if (quizItems.length < 2) {
        return (
            <div className="text-center">
                <p className="text-slate-600">Not enough collocations found for this word to create a quiz.</p>
                <button onClick={() => onNext(true)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg">Continue</button>
            </div>
        );
    }

    return (
        <div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800 font-semibold">Match the collocations for <strong>{question.term}</strong> to their meanings.</p>
            </div>
            <div className="space-y-4">
                {quizItems.map((item) => {
                    const userAnswer = userAnswers.get(item.phrase);
                    const isCorrect = userAnswer === item.meaning;
                    let feedbackClass = '';
                    if (answered) {
                        feedbackClass = isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
                    }

                    return (
                        <div key={item.phrase} className={`p-3 rounded-lg border grid grid-cols-2 gap-4 items-center ${feedbackClass}`}>
                            <p className="font-semibold text-slate-800">{item.phrase}</p>
                            <select
                                value={userAnswer || ''}
                                onChange={(e) => handleSelect(item.phrase, e.target.value)}
                                disabled={answered}
                                className={`w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm ${answered ? 'bg-slate-100' : ''}`}
                            >
                                <option value="" disabled>Select a meaning...</option>
                                {shuffledMeanings.map((meaning, idx) => (
                                    <option key={idx} value={meaning}>{meaning}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
            {answered ? (
                <button onClick={() => onNext(allCorrect)} className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Next</button>
            ) : (
                <button onClick={checkAnswers} disabled={userAnswers.size !== quizItems.length} className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50">Check Answers</button>
            )}
        </div>
    );
};

const MultipleChoiceView = ({ question, allTerms, onNext, quizType }: { question: TermData, allTerms: TermData[], onNext: (isCorrect: boolean) => void, quizType: PracticeType }) => {
    const [answered, setAnswered] = useState<string | null>(null);

    const { prompt, options, correctAnswer } = useMemo(() => {
        let prompt: string = '';
        const correctAnswer = question.term;

        if (quizType === 'meaningMatch') {
            prompt = question.meanings[0].definition;
        } else if (quizType === 'sentence') {
            const sentence = question.details?.[0]?.examples?.[0];
            if (sentence) {
                prompt = sentence.replace(/\*\*/g, '').replace(new RegExp(question.term, 'ig'), '______');
            } else {
                prompt = 'Could not load sentence for this term. Please explore its details first.';
            }
        }

        const distractors = shuffleArray(allTerms.filter(t => t.term.toLowerCase() !== question.term.toLowerCase())).slice(0, 3).map(t => t.term);
        const options = shuffleArray([correctAnswer, ...distractors]);

        return { prompt, options, correctAnswer };
    }, [question, allTerms, quizType]);

    useEffect(() => {
        setAnswered(null);
    }, [question]);

    if (!prompt || prompt.startsWith('Could not load')) {
        return (
            <div className="text-center">
                <p className="text-slate-600">{prompt || "Not enough data for this question."}</p>
                <button onClick={() => onNext(true)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg">Skip</button>
            </div>
        );
    }

    return (
        <div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800">{prompt}</p>
            </div>
            <div className="space-y-3">
                {options.map((option, idx) => {
                    let btnClass = 'w-full p-3 bg-white border-2 border-slate-200 rounded-lg shadow-sm text-left hover:border-indigo-400 disabled:cursor-not-allowed';
                    if (answered) {
                        if (option === correctAnswer) btnClass += ' bg-green-100 border-green-500';
                        else if (option === answered) btnClass += ' bg-red-100 border-red-500';
                    }
                    return (
                        <button key={idx} onClick={() => setAnswered(option)} disabled={!!answered} className={btnClass}>
                            {option}
                        </button>
                    );
                })}
            </div>
            {answered && <button onClick={() => onNext(answered === correctAnswer)} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Next</button>}
        </div>
    );
};

const SentencePracticeView = ({ question, onNext, userApiKey, level }: { question: TermData, onNext: (isCorrect: boolean) => void, userApiKey: string | null, level: string }) => {
    const [sentence, setSentence] = useState('');
    const [feedback, setFeedback] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!sentence) return;
        setLoading(true);
        try {
            const result = await fetchSentenceFeedback(question.term, question.meanings[0].definition, sentence, level, userApiKey);
            setFeedback(result);
        } catch (e) { setFeedback({ isCorrect: false, feedback: 'Error', explanation: 'Could not get feedback from AI.' }); } 
        finally { setLoading(false); }
    };
    
    return (
        <div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 shadow-inner text-center">
                <p className="text-lg text-slate-800 font-semibold">Write a sentence using: <strong>{question.term}</strong></p>
                <p className="text-sm text-slate-500 mt-1">Meaning: "{question.meanings[0].definition}"</p>
            </div>
             <textarea value={sentence} onChange={e => setSentence(e.target.value)} placeholder="Your sentence..." className="w-full h-24 p-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" disabled={loading || !!feedback} />
            
            {feedback && (
                <div className={`mt-4 p-4 rounded-lg border ${feedback.isCorrect ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <p className={`font-semibold ${feedback.isCorrect ? 'text-green-700' : 'text-yellow-800'}`}>{feedback.feedback}</p>
                    <p className="text-sm text-slate-600 mt-2">{feedback.explanation}</p>
                    {feedback.correctExamples && (
                        <>
                            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-1">Correct Examples:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">{feedback.correctExamples.map((ex: string, i: number) => <li key={i}>{ex}</li>)}</ul>
                        </>
                    )}
                </div>
            )}
            
            {!feedback && (
                <button onClick={handleSubmit} disabled={loading || !sentence} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 flex items-center justify-center disabled:opacity-50">
                    {loading ? <Spinner color="white" /> : 'Check Sentence'}
                </button>
            )}
            {feedback && (
                <button onClick={() => { onNext(feedback.isCorrect); setFeedback(null); setSentence(''); }} className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Next</button>
            )}
        </div>
    );
};
