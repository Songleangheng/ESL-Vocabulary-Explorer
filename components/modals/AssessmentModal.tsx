
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import type { TermData, AssessmentData, AssessmentQuestion, MatchAssessmentQuestion, MCQAssessmentQuestion, FillBlankAssessmentQuestion, WrittenAssessmentQuestion, MatchItem, MatchTarget } from '../../types';

// Fisher-Yates Shuffle
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

const generateAssessmentFromTerms = (terms: TermData[]): AssessmentData => {
    const questions: AssessmentQuestion[] = [];
    const shuffledTerms = shuffleArray(terms);

    // 1. Generate Matching Question (if enough terms)
    if (shuffledTerms.length >= 4) {
        const matchTerms = shuffledTerms.slice(0, 4);
        const matchItems: MatchItem[] = matchTerms.map((t, i) => ({ id: `item-${i}`, term: t.term }));
        const matchTargets: MatchTarget[] = matchTerms.map((t, i) => ({ id: `target-${i}`, definition: t.meanings[0].definition }));
        
        const correctPairs: { [itemId: string]: string } = {};
        matchItems.forEach((item, i) => {
            correctPairs[item.id] = matchTargets[i].id;
        });
        
        questions.push({
            id: 'match-q1',
            type: 'match',
            instruction: 'Match each term to its correct definition.',
            items: matchItems,
            targets: matchTargets,
            correctPairs,
        });
    }

    // 2. Generate other questions for each term
    shuffledTerms.forEach((term, index) => {
        // A. MCQ: Which word means...?
        if (shuffledTerms.length >= 4) {
            const correctAnswer = term.term;
            const distractors = shuffleArray(shuffledTerms.filter(t => t.term !== correctAnswer)).slice(0, 3).map(t => t.term);
            if (distractors.length === 3) {
                 questions.push({
                    id: `mcq-${index}`,
                    type: 'mcq',
                    question: `Which word best fits the definition: "${term.meanings[0].definition}"`,
                    options: shuffleArray([correctAnswer, ...distractors]),
                    correctAnswer: correctAnswer,
                });
            }
        }

        // B. Fill in the blank
        const example = term.details?.[0]?.examples?.[0];
        if (example) {
            const sentence = example.replace(/\*\*/g, '').replace(new RegExp(term.term, 'ig'), '_____');
             questions.push({
                id: `fill-${index}`,
                type: 'fill-in-the-blank',
                sentence: sentence,
                correctAnswer: term.term,
            });
        }

        // C. Written question
        questions.push({
            id: `written-${index}`,
            type: 'written',
            prompt: `Write your own sentence using the word "${term.term}".`,
            modelAnswer: example || `e.g., A sentence demonstrating the use of ${term.term}.`,
        });
    });
    
    // Dynamically set question count based on number of terms
    const numTerms = terms.length;
    // Logic: for N terms, generate up to ~N*1.2 + 3 questions, capped at 25.
    const targetQuestionCount = Math.min(Math.floor(numTerms * 1.2) + 3, 25);
    const finalQuestions = shuffleArray(questions).slice(0, targetQuestionCount);

    return {
        title: `Vocabulary Assessment (${finalQuestions.length} Questions)`,
        questions: finalQuestions,
    };
};

interface AssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    terms: TermData[];
}

type AnswerState = { [questionId: string]: any };

