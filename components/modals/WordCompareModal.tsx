
import React from 'react';
import { Modal } from '../ui/Modal';
import type { WordComparisonData } from '../../types';
import { CopyToClipboardButton } from '../ui/CopyToClipboardButton';

interface WordCompareModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: WordComparisonData | null;
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


export const WordCompareModal: React.FC<WordCompareModalProps> = ({ isOpen, onClose, data }) => {
    if (!data) return null;

    const formatForCopy = (): string => {
        if (!data) return '';
        return `Word Comparison: ${data.word1.term} vs. ${data.word2.term}\n\n` +
               `--- ${data.word1.term.toUpperCase()} ---\n` +
               `Definition: ${data.word1.definition}\n` +
               `Examples:\n${data.word1.examples.map(ex => `• ${ex.replace(/\*\*/g, '')}`).join('\n')}\n\n` +
               `--- ${data.word2.term.toUpperCase()} ---\n` +
               `Definition: ${data.word2.definition}\n` +
               `Examples:\n${data.word2.examples.map(ex => `• ${ex.replace(/\*\*/g, '')}`).join('\n')}\n\n` +
               `--- SUMMARY ---\n` +
               `${data.summary}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Word vs. Word" maxWidth="max-w-3xl">
            <div className="space-y-6">
                <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg">
                    <h3 className="font-bold text-indigo-800">The Key Difference</h3>
                    <p className="text-slate-700 mt-1">{data.summary}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Word 1 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                        <h4 className="text-xl font-bold text-slate-800">{data.word1.term}</h4>
                        <p className="text-slate-600 mt-2">{data.word1.definition}</p>
                         <div className="mt-4">
                            <h5 className="font-semibold text-slate-700 text-sm">Examples:</h5>
                            {data.word1.examples.length > 0 ? (
                                <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm mt-2">
                                    {data.word1.examples.map((ex, i) => <li key={i}>{renderFormattedText(ex)}</li>)}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic mt-2">No examples available.</p>
                            )}
                        </div>
                    </div>

                    {/* Word 2 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                        <h4 className="text-xl font-bold text-slate-800">{data.word2.term}</h4>
                        <p className="text-slate-600 mt-2">{data.word2.definition}</p>
                        <div className="mt-4">
                            <h5 className="font-semibold text-slate-700 text-sm">Examples:</h5>
                            {data.word2.examples.length > 0 ? (
                                <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm mt-2">
                                    {data.word2.examples.map((ex, i) => <li key={i}>{renderFormattedText(ex)}</li>)}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic mt-2">No examples available.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <CopyToClipboardButton textToCopy={formatForCopy} />
                </div>
            </div>
        </Modal>
    );
};
