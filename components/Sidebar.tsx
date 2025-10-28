import React, { useState, useMemo } from 'react';
import type { Library, TermData } from '../types';
import { ESL_LEVELS } from '../constants';
import { fetchSuggestions } from '../services/geminiService';
import { Spinner } from './ui/Spinner';

interface SidebarProps {
    onSearch: (terms: string[], level: string) => void;
    onCompare: (word1: string, word2: string, level: string) => void;
    onGenerateTopicWeb: (topic: string, level: string) => void;
    library: Library;
    onPractice: (selectedTerms: TermData[]) => void;
    onFlashcards: (selectedTerms: TermData[]) => void;
    onDelete: (selectedTermKeys: string[]) => void;
    onExploreLibraryTerms: (selectedTermKeys: string[], level: string) => void;
    onShowDashboard: () => void;
    onStartAssessment: (selectedTerms: TermData[]) => void;
    userApiKey: string | null;
    onUpdateApiKey: (key: string | null) => void;
    onUpdateTermStatus: (termKey: string, status: 'learning' | 'mastered') => void;
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; initialCollapsed?: boolean; headerContent?: React.ReactNode; }> = 
({ title, children, initialCollapsed = false, headerContent }) => {
    const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
    return (
        <div className={`mt-6 ${isCollapsed ? '' : 'pb-4'}`}>
            <header onClick={() => setIsCollapsed(!isCollapsed)} className="flex justify-between items-center cursor-pointer border-b border-slate-700 pb-3 mb-5">
                <h2 className="text-xl font-extrabold text-slate-200">{title}</h2>
                <div className="flex items-center gap-4">
                  {headerContent}
                  <i className={`fas fa-chevron-down text-slate-400 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}></i>
                </div>
            </header>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'max-h-0' : 'max-h-[5000px]'}`}>{children}</div>
        </div>
    );
};

const InputWithClear: React.FC<{value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onClear: () => void, placeholder: string}> = 
({ value, onChange, onClear, placeholder }) => (
    <div className="relative">
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-700 border-slate-600 rounded-lg pr-8" />
        {value && <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><i className="fas fa-times-circle"></i></button>}
    </div>
);

