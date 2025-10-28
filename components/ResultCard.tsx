
import React, { useState } from 'react';
import type { TermData, Details, Translation, Scenario, GrammarRule, RegisterShiftData } from '../types';
import { Spinner } from './ui/Spinner';
import { CopyToClipboardButton } from './ui/CopyToClipboardButton';
import { fetchTranslation, fetchScenarios, fetchGrammarRules, fetchSimplifiedDefinition, fetchRegisterShift } from '../services/geminiService';

interface ResultCardProps {
    termData: TermData;
    onExploreDetails: (term: TermData, meaningIndex: number, level: string) => Promise<void>;
    onUpdateTermData: (updatedTerm: TermData) => void;
    onPronounce: (termData: TermData, buttonElement: HTMLButtonElement) => Promise<void>;
    userApiKey: string | null;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const renderFormattedText = (text: string) => {
    if (!text) return null;
    const formatted = text
        .replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-600">$1</strong>')
        .replace(/\n/g, "<br />")
        .replace(/•/g, '<span class="mr-2">•</span>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
};

const DetailsSection: React.FC<{title: string, icon: string, children: React.ReactNode}> = ({title, icon, children}) => (
    <div>
        <h3 className="text-xl font-semibold text-indigo-700 mb-3 flex items-center">
            <i className={`fas ${icon} w-5 mr-3 text-indigo-500`}></i>
            {title}
        </h3>
        {children}
    </div>
);

const CollapsibleSubSection: React.FC<{
    title: string;
    children: React.ReactNode;
    isGenerated: boolean;
    isLoading: boolean;
    onGenerate: () => void;
}> = ({ title, children, isGenerated, isLoading, onGenerate }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <header
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <h4 className="font-semibold text-slate-600">{title}</h4>
                <div className="flex items-center gap-3">
                    {!isGenerated && (
                        <button onClick={(e) => { e.stopPropagation(); onGenerate(); }} disabled={isLoading} className="text-sm text-indigo-600 hover:underline disabled:opacity-50">
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    )}
                    {isGenerated && <i className={`fas fa-chevron-down text-slate-400 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}></i>}
                </div>
            </header>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed || !isGenerated ? 'max-h-0' : 'max-h-[1000px] mt-2'}`}>
                {children}
            </div>
        </div>
    );
};


const RegisterShifterView: React.FC<{ data: RegisterShiftData }> = ({ data }) => {
    const levels = [
        { name: 'Casual', text: data.casual, color: 'bg-green-100', icon: 'fa-comment-dots' },
        { name: 'Neutral', text: data.neutral, color: 'bg-blue-100', icon: 'fa-comment' },
        { name: 'Formal', text: data.formal, color: 'bg-purple-100', icon: 'fa-briefcase' },
        { name: 'Academic', text: data.academic, color: 'bg-yellow-100', icon: 'fa-graduation-cap' }
    ];
    return (
        <div className="space-y-2 mt-2">
            {levels.map(level => (
                 <div key={level.name} className={`p-2 rounded ${level.color}`}>
                    <p className="font-semibold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2"><i className={`fas ${level.icon}`}></i>{level.name}</p>
                    <p className="text-sm text-slate-800">{level.text}</p>
                </div>
            ))}
            <div className="p-2 bg-slate-100 rounded">
                 <p className="font-semibold text-xs uppercase tracking-wider text-slate-600">Explanation</p>
                 <p className="text-sm text-slate-800">{data.explanation}</p>
            </div>
        </div>
    );
};

export const ResultCard: React.FC<ResultCardProps> = (props) => {
    const { termData, onExploreDetails, onUpdateTermData, onPronounce, userApiKey, isCollapsed, onToggleCollapse } = props;
    const [selectedMeaningIndex, setSelectedMeaningIndex] = useState(0);
    const [detailsLoading, setDetailsLoading] = useState(false);
    
    const [translationLoading, setTranslationLoading] = useState(false);
    const [scenariosLoading, setScenariosLoading] = useState(false);
    const [grammarLoading, setGrammarLoading] = useState(false);
    const [simplifyLoading, setSimplifyLoading] = useState(false);
    const [registerShiftLoading, setRegisterShiftLoading] = useState(false);

    const termId = termData.term.replace(/[^a-zA-Z0-9-_]/g, '-');
    const details: Details | undefined = termData.details?.[selectedMeaningIndex];
    const registerShiftData = details?.registerShift;

    const handleExploreClick = async () => {
        setDetailsLoading(true);
        try {
            await onExploreDetails(termData, selectedMeaningIndex, 'Intermediate');
        } catch (e) { console.error(e); } 
        finally { setDetailsLoading(false); }
    };
    
    const handleFeatureFetch = async (
        fetcher: () => Promise<Partial<Details>>,
        setter: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        setter(true);
        try {
            const newDetailsData = await fetcher();
            const updatedDetails = { 
                ...(details || { examples: [], wordFamily: [], synonyms: [], antonyms: [], collocations: [] }),
                ...newDetailsData
            };
            onUpdateTermData({ ...termData, details: { ...termData.details, [selectedMeaningIndex]: updatedDetails } });
        } catch (e) { console.error(e); } 
        finally { setter(false); }
    };

    const handleTranslate = (language: string) => {
        if (!language) return;
        handleFeatureFetch(async () => {
            const text = await fetchTranslation(termData.term, termData.meanings[selectedMeaningIndex].definition, language, userApiKey);
            const newTrans: Translation = { language, text };
            const existing = details?.translations?.filter(t => t.language !== language) || [];
            return { translations: [...existing, newTrans] };
        }, setTranslationLoading);
    };

    const handleGetScenarios = () => handleFeatureFetch(async () => ({ scenarios: (await fetchScenarios(termData.term, termData.meanings[selectedMeaningIndex].partOfSpeech, termData.meanings[selectedMeaningIndex].definition, 'Intermediate', userApiKey)).map(text => ({ text })) }), setScenariosLoading);
    const handleGetGrammar = () => handleFeatureFetch(async () => ({ grammarRules: (await fetchGrammarRules(termData.term, 'Intermediate', userApiKey)).map(text => ({ text })) }), setGrammarLoading);
    const handleSimplify = () => handleFeatureFetch(async () => ({ simplifiedDefinition: { text: await fetchSimplifiedDefinition(termData.term, termData.meanings[selectedMeaningIndex].partOfSpeech, termData.meanings[selectedMeaningIndex].definition, 'Intermediate', userApiKey) } }), setSimplifyLoading);
    const handleRegisterShift = () => handleFeatureFetch(async () => {
        const example = details?.examples?.[0]?.replace(/\*\*/g, '');
        if (!example) {
            alert("Please explore details to get an example sentence first.");
            return {};
        }
        return { registerShift: await fetchRegisterShift(termData.term, termData.meanings[selectedMeaningIndex], example, 'Intermediate', userApiKey) };
    }, setRegisterShiftLoading);

    const formatTermDataForCopy = (): string => {
        let text = `${termData.term} (${termData.syllables}) ${termData.phonetic}\n\n`;
        text += "--- MEANINGS ---\n";
        termData.meanings.forEach((m, i) => {
            text += `${i + 1}. (${m.partOfSpeech}) ${m.definition}\n`;
        });

        if (termData.details) {
            Object.entries(termData.details).forEach(([meaningIndex, detailData]) => {
                // FIX: Cast `detailData` to `Details` to resolve type inference issue with Object.entries.
                const details = detailData as Details;
                text += `\n\n--- DETAILS FOR MEANING #${parseInt(meaningIndex) + 1} ---\n`;
                if (details.simplifiedDefinition) text += `\nSimplified: ${details.simplifiedDefinition.text}\n`;
                if (details.examples?.length) text += `\nExamples:\n${details.examples.map(ex => `• ${ex.replace(/\*\*/g, '')}`).join('\n')}\n`;
                if (details.synonyms?.length) text += `\nSynonyms:\n${details.synonyms.map(s => `• ${s.word}: e.g., ${s.example.replace(/\*\*/g, '')}`).join('\n')}\n`;
                if (details.antonyms?.length) text += `\nAntonyms:\n${details.antonyms.map(a => `• ${a.word}: e.g., ${a.example.replace(/\*\*/g, '')}`).join('\n')}\n`;
                if (details.collocations?.length) {
                    text += "\nCollocations:\n";
                    details.collocations.forEach(c => {
                        text += `  *${c.heading}*:\n${c.items.map(item => `    • ${item.phrase}: e.g., ${item.example.replace(/\*\*/g, '')}`).join('\n')}\n`;
                    });
                }
                if (details.scenarios?.length) text += `\nScenarios:\n${details.scenarios.map(s => `• ${s.text}`).join('\n')}\n`;
                if (details.grammarRules?.length) text += `\nGrammar Rules:\n${details.grammarRules.map(r => `• ${r.text}`).join('\n')}\n`;
            });
        }
        return text;
    };

    return (
        <div className="bg-white w-full rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <header onClick={onToggleCollapse} className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-200 cursor-pointer hover:bg-slate-50">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate" title={termData.term}>{termData.term}</h2>
                    {termData.syllables && <span className="text-base sm:text-lg text-slate-500 font-normal">{`(${termData.syllables})`}</span>}
                    {termData.phonetic && <span className="text-base sm:text-lg text-slate-500 font-normal">{termData.phonetic}</span>}
                </div>
                <div className="flex items-center gap-3 ml-2">
                    <CopyToClipboardButton textToCopy={formatTermDataForCopy} iconOnly title="Copy all details"/>
                    <button onClick={(e) => { e.stopPropagation(); onPronounce(termData, e.currentTarget); }} className="text-indigo-500 hover:text-indigo-700 text-lg w-6 h-6 flex items-center justify-center"><i className="fas fa-volume-up"></i></button>
                    <i className={`fas fa-chevron-down text-slate-500 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}></i>
                </div>
            </header>
            
            <div className={`transition-all duration-500 ease-in-out ${isCollapsed ? 'max-h-0' : 'max-h-[10000px]'} overflow-hidden`}>
                <div className="p-4 sm:p-6">
                    <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start">
                        <div className="flex-grow w-full">
                            <label htmlFor={`meaning-select-${termId}`} className="block text-sm font-semibold text-indigo-700 mb-2">Select Meaning:</label>
                            <select id={`meaning-select-${termId}`} value={selectedMeaningIndex} onChange={e => setSelectedMeaningIndex(Number(e.target.value))} className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-base">
                                {termData.meanings.map((m, index) => <option key={index} value={index}>{`${index + 1}. (${m.partOfSpeech}) ${m.definition}`}</option>)}
                            </select>
                        </div>
                        <div className="w-full sm:w-auto">
                            <label className="block text-sm font-semibold text-indigo-700 mb-2 invisible sm:visible">Actions:</label>
                             <div className="flex gap-2">
                                {!details && <button onClick={handleExploreClick} disabled={detailsLoading} className="px-5 py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-lg shadow-sm hover:bg-indigo-200 disabled:opacity-50 flex items-center justify-center text-base"><i className="fas fa-search-plus mr-2"></i> Explore</button>}
                                {details && <button onClick={handleSimplify} disabled={simplifyLoading} className="px-4 py-3 bg-purple-100 text-purple-700 font-semibold rounded-lg shadow-sm hover:bg-purple-200 disabled:opacity-50 flex items-center justify-center text-base"><i className="fas fa-magic-wand-sparkles mr-2"></i> Simplify</button>}
                            </div>
                        </div>
                    </div>
                    {simplifyLoading && <div className="text-center text-sm text-slate-500 my-2">Simplifying...</div>}
                    {details?.simplifiedDefinition && <div className="my-4 p-3 bg-purple-50 border-l-4 border-purple-400 rounded-r-lg text-center"><p className="font-bold text-purple-800">In 5 Words: <span className="font-medium text-slate-700">{details.simplifiedDefinition.text}</span></p></div>}
                    {detailsLoading && <div className="flex justify-center py-10"><Spinner size="lg" /></div>}

                    {details && (
                        <div className="mt-6 space-y-8">
                             <DetailsSection title="More Insights" icon="fa-lightbulb">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <h4 className="font-semibold text-slate-600 mb-2">Translate Definition</h4>
                                        <select onChange={(e) => handleTranslate(e.target.value)} disabled={translationLoading} className="w-full text-sm p-2 border rounded-md"><option value="">Language...</option><option value="Khmer">Khmer</option><option value="Chinese">Chinese</option><option value="French">French</option></select>
                                        {translationLoading && <div className="mt-2 text-sm text-slate-500">Translating...</div>}
                                        {details.translations?.map(t => <div key={t.language} className="mt-2 p-2 bg-white rounded text-sm"><strong className="text-indigo-600">{t.language}:</strong> {t.text}</div>)}
                                        <p className="text-xs text-slate-400 mt-2">Note: AI translations may be inaccurate.</p>
                                    </div>
                                    <CollapsibleSubSection title="When would I use this?" isGenerated={!!details.scenarios} isLoading={scenariosLoading} onGenerate={handleGetScenarios}>
                                        <div className="space-y-2 text-sm text-slate-700 mt-2">{details.scenarios?.map((s, i) => <p key={i} className="p-2 bg-white rounded">{renderFormattedText(s.text)}</p>)}</div>
                                    </CollapsibleSubSection>
                                    <CollapsibleSubSection title="Quick Grammar Rules" isGenerated={!!details.grammarRules} isLoading={grammarLoading} onGenerate={handleGetGrammar}>
                                        <div className="space-y-2 text-sm text-slate-700 mt-2">{details.grammarRules?.map((r, i) => <div key={i} className="p-2 bg-white rounded leading-relaxed">{renderFormattedText(r.text)}</div>)}</div>
                                    </CollapsibleSubSection>
                                    <div className="md:col-span-2 lg:col-span-3">
                                      <CollapsibleSubSection title="AI Register Shifter" isGenerated={!!registerShiftData} isLoading={registerShiftLoading} onGenerate={handleRegisterShift}>
                                          {registerShiftData && <RegisterShifterView data={registerShiftData} />}
                                      </CollapsibleSubSection>
                                    </div>
                                </div>
                            </DetailsSection>

                            {details.examples?.length > 0 && (
                                <DetailsSection title="Examples" icon="fa-quote-left">
                                    <div className="p-4 bg-white border rounded-lg">
                                        <p className="mb-3 text-sm italic text-slate-600 border-b pb-2">
                                            Showing examples for meaning: <strong className="text-slate-800">({termData.meanings[selectedMeaningIndex].partOfSpeech}) {termData.meanings[selectedMeaningIndex].definition}</strong>
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 text-slate-700">
                                            {details.examples.map((ex, i) => <li key={i}>{renderFormattedText(ex)}</li>)}
                                        </ul>
                                    </div>
                                </DetailsSection>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {(details.synonyms?.length > 0 || details.antonyms?.length > 0) && 
                                    <DetailsSection title="Synonyms & Antonyms" icon="fa-exchange-alt">
                                        <div className="space-y-4">
                                            {details.synonyms?.length > 0 && <div><h4 className="font-semibold text-slate-600 mb-2">Synonyms</h4><div className="p-4 bg-white border rounded-lg space-y-3">{details.synonyms.map((s,i) => <div key={i}><p className="font-semibold text-slate-800">{s.word}</p><p className="text-sm text-slate-500 italic">e.g., {renderFormattedText(s.example)}</p></div>)}</div></div>}
                                            {details.antonyms?.length > 0 && <div><h4 className="font-semibold text-slate-600 mb-2">Antonyms</h4><div className="p-4 bg-white border rounded-lg space-y-3">{details.antonyms.map((a,i) => <div key={i}><p className="font-semibold text-slate-800">{a.word}</p><p className="text-sm text-slate-500 italic">e.g., {renderFormattedText(a.example)}</p></div>)}</div></div>}
                                        </div>
                                    </DetailsSection>
                                }
                                {details.collocations?.length > 0 && 
                                    <DetailsSection title="Common Collocations" icon="fa-link">
                                        <div className="space-y-4">{details.collocations.map((col, i) => <div key={i} className="p-4 bg-white border rounded-lg"><h4 className="font-semibold text-slate-600 mb-2">{col.heading}</h4><div className="space-y-2">{col.items.map((item, j) => <div key={j}><p className="font-semibold text-slate-800">{item.phrase}</p><p className="text-sm text-slate-500 italic">e.g., {renderFormattedText(item.example)}</p></div>)}</div></div>)}</div>
                                    </DetailsSection>
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
