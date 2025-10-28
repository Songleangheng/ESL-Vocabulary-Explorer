
import React, { useMemo } from 'react';
import type { TermData, TopicWebData } from '../types';
import { ResultCard } from './ResultCard';
import { Spinner } from './ui/Spinner';
import { CopyToClipboardButton } from './ui/CopyToClipboardButton';

interface MainContentProps {
    results: TermData[];
    loading: boolean;
    error: string | null;
    topicWebData: TopicWebData | null;
    topicWebLoading: boolean;
    onExploreDetails: (term: TermData, meaningIndex: number, level: string) => Promise<void>;
    onUpdateTermData: (updatedTerm: TermData) => void;
    onPronounce: (termData: TermData, buttonElement: HTMLButtonElement) => Promise<void>;
    onWebNodeClick: (term: string) => void;
    userApiKey: string | null;
}

const formatTopicWebForCopy = (data: TopicWebData): string => {
    let text = `Topic Web for: ${data.topic}\n\n`;
    for (const category in data.categories) {
        text += `--- ${category} ---\n`;
        const categoryData = data.categories[category];
        if (categoryData.words && categoryData.words.length > 0) {
            text += `Words: ${categoryData.words.join(', ')}\n`;
        }
        if (categoryData.phrases && categoryData.phrases.length > 0) {
            text += `Phrases: ${categoryData.phrases.join('; ')}\n`;
        }
        text += '\n';
    }
    return text.trim();
};


const TopicWeb: React.FC<{ data: TopicWebData, onNodeClick: (term: string) => void }> = ({ data, onNodeClick }) => {
    const categories = Object.keys(data.categories).filter(key =>
        (data.categories[key]?.words && data.categories[key].words.length > 0) ||
        (data.categories[key]?.phrases && data.categories[key].phrases.length > 0)
    );
    const categoryColors: { [key: string]: string } = {
        "Synonyms": "bg-green-100 text-green-800",
        "Antonyms": "bg-red-100 text-red-800",
        "Related Concepts": "bg-blue-100 text-blue-800",
        "Collocations": "bg-yellow-100 text-yellow-800",
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            <div className="flex justify-center items-center mb-8 relative">
                 <h2 className="text-3xl font-bold text-center text-slate-800">
                    Topic Web for: <span className="text-indigo-600">{data.topic}</span>
                </h2>
                <div className="absolute right-0">
                    <CopyToClipboardButton textToCopy={() => formatTopicWebForCopy(data)} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(category => (
                    <div key={category} className="p-4 rounded-lg border-2 border-slate-200">
                        <h3 className={`text-lg font-semibold mb-3 ${categoryColors[category]?.replace('bg-', 'text-').split(' ')[1] || 'text-slate-700'}`}>{category}</h3>
                         <div className="flex flex-col gap-4">
                            {data.categories[category].words?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Words</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.categories[category].words.map(word => (
                                            <button
                                                key={word}
                                                onClick={() => onNodeClick(word)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-transform hover:scale-105 shadow-sm ${categoryColors[category] || 'bg-slate-100 text-slate-800'}`}
                                            >
                                                {word}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {data.categories[category].phrases?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Phrases</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.categories[category].phrases.map(phrase => (
                                            <button
                                                key={phrase}
                                                onClick={() => onNodeClick(phrase)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-transform hover:scale-105 shadow-sm ${categoryColors[category] || 'bg-slate-100 text-slate-800'}`}
                                            >
                                                {phrase}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MainContent: React.FC<MainContentProps> = (props) => {
    const { 
        results, loading, error, 
        topicWebData, topicWebLoading, 
        onExploreDetails, onUpdateTermData, onPronounce, onWebNodeClick,
        userApiKey 
    } = props;

    const [collapsedStates, setCollapsedStates] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        const newStates: Record<string, boolean> = {};
        if (results) {
            results.forEach(term => {
                newStates[term.term] = collapsedStates[term.term] ?? true;
            });
        }
        setCollapsedStates(newStates);
    }, [results]);

    const handleToggleAll = (collapse: boolean) => {
        const newStates: Record<string, boolean> = {};
        results.forEach(term => {
            newStates[term.term] = collapse;
        });
        setCollapsedStates(newStates);
    };

    const areAllCollapsed = React.useMemo(() => {
        if (!results || results.length === 0) return true;
        return results.every(term => collapsedStates[term.term]);
    }, [results, collapsedStates]);
    
    // FIX: Explicitly type `groupedResults` to resolve a TypeScript inference issue with useMemo,
    // which caused `terms` in the `.map()` below to be of type `unknown`.
    const groupedResults: Record<string, TermData[]> = useMemo(() => {
        if (results.length <= 1) return { 'Results': results };
        
        const acc: Record<string, TermData[]> = {};
        for (const term of results) {
            const pos = term.meanings[0]?.partOfSpeech || 'Other';
            if (!acc[pos]) {
                acc[pos] = [];
            }
            acc[pos].push(term);
        }
        return acc;
    }, [results]);

    return (
        <main className="flex-grow lg:h-screen lg:overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-10">
            {error && (
                <div className="p-4 mb-6 bg-red-100 border border-red-200 text-red-700 rounded-lg text-center shadow-sm sticky top-4 z-20">
                    {error}
                </div>
            )}
            
            {(loading || topicWebLoading) && (
                <div className="flex justify-center items-center py-20">
                    <Spinner size="lg" />
                </div>
            )}
            
            {!loading && !topicWebLoading && topicWebData && (
                <TopicWeb data={topicWebData} onNodeClick={onWebNodeClick} />
            )}
            
            {!loading && !topicWebLoading && !topicWebData && results.length === 0 && (
                <div className="text-center py-20 px-6">
                    <i className="fas fa-book-open text-6xl text-indigo-300 mb-6"></i>
                    <h2 className="text-3xl font-bold text-slate-700 mb-3">Welcome to Vocabulary Explorer</h2>
                    <p className="text-slate-500 max-w-md mx-auto">Enter a word in the sidebar to begin your exploration, or try the AI Topic Web generator!</p>
                </div>
            )}

            {!topicWebData && results.length > 0 && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => handleToggleAll(!areAllCollapsed)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-300"
                    >
                        <i className={`fas ${areAllCollapsed ? 'fa-plus-square' : 'fa-minus-square'} mr-2`}></i>
                        {areAllCollapsed ? 'Expand All' : 'Collapse All'}
                    </button>
                </div>
            )}

            {!topicWebData && (
                 <div className="space-y-8">
                    {Object.entries(groupedResults).map(([groupName, terms]) => (
                        <div key={groupName}>
                            {Object.keys(groupedResults).length > 1 && (
                                <h2 className="text-2xl font-extrabold text-slate-600 mb-4 border-b-2 border-indigo-200 pb-2">{groupName}</h2>
                            )}
                             <div className="space-y-6">
                                {terms.map((termData) => (
                                    <ResultCard
                                        key={termData.term}
                                        termData={termData}
                                        onExploreDetails={onExploreDetails}
                                        onUpdateTermData={onUpdateTermData}
                                        onPronounce={onPronounce}
                                        userApiKey={userApiKey}
                                        isCollapsed={collapsedStates[termData.term] ?? true}
                                        onToggleCollapse={() => {
                                            setCollapsedStates(prev => ({ ...prev, [termData.term]: !prev[termData.term] }));
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
};