const posAbbreviations: { [key: string]: string } = {
    'noun': 'n',
    'verb': 'v',
    'adjective': 'adj',
    'adverb': 'adv',
    'preposition': 'prep',
    'conjunction': 'conj',
    'phrase': 'phr',
    'idiom': 'phr',
};
const getPosAbbr = (pos: string) => {
    if (!pos) return '';
    const lowerPos = pos.toLowerCase();
    for (const key in posAbbreviations) {
        if (lowerPos.includes(key)) {
            return posAbbreviations[key];
        }
    }
    return lowerPos.substring(0, 3);
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { onSearch, onCompare, onGenerateTopicWeb, library, onPractice, onFlashcards, onDelete, onExploreLibraryTerms, onShowDashboard, userApiKey, onUpdateApiKey, onUpdateTermStatus, onStartAssessment } = props;
    
    const [wordInput, setWordInput] = useState('');
    const [level, setLevel] = useState('Intermediate');
    const [topicInput, setTopicInput] = useState('');
    const [topicWebInput, setTopicWebInput] = useState('');
    const [topicCount, setTopicCount] = useState(10);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [compareWord1, setCompareWord1] = useState('');
    const [compareWord2, setCompareWord2] = useState('');
    const [sortKey, setSortKey] = useState<'newest' | 'oldest' | 'az' | 'pos'>('newest');
    const [selectedLibraryTerms, setSelectedLibraryTerms] = useState<Set<string>>(new Set());
    const [apiKeyInput, setApiKeyInput] = useState('');

    const handleSearchClick = () => {
        const terms = wordInput.split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
        onSearch(terms, level);
    };

    const handleSuggestClick = async () => {
        if (!topicInput) return;
        setSuggestLoading(true); setSuggestions([]); setSelectedSuggestions(new Set());
        try {
            const result = await fetchSuggestions(topicInput, topicCount, level, userApiKey);
            setSuggestions(result);
        } catch (e) { console.error(e); } finally { setSuggestLoading(false); }
    };

    const handleSuggestionSelect = (suggestion: string) => {
        const newSet = new Set(selectedSuggestions);
        if (newSet.has(suggestion)) {
            newSet.delete(suggestion);
        } else {
            newSet.add(suggestion);
        }
        setSelectedSuggestions(newSet);
    };

    const handleSelectAllSuggestions = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedSuggestions(new Set(suggestions));
        } else {
            setSelectedSuggestions(new Set());
        }
    };

    const handleExploreSuggestions = () => {
        if (selectedSuggestions.size === 0) return;
        onSearch(Array.from(selectedSuggestions), level);
    };
    
    const handleCompareClick = () => {
        if (compareWord1 && compareWord2) onCompare(compareWord1, compareWord2, level);
    };

    const handleGenerateWebClick = () => {
        if (topicWebInput) onGenerateTopicWeb(topicWebInput, level);
    };

    const { learningKeys, masteredKeys } = useMemo(() => {
        const keys = Object.keys(library);
        const sortedKeys = keys.sort((a, b) => {
            if (sortKey === 'az') return a.localeCompare(b);
             if (sortKey === 'pos') {
                const posA = library[a].meanings[0]?.partOfSpeech || 'zzz';
                const posB = library[b].meanings[0]?.partOfSpeech || 'zzz';
                if (posA === posB) return a.localeCompare(b);
                return posA.localeCompare(posB);
            }
            const timeA = library[a].addedTimestamp || 0;
            const timeB = library[b].addedTimestamp || 0;
            if (sortKey === 'oldest') return timeA - timeB;
            return timeB - timeA; // newest
        });
        
        return {
            learningKeys: sortedKeys.filter(k => library[k].status !== 'mastered'),
            masteredKeys: sortedKeys.filter(k => library[k].status === 'mastered'),
        };
    }, [library, sortKey]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedLibraryTerms(e.target.checked ? new Set([...learningKeys, ...masteredKeys]) : new Set());
    };
    
    const handleTermSelect = (termKey: string) => {
        const newSet = new Set(selectedLibraryTerms);
        if (newSet.has(termKey)) newSet.delete(termKey);
        else newSet.add(termKey);
        setSelectedLibraryTerms(newSet);
    };

    const handleSaveKey = () => onUpdateApiKey(apiKeyInput.trim());
    const handleClearKey = () => { setApiKeyInput(''); onUpdateApiKey(null); };

    const selectedTermsData = Array.from(selectedLibraryTerms).map((key: string) => library[key]).filter(Boolean);
    
    const renderLibraryList = (keys: string[], listTitle: string) => (
        <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-400 mb-2 px-2">{listTitle} ({keys.length})</h4>
            {keys.length > 0 ? keys.map(key => {
                const term = library[key];
                const pos = term.meanings[0]?.partOfSpeech || '';
                const abbr = getPosAbbr(pos);
                return (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700 group">
                        <div className="flex items-center gap-3 overflow-hidden flex-grow cursor-pointer" onClick={() => handleTermSelect(key)}>
                            <input type="checkbox" readOnly checked={selectedLibraryTerms.has(key)} className="library-checkbox h-4 w-4 rounded text-indigo-500 focus:ring-indigo-400 border-slate-600 bg-slate-700 pointer-events-none" />
                            <span className="text-slate-100 font-medium truncate" title={term.term}>
                                {term.term}
                                {abbr && <span className="text-slate-400 text-xs ml-1.5 font-sans">({abbr})</span>}
                            </span>
                        </div>
                        <button 
                            onClick={() => onUpdateTermStatus(key, term.status === 'mastered' ? 'learning' : 'mastered')}
                            className="text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                            title={term.status === 'mastered' ? 'Move to learning' : 'Mark as mastered'}
                        >
                           <i className={`fas ${term.status === 'mastered' ? 'fa-book' : 'fa-check-circle'}`}></i>
                        </button>
                    </div>
                )
            }) : <p className="text-slate-500 text-xs italic p-2">{listTitle === 'Need to Learn' ? 'No new words. Great job!' : 'No mastered words yet.'}</p>}
        </div>
    );

    return (
        <aside className="w-full lg:w-80 xl:w-96 bg-gradient-to-b from-slate-800 to-slate-900 text-slate-200 p-6 flex flex-col flex-shrink-0 shadow-xl z-10 lg:h-screen lg:overflow-y-auto custom-scrollbar">
            <div className="mb-8 text-center"><h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-1">Vocabulary Explorer</h1><p className="text-sm text-slate-400">Your Personal Lexicon Builder</p></div>

            <div className="border-b border-slate-700 pb-5 mb-5">
                 <h2 className="text-xl font-extrabold text-slate-200 mb-5">🔍 Explore Terms</h2>
                 <div className="space-y-4">
                    <p className="text-sm text-slate-400">Enter words (comma/new line separated).</p>
                    <div className="relative">
                        <textarea value={wordInput} onChange={e => setWordInput(e.target.value)} placeholder="e.g., enthusiastic, a piece of cake" className="w-full h-20 px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm custom-scrollbar resize-none bg-slate-700 border-slate-600 color-slate-100 rounded-lg" />
                        {wordInput && <button onClick={() => setWordInput('')} className="absolute right-2 top-2 text-slate-400 hover:text-white"><i className="fas fa-times-circle"></i></button>}
                    </div>
                    <select value={level} onChange={e => setLevel(e.target.value)} className="w-full px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-700 border-slate-600 text-slate-100 rounded-lg">{ESL_LEVELS.map(l => <option key={l} value={l}>Level: {l}</option>)}</select>
                    <button onClick={handleSearchClick} className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none">Explore Term</button>
                 </div>
            </div>
            
            <CollapsibleSection title="⚙️ Settings" initialCollapsed>
                <div className="space-y-3">
                    <p className="text-sm text-slate-400">Save your Gemini API key here.</p>
                    <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder={userApiKey ? "•••••••••• Key Saved" : "Enter your API key"} className="w-full px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-700 border-slate-600 rounded-lg" />
                    <div className="flex gap-2"><button onClick={handleSaveKey} className="flex-grow px-4 py-2 bg-indigo-200 text-indigo-800 font-semibold rounded-lg text-sm hover:bg-indigo-300">Save</button><button onClick={handleClearKey} className="px-4 py-2 bg-red-200 text-red-800 font-semibold rounded-lg text-sm hover:bg-red-300">Clear</button></div>
                    <p className="text-xs text-slate-400 pt-1 flex items-center gap-1.5">{userApiKey ? <><i className="fas fa-check-circle text-green-400"></i><span>Using your saved key.</span></> : <><i className="fas fa-info-circle"></i><span>Using default app key.</span></>}</p>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="📊 Progress Dashboard" initialCollapsed>
                 <div className="space-y-3">
                    <p className="text-sm text-slate-400">Review your learning analytics.</p>
                    <button onClick={onShowDashboard} className="w-full px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-lg shadow-md hover:opacity-90">View Dashboard</button>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="🕸️ AI Topic Web" initialCollapsed>
                <div className="space-y-3">
                    <p className="text-sm text-slate-400">Generate a web of related vocabulary.</p>
                    <InputWithClear value={topicWebInput} onChange={e => setTopicWebInput(e.target.value)} onClear={() => setTopicWebInput('')} placeholder="e.g., 'environment'" />
                    <button onClick={handleGenerateWebClick} className="w-full px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:opacity-90">Generate Web</button>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="💡 Suggest Vocabulary" initialCollapsed>
                <div className="space-y-3">
                    <InputWithClear value={topicInput} onChange={e => setTopicInput(e.target.value)} onClear={() => setTopicInput('')} placeholder="e.g., 'cooking'" />
                    <button onClick={handleSuggestClick} disabled={suggestLoading} className="w-full px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center">{suggestLoading ? <Spinner /> : 'Suggest Words'}</button>
                    {suggestions.length > 0 && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-slate-700">
                            <div className="flex items-center text-sm">
                                <input id="selectAllSuggestions" type="checkbox" onChange={handleSelectAllSuggestions} checked={suggestions.length > 0 && selectedSuggestions.size === suggestions.length} className="h-4 w-4 rounded text-indigo-500 focus:ring-indigo-400 border-slate-600 bg-slate-700 mr-2" />
                                <label htmlFor="selectAllSuggestions" className="font-medium text-slate-300">Select All</label>
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-700 rounded-lg p-2 bg-slate-800">
                                {suggestions.map((s, i) => (
                                    <div key={s} className="flex items-center p-1 rounded hover:bg-slate-700">
                                        <input type="checkbox" id={`sugg-${i}`} checked={selectedSuggestions.has(s)} onChange={() => handleSuggestionSelect(s)} className="h-4 w-4 rounded text-indigo-500 focus:ring-indigo-400 border-slate-600 bg-slate-700" />
                                        <label htmlFor={`sugg-${i}`} className="pl-2 text-slate-100 cursor-pointer flex-grow">{s}</label>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleExploreSuggestions} disabled={selectedSuggestions.size === 0} className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                                <i className="fas fa-search-plus"></i>
                                <span>Explore ({selectedSuggestions.size}) Selected</span>
                            </button>
                        </div>
                    )}
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title="⚖️ Word vs. Word" initialCollapsed>
                 <div className="space-y-3">
                    <InputWithClear value={compareWord1} onChange={e => setCompareWord1(e.target.value)} onClear={() => setCompareWord1('')} placeholder="e.g., affect" />
                    <InputWithClear value={compareWord2} onChange={e => setCompareWord2(e.target.value)} onClear={() => setCompareWord2('')} placeholder="e.g., effect" />
                    <button onClick={handleCompareClick} className="w-full px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:opacity-90">Compare</button>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="💡 Assessment" initialCollapsed>
                <div className="space-y-3">
                    <p className="text-sm text-slate-400">Select words from your library to start a comprehensive assessment of your understanding.</p>
                    <button 
                        onClick={() => onStartAssessment(selectedTermsData)} 
                        disabled={selectedLibraryTerms.size === 0}
                        className="w-full px-6 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:opacity-90 disabled:opacity-50"
                    >
                        Start Assessment ({selectedLibraryTerms.size} words)
                    </button>
                </div>
            </CollapsibleSection>

            <div className="mt-6 flex-grow flex flex-col min-h-0">
                <CollapsibleSection title="📚 My Library" headerContent={<select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-xs focus:outline-none text-slate-300"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="az">A-Z</option><option value="pos">Part of Speech</option></select>}>
                    <div className="flex items-center mb-3 text-sm"><input id="selectAll" type="checkbox" onChange={handleSelectAll} checked={[...learningKeys, ...masteredKeys].length > 0 && selectedLibraryTerms.size === [...learningKeys, ...masteredKeys].length} className="h-4 w-4 rounded text-indigo-500 focus:ring-indigo-400 border-slate-600 bg-slate-700 mr-2" /><label htmlFor="selectAll" className="font-medium text-slate-300">Select All</label></div>
                    <div className="flex-grow overflow-y-auto mb-4 custom-scrollbar pr-1 -mr-1 space-y-1 min-h-[100px] bg-slate-800 p-2 rounded-lg border border-slate-700">
                        {renderLibraryList(learningKeys, "Need to Learn")}
                        {masteredKeys.length > 0 && renderLibraryList(masteredKeys, "Mastered")}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-700">
                        <button onClick={() => onExploreLibraryTerms(Array.from(selectedLibraryTerms), level)} disabled={selectedLibraryTerms.size === 0} className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><i className="fas fa-search-plus"></i><span>Explore ({selectedLibraryTerms.size})</span></button>
                        <button onClick={() => onFlashcards(selectedTermsData)} disabled={selectedLibraryTerms.size === 0} className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><i className="far fa-clone"></i><span>Cards ({selectedLibraryTerms.size})</span></button>
                        <button onClick={() => onPractice(selectedTermsData)} disabled={selectedLibraryTerms.size === 0} className="px-3 py-2 bg-yellow-500 text-white text-xs font-semibold rounded-lg shadow-md hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-1.5"><i className="fas fa-pencil-alt"></i><span>Practice ({selectedLibraryTerms.size})</span></button>
                        <button onClick={() => onDelete(Array.from(selectedLibraryTerms))} disabled={selectedLibraryTerms.size === 0} className="px-3 py-2 bg-red-100 text-red-700 text-xs font-semibold rounded-lg shadow-md hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-1.5"><i className="fas fa-trash-alt"></i><span>Delete ({selectedLibraryTerms.size})</span></button>
                    </div>
                </CollapsibleSection>
            </div>
        </aside>
    );
};