export const AssessmentModal: React.FC<AssessmentModalProps> = ({ isOpen, onClose, terms }) => {
    const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
    const [status, setStatus] = useState<'loading' | 'taking' | 'submitted'>('loading');
    const [answers, setAnswers] = useState<AnswerState>({});
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (isOpen && terms.length > 0) {
            setStatus('loading');
            setAnswers({});
            setScore(0);
            
            // Generate assessment on the client side
            try {
                const generatedAssessment = generateAssessmentFromTerms(terms);
                if (generatedAssessment.questions.length === 0) {
                    // Handle case where no questions could be generated
                    console.error("Could not generate any assessment questions from the provided terms.");
                    onClose();
                    // Optionally, show an error to the user
                    return;
                }
                setAssessmentData(generatedAssessment);
                setStatus('taking');
            } catch (err) {
                 console.error("Failed to generate assessment:", err);
                 onClose();
            }
        }
    }, [isOpen, terms]);
    
    const handleAnswerChange = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = () => {
        if (!assessmentData) return;
        let correctCount = 0;
        assessmentData.questions.forEach(q => {
            const userAnswer = answers[q.id];
            if (userAnswer === undefined || userAnswer === null) return;

            let isQuestionCorrect = false;
            switch (q.type) {
                case 'mcq':
                    isQuestionCorrect = userAnswer === (q as MCQAssessmentQuestion).correctAnswer;
                    break;
                case 'fill-in-the-blank':
                    isQuestionCorrect = typeof userAnswer === 'string' && userAnswer.trim().toLowerCase() === (q as FillBlankAssessmentQuestion).correctAnswer.toLowerCase();
                    break;
                case 'match':
                    const correctPairs = (q as MatchAssessmentQuestion).correctPairs;
                    if (typeof userAnswer === 'object' && userAnswer !== null) {
                         const allMatched = Object.keys(correctPairs).every(itemId => userAnswer[itemId] === correctPairs[itemId]);
                         isQuestionCorrect = allMatched;
                    }
                    break;
                case 'written':
                    // Auto-grade written questions as correct if attempted
                    isQuestionCorrect = userAnswer && userAnswer.trim() !== '';
                    break;
            }
            if(isQuestionCorrect) correctCount++;
        });
        setScore(correctCount);
        setStatus('submitted');
    };

    const renderQuestion = (q: AssessmentQuestion, index: number) => {
        const isSubmitted = status === 'submitted';
        const userAnswer = answers[q.id];

        switch (q.type) {
            case 'mcq': return <MCQQuestionView key={q.id} q={q as MCQAssessmentQuestion} isSubmitted={isSubmitted} userAnswer={userAnswer} onAnswer={(ans) => handleAnswerChange(q.id, ans)} number={index + 1} />;
            case 'fill-in-the-blank': return <FillBlankQuestionView key={q.id} q={q as FillBlankAssessmentQuestion} isSubmitted={isSubmitted} userAnswer={userAnswer} onAnswer={(ans) => handleAnswerChange(q.id, ans)} number={index + 1} />;
            case 'match': return <MatchQuestionView key={q.id} q={q as MatchAssessmentQuestion} isSubmitted={isSubmitted} userAnswer={userAnswer} onAnswer={(ans) => handleAnswerChange(q.id, ans)} number={index + 1} />;
            case 'written': return <WrittenQuestionView key={q.id} q={q as WrittenAssessmentQuestion} isSubmitted={isSubmitted} userAnswer={userAnswer} onAnswer={(ans) => handleAnswerChange(q.id, ans)} number={index + 1} />;
            default: return null;
        }
    };

    const renderContent = () => {
        if (status === 'loading' || !assessmentData) {
            return (
                <div className="text-center py-20">
                    <Spinner size="lg" />
                    <p className="mt-4 text-slate-600">Generating your personalized assessment...</p>
                </div>
            );
        }

        if (status === 'submitted') {
            const percentage = assessmentData.questions.length > 0 ? Math.round((score / assessmentData.questions.length) * 100) : 0;
            const encouragement = percentage >= 80 ? "Excellent work! You're a vocabulary master! 🎉" : percentage >= 50 ? "Great job! Keep practicing to solidify your knowledge. 👍" : "Good effort! Review your answers to learn and improve. 💪";
            return (
                <div>
                    <div className="text-center mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <h3 className="text-3xl font-bold text-indigo-700">Assessment Complete!</h3>
                        <p className="text-xl mt-2 text-slate-700">Your Score: <span className="font-bold">{score} / {assessmentData.questions.length}</span> ({percentage}%)</p>
                        <p className="mt-2 text-slate-600">{encouragement}</p>
                    </div>
                    <div className="space-y-6">{assessmentData.questions.map((q, index) => renderQuestion(q, index))}</div>
                </div>
            );
        }
        
        return (
            <div>
                <div className="space-y-6">{assessmentData.questions.map((q, index) => renderQuestion(q, index))}</div>
                <button onClick={handleSubmit} className="w-full mt-8 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Submit Assessment</button>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={assessmentData?.title || 'Vocabulary Assessment'} maxWidth="max-w-4xl">
            {renderContent()}
        </Modal>
    );
};


// --- Question Components ---

const QuestionWrapper: React.FC<{ number: number, children: React.ReactNode, isCorrect?: boolean, isSubmitted?: boolean }> = ({ number, children, isCorrect, isSubmitted }) => {
    let borderColor = 'border-slate-200';
    if (isSubmitted) {
        borderColor = isCorrect ? 'border-green-400' : 'border-red-400';
    }
    return (
        <div className={`p-5 rounded-xl border-2 bg-white shadow-sm ${borderColor}`}>
            <h4 className="font-bold text-lg text-slate-800 mb-4">Question {number}</h4>
            {children}
        </div>
    );
};

const MCQQuestionView: React.FC<{ q: MCQAssessmentQuestion, isSubmitted: boolean, userAnswer: string, onAnswer: (answer: string) => void, number: number }> = ({ q, isSubmitted, userAnswer, onAnswer, number }) => {
    const options = useMemo(() => q.options, [q]);
    const isCorrect = userAnswer === q.correctAnswer;
    return (
        <QuestionWrapper number={number} isSubmitted={isSubmitted} isCorrect={isCorrect}>
            <p className="mb-4 text-slate-700">{q.question}</p>
            <div className="space-y-2">
                {options.map(option => {
                    let className = "w-full text-left p-3 rounded-lg border-2 transition-colors ";
                    if (isSubmitted) {
                        if (option === q.correctAnswer) className += "bg-green-100 border-green-300";
                        else if (option === userAnswer) className += "bg-red-100 border-red-300";
                        else className += "bg-slate-50 border-slate-200 opacity-70";
                    } else {
                        className += userAnswer === option ? "bg-indigo-100 border-indigo-400" : "bg-slate-50 border-slate-200 hover:border-indigo-300";
                    }
                    return (
                        <button key={option} disabled={isSubmitted} onClick={() => onAnswer(option)} className={className}>
                            {option}
                        </button>
                    );
                })}
            </div>
        </QuestionWrapper>
    );
};

