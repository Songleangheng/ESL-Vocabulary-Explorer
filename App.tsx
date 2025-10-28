
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { FlashcardModal } from './components/modals/FlashcardModal';
import { PracticeHubModal } from './components/modals/PracticeHubModal';
import { QuizModal } from './components/modals/QuizModal';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';
import { WordCompareModal } from './components/modals/WordCompareModal';
import { ChatbotModal } from './components/modals/ChatbotModal';
import { DashboardModal } from './components/modals/DashboardModal';
import { AssessmentModal } from './components/modals/AssessmentModal';
import { fetchInitialWordData, fetchMeaningDetails, fetchWordComparison, fetchTopicWeb, speakWord } from './services/geminiService';
// FIX: Import 'Details' type to resolve type inference issues.
import type { TermData, Library, WordComparisonData, PracticeType, TopicWebData, QuizAttempt, Details } from './types';

const App: React.FC = () => {
    const [library, setLibrary] = useState<Library>({});
    const [isLibraryLoaded, setIsLibraryLoaded] = useState<boolean>(false);
    const [results, setResults] = useState<TermData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [modalData, setModalData] = useState<any>(null);
    const [userApiKey, setUserApiKey] = useState<string | null>(null);
    const [currentLevel, setCurrentLevel] = useState('Intermediate');
    const [topicWebData, setTopicWebData] = useState<TopicWebData | null>(null);
    const [topicWebLoading, setTopicWebLoading] = useState<boolean>(false);

    const handleError = (message: string) => {
        setError(message);
        setTimeout(() => setError(null), 5000);
    };

    useEffect(() => {
        try {
            const savedLibrary = localStorage.getItem('vocabLibrary');
            if (savedLibrary) {
                const parsedLibrary: Library = JSON.parse(savedLibrary);
                // Migration: ensure all terms have a status and timestamp
                Object.values(parsedLibrary).forEach(term => {
                    if (!term.status) term.status = 'learning';
                    if (!term.addedTimestamp) term.addedTimestamp = Date.now();
                });
                setLibrary(parsedLibrary);
            }
            
            const savedApiKey = localStorage.getItem('userApiKey');
            if (savedApiKey) setUserApiKey(savedApiKey);
            
            // Restore last session
            const savedResults = localStorage.getItem('vocabLastResults');
            if (savedResults) setResults(JSON.parse(savedResults));

            const savedTopicWeb = localStorage.getItem('vocabLastTopicWeb');
            if (savedTopicWeb) setTopicWebData(JSON.parse(savedTopicWeb));
            
            const savedLevel = localStorage.getItem('vocabLastLevel');
            if (savedLevel) setCurrentLevel(savedLevel);


        } catch (e: any) {
            console.error("Failed to load library from localStorage.", e);
            handleError(`Could not load your saved library. It might be corrupted. Error: ${e.message}`);
        } finally {
            setIsLibraryLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (isLibraryLoaded) {
            try {
                localStorage.setItem('vocabLibrary', JSON.stringify(library));
            } catch (e: any) {
                console.error("Failed to save library to localStorage", e);
                handleError(`Could not save your library. Your browser's storage may be full.`);
            }
        }
    }, [library, isLibraryLoaded]);

    // Persist session state
    useEffect(() => {
        if (isLibraryLoaded) {
            try {
                if (results.length > 0) {
                    localStorage.setItem('vocabLastResults', JSON.stringify(results));
                } else {
                    localStorage.removeItem('vocabLastResults');
                }
            } catch (e) { console.error("Failed to save results to localStorage", e); }
        }
    }, [results, isLibraryLoaded]);

    useEffect(() => {
        if (isLibraryLoaded) {
            try {
                if (topicWebData) {
                    localStorage.setItem('vocabLastTopicWeb', JSON.stringify(topicWebData));
                } else {
                    localStorage.removeItem('vocabLastTopicWeb');
                }
            } catch (e) { console.error("Failed to save topic web to localStorage", e); }
        }
    }, [topicWebData, isLibraryLoaded]);

    useEffect(() => {
        if (isLibraryLoaded) {
            localStorage.setItem('vocabLastLevel', currentLevel);
        }
    }, [currentLevel, isLibraryLoaded]);

    const handleUpdateApiKey = (key: string | null) => {
        setUserApiKey(key);
        if (key) {
            localStorage.setItem('userApiKey', key);
        } else {
            localStorage.removeItem('userApiKey');
        }
    };

    const updateTermData = useCallback((updatedTerm: TermData) => {
        const termKey = updatedTerm.term.toLowerCase();
        
        setResults(prevResults => 
            prevResults.map(r => r.term.toLowerCase() === termKey ? updatedTerm : r)
        );

        setLibrary(prevLibrary => {
            if (prevLibrary[termKey]) {
                return { ...prevLibrary, [termKey]: updatedTerm };
            }
            return prevLibrary;
        });
    }, []);

    const handleUpdateTermStatus = (termKey: string, status: 'learning' | 'mastered') => {
        setLibrary(prev => {
            if (prev[termKey]) {
                const updatedTerm = { ...prev[termKey], status };
                if (status === 'mastered' && !updatedTerm.masteredTimestamp) {
                    updatedTerm.masteredTimestamp = Date.now();
                } else if (status === 'learning') {
                    delete updatedTerm.masteredTimestamp;
                }
                return { ...prev, [termKey]: updatedTerm };
            }
            return prev;
        });
    };

    const handleSearch = async (terms: string[], level: string) => {
        if (!terms.length) {
            handleError("Please enter a term to search.");
            return;
        }
        setCurrentLevel(level);
        setLoading(true);
        setError(null);
        setResults([]);
        setTopicWebData(null);

        const searchPromises = terms.map(async (term) => {
            try {
                const termKey = term.toLowerCase();
                const existingData = library[termKey];
                if (existingData) {
                    return { termData: existingData, isNew: false, termKey };
                }
                const newData = await fetchInitialWordData(term, level, userApiKey);
                newData.addedTimestamp = Date.now();
                return { termData: newData, isNew: true, termKey };
            } catch (e: any) {
                console.error(`Error processing term "${term}":`, e);
                handleError(e.message);
                return null;
            }
        });

        const promiseResults = await Promise.all(searchPromises);
        const validResults = promiseResults.filter((r): r is NonNullable<typeof r> => r !== null);

        const newLibraryEntries = validResults
            .filter(r => r.isNew)
            .reduce((acc, r) => {
                acc[r.termKey] = r.termData;
                return acc;
            }, {} as Library);

        if (Object.keys(newLibraryEntries).length > 0) {
            setLibrary(prev => ({ ...prev, ...newLibraryEntries }));
        }

        setResults(validResults.map(r => r.termData));
        setLoading(false);
    };
    
    const handleExploreDetails = async (term: TermData, meaningIndex: number, level: string) => {
        try {
            const updatedTermData = await fetchMeaningDetails(term, meaningIndex, level, userApiKey);
            updateTermData(updatedTermData);
        } catch (e: any) {
            handleError(e.message);
            throw e; 
        }
    };
    
    const handleExploreLibraryTerms = async (termKeys: string[], level: string) => {
        setCurrentLevel(level);
        setLoading(true);
        setError(null);
        setTopicWebData(null);

        const termsToDisplay = termKeys.map(key => library[key]).filter(Boolean);
        setResults(termsToDisplay);

        const detailPromises = termKeys.map(async (key) => {
            const initialTerm = library[key];
            if (!initialTerm) return;

            let termWithDetails = { ...initialTerm };
            let detailsFetched = false;
            for (let i = 0; i < initialTerm.meanings.length; i++) {
                // Only fetch if details for this specific meaning don't exist
                if (!initialTerm.details?.[i]) {
                    try {
                        const updatedTerm = await fetchMeaningDetails(termWithDetails, i, level, userApiKey);
                        termWithDetails = updatedTerm;
                        detailsFetched = true;
                    } catch (e: any) {
                        console.error(`Failed fetching details for ${initialTerm.term}, meaning ${i}`, e);
                        handleError(e.message);
                    }
                }
            }
            // Only update state if new details were actually fetched to avoid unnecessary re-renders
            if (detailsFetched) {
                updateTermData(termWithDetails);
            }
        });

        await Promise.all(detailPromises);
        setLoading(false);
    };

    const handleCompareWords = async (word1: string, word2: string, level: string) => {
        setLoading(true);
        try {
            const comparisonData = await fetchWordComparison(word1, word2, level, userApiKey);

            // Augment with library examples if they exist
            const word1Key = word1.toLowerCase();
            const word2Key = word2.toLowerCase();
            
            const word1LibraryEntry = library[word1Key];
            if (word1LibraryEntry?.details) {
                // FIX: Explicitly type `d` as `Details` to fix type inference issue.
                const libraryExamples = Object.values(word1LibraryEntry.details).flatMap((d: Details) => d.examples || []);
                if (libraryExamples.length > 0) {
                    // Combine and remove duplicates, putting library examples first
                    comparisonData.word1.examples = [...new Set([...libraryExamples, ...comparisonData.word1.examples])];
                }
            }

            const word2LibraryEntry = library[word2Key];
            if (word2LibraryEntry?.details) {
                // FIX: Explicitly type `d` as `Details` to fix type inference issue.
                const libraryExamples = Object.values(word2LibraryEntry.details).flatMap((d: Details) => d.examples || []);
                if (libraryExamples.length > 0) {
                     comparisonData.word2.examples = [...new Set([...libraryExamples, ...comparisonData.word2.examples])];
                }
            }

            setModalData(comparisonData);
            setActiveModal('compare');
        } catch (e: any) {
            handleError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleGenerateTopicWeb = async (topic: string, level: string) => {
        setTopicWebLoading(true);
        setError(null);
        setResults([]);
        setTopicWebData(null);
        try {
            const webData = await fetchTopicWeb(topic, level, userApiKey);
            setTopicWebData(webData);
        } catch (e: any) {
            handleError(e.message);
        } finally {
            setTopicWebLoading(false);
        }
    };

    const handlePronounce = async (termData: TermData, button: HTMLButtonElement) => {
        const originalHTML = button.innerHTML;
        button.innerHTML = `<div class="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>`;
        button.disabled = true;
        try {
            await speakWord(termData.term);
        } catch (e: any) {
            handleError(`Pronunciation failed: ${e.message}`);
        } finally {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }
    };
    
    const handlePractice = (selectedTerms: TermData[]) => {
        if (selectedTerms.length === 0) {
            handleError("Please select words from your library to practice.");
            return;
        }
        setModalData(selectedTerms);
        setActiveModal('practiceHub');
    };

    const handleStartAssessment = (selectedTerms: TermData[]) => {
        if (selectedTerms.length === 0) {
            handleError("Please select words from your library to start an assessment.");
            return;
        }
        setModalData(selectedTerms);
        setActiveModal('assessment');
    };
    
    const handleStartQuiz = (type: PracticeType, data: TermData[], allTerms: TermData[]) => {
        setModalData({type, questions: data, allTerms});
        setActiveModal('quiz');
    };

    const handleQuizComplete = (quizType: PracticeType, score: number, total: number) => {
        try {
            const historyJSON = localStorage.getItem('quizHistory');
            const history: QuizAttempt[] = historyJSON ? JSON.parse(historyJSON) : [];
            const newAttempt: QuizAttempt = { timestamp: Date.now(), quizType, score, total };
            const updatedHistory = [...history, newAttempt].slice(-50); // Keep last 50
            localStorage.setItem('quizHistory', JSON.stringify(updatedHistory));
        } catch (e) { console.error("Failed to save quiz history", e); }
    };

    const handleFlashcards = (selectedTerms: TermData[]) => {
         if (selectedTerms.length === 0) {
            handleError("Please select words from your library for flashcards.");
            return;
        }
        setModalData(selectedTerms);
        setActiveModal('flashcards');
    };

    const handleDelete = (termKeys: string[]) => {
        if (termKeys.length === 0) {
            handleError("Please select words from your library to delete.");
            return;
        }
        setModalData(termKeys);
        setActiveModal('deleteConfirm');
    };

    const confirmDelete = () => {
        const termKeys: string[] = modalData;
        const newLibrary = { ...library };
        termKeys.forEach(key => delete newLibrary[key]);
        setLibrary(newLibrary);
        setResults(prev => prev.filter(r => !termKeys.includes(r.term.toLowerCase())));
        setActiveModal(null);
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100">
            <Sidebar
                onSearch={handleSearch}
                onCompare={handleCompareWords}
                onGenerateTopicWeb={handleGenerateTopicWeb}
                library={library}
                onPractice={handlePractice}
                onFlashcards={handleFlashcards}
                onDelete={handleDelete}
                onExploreLibraryTerms={handleExploreLibraryTerms}
                onShowDashboard={() => setActiveModal('dashboard')}
                onStartAssessment={handleStartAssessment}
                userApiKey={userApiKey}
                onUpdateApiKey={handleUpdateApiKey}
                onUpdateTermStatus={handleUpdateTermStatus}
            />
            <MainContent
                results={results}
                loading={loading}
                error={error}
                topicWebData={topicWebData}
                topicWebLoading={topicWebLoading}
                onExploreDetails={handleExploreDetails}
                onUpdateTermData={updateTermData}
                onPronounce={handlePronounce}
                onWebNodeClick={(term) => handleSearch([term], currentLevel)}
                userApiKey={userApiKey}
            />
            {activeModal === 'flashcards' && (
                <FlashcardModal
                    terms={modalData}
                    isOpen={true}
                    onClose={() => setActiveModal(null)}
                />
            )}
            {activeModal === 'practiceHub' && (
                <PracticeHubModal
                    isOpen={true}
                    onClose={() => setActiveModal(null)}
                    selectedTerms={modalData}
                    allTerms={Object.values(library)}
                    onStartQuiz={handleStartQuiz}
                />
            )}
            {activeModal === 'quiz' && (
                <QuizModal
                    isOpen={true}
                    onClose={() => setActiveModal(null)}
                    quizType={modalData.type}
                    questions={modalData.questions}
                    allTerms={modalData.allTerms}
                    userApiKey={userApiKey}
                    onQuizComplete={handleQuizComplete}
                    onUpdateTermData={updateTermData}
                    level={currentLevel}
                />
            )}
             {activeModal === 'deleteConfirm' && (
                <DeleteConfirmModal
                    isOpen={true}
                    onClose={() => setActiveModal(null)}
                    termsToDelete={modalData}
                    onConfirmDelete={confirmDelete}
                />
            )}
            {activeModal === 'compare' && (
                <WordCompareModal
                    isOpen={true}
                    onClose={() => setActiveModal(null)}
                    data={modalData as WordComparisonData}
                />
            )}
             {activeModal === 'dashboard' && (
                <DashboardModal
                    isOpen={true}
                    onClose={() => setActiveModal(null)}
                    library={library}
                    userApiKey={userApiKey}
                />
            )}
             {activeModal === 'assessment' && (
                <AssessmentModal
                    terms={modalData}
                    isOpen={true}
                    onClose={() => setActiveModal(null)}
                />
            )}
             <button
                onClick={() => setIsChatbotOpen(true)}
                className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white w-16 h-16 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none z-30 flex items-center justify-center"
                aria-label="Open AI Assistant"
                title="Chat with Visakha"
            >
                <i className="fas fa-comment-dots fa-2x"></i>
            </button>
             <ChatbotModal
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                contextTerms={results}
                level={currentLevel}
                userApiKey={userApiKey}
            />
        </div>
    );
};

export default App;