const FillBlankQuestionView: React.FC<{ q: FillBlankAssessmentQuestion, isSubmitted: boolean, userAnswer: string, onAnswer: (answer: string) => void, number: number }> = ({ q, isSubmitted, userAnswer, onAnswer, number }) => {
    const isCorrect = userAnswer?.trim().toLowerCase() === q.correctAnswer.toLowerCase();
    let inputClass = "w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ";
    if (isSubmitted) {
        inputClass += isCorrect ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300";
    } else {
        inputClass += "border-slate-300";
    }

    return (
        <QuestionWrapper number={number} isSubmitted={isSubmitted} isCorrect={isCorrect}>
            <p className="mb-4 text-slate-700 text-lg" dangerouslySetInnerHTML={{ __html: q.sentence.replace('_____', '<span class="font-bold text-indigo-600">[BLANK]</span>') }} />
            <input type="text" value={userAnswer || ''} onChange={(e) => onAnswer(e.target.value)} disabled={isSubmitted} className={inputClass} placeholder="Type your answer here" />
            {isSubmitted && !isCorrect && <p className="text-sm mt-2 text-green-700">Correct answer: <strong className="font-semibold">{q.correctAnswer}</strong></p>}
        </QuestionWrapper>
    );
};

const MatchQuestionView: React.FC<{ q: MatchAssessmentQuestion, isSubmitted: boolean, userAnswer: { [key: string]: string }, onAnswer: (answer: { [key: string]: string }) => void, number: number }> = ({ q, isSubmitted, userAnswer, onAnswer, number }) => {
    const shuffledTargets = useMemo(() => shuffleArray(q.targets), [q]);
    const isCorrect = useMemo(() => {
        if (!isSubmitted || !userAnswer) return false;
        if (Object.keys(userAnswer).length < Object.keys(q.correctPairs).length) return false;
        return Object.keys(q.correctPairs).every(itemId => userAnswer[itemId] === q.correctPairs[itemId]);
    }, [isSubmitted, userAnswer, q.correctPairs]);
    
    const handleSelectChange = (itemId: string, targetId: string) => {
        onAnswer({ ...(userAnswer || {}), [itemId]: targetId });
    };

    return (
        <QuestionWrapper number={number} isSubmitted={isSubmitted} isCorrect={isCorrect}>
            <p className="mb-4 text-slate-700">{q.instruction}</p>
            <div className="space-y-3">
                {q.items.map(item => {
                    const selectedTargetId = userAnswer?.[item.id];
                    const isPairCorrect = q.correctPairs[item.id] === selectedTargetId;
                    let selectClass = "w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm ";
                    if (isSubmitted) {
                       selectClass += isPairCorrect ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300";
                    } else {
                       selectClass += "border-slate-300 bg-white";
                    }

                    return (
                        <div key={item.id} className="grid grid-cols-2 gap-4 items-center">
                            <div className="font-semibold text-slate-800 p-2 bg-slate-100 rounded-md text-center">{item.term}</div>
                            <select value={selectedTargetId || ''} onChange={(e) => handleSelectChange(item.id, e.target.value)} disabled={isSubmitted} className={selectClass}>
                                <option value="" disabled>Select a definition...</option>
                                {shuffledTargets.map(target => <option key={target.id} value={target.id}>{target.definition}</option>)}
                            </select>
                        </div>
                    );
                })}
            </div>
             {isSubmitted && !isCorrect && <p className="text-sm mt-3 text-red-700">Check your answers above for corrections.</p>}
        </QuestionWrapper>
    );
};


const WrittenQuestionView: React.FC<{ q: WrittenAssessmentQuestion, isSubmitted: boolean, userAnswer: string, onAnswer: (answer: string) => void, number: number }> = ({ q, isSubmitted, userAnswer, onAnswer, number }) => {
    const isCorrect = userAnswer && userAnswer.trim() !== '';
    return (
        <QuestionWrapper number={number} isSubmitted={isSubmitted} isCorrect={isCorrect}>
            <p className="mb-4 text-slate-700">{q.prompt}</p>
            <textarea value={userAnswer || ''} onChange={(e) => onAnswer(e.target.value)} disabled={isSubmitted} className="w-full h-24 p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" placeholder="Write your sentence..."/>
            {isSubmitted && (
                <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-md">
                    <p className="text-sm font-semibold text-blue-800">Model Answer for Comparison:</p>
                    <p className="text-sm text-slate-700 mt-1 italic">"{q.modelAnswer}"</p>
                </div>
            )}
        </QuestionWrapper>
    );
};
