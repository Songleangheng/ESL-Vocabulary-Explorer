import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import type { TermData, PracticeType, PracticeOption } from '../../types';

const PRACTICE_OPTIONS: PracticeOption[] = [
    { id: 'meaningMatch', title: 'Meaning Matching', description: 'Match the term to its correct meaning.', icon: <i className="fas fa-check-double fa-lg text-indigo-600"></i>, minRequired: 2, dataCheck: () => true, warning: 'Need at least 2 terms.' },
    { id: 'contextCheck', title: 'Context Check', description: 'Which meaning is being used here?', icon: <i className="fas fa-search-location fa-lg text-indigo-600"></i>, minRequired: 1, dataCheck: (t) => t.meanings.length > 1, warning: 'Need terms with multiple meanings.' },
    { id: 'conversationChoice', title: 'Conversation Choice', description: 'Pick the most natural response.', icon: <i className="fas fa-comments fa-lg text-indigo-600"></i>, minRequired: 1, dataCheck: () => true, warning: 'Need at least 1 term.' },
    { id: 'spellingBee', title: 'Spelling Bee', description: 'Listen to the word and spell it.', icon: <i className="fas fa-spell-check fa-lg text-indigo-600"></i>, minRequired: 1, dataCheck: () => true, warning: 'Need at least 1 term.' },
    { id: 'syntaxScramble', title: 'Syntax Scramble', description: 'Unscramble the jumbled sentence.', icon: <i className="fas fa-random fa-lg text-indigo-600"></i>, minRequired: 1, dataCheck: (t) => !!t.details?.[0]?.examples?.length, warning: 'Need terms with example sentences.' },
    { id: 'sentence', title: 'Sentence Completion', description: 'Choose the word that fits the blank.', icon: <i className="fas fa-edit fa-lg text-indigo-600"></i>, minRequired: 2, dataCheck: (t) => !!t.details?.[0]?.examples?.length, warning: 'Need at least 2 terms with example sentences.' },
    { id: 'collocationMatch', title: 'Collocation Match', description: 'Match collocations to their meanings.', icon: <i className="fas fa-link fa-lg text-indigo-600"></i>, minRequired: 1, dataCheck: (t) => (t.details?.[0]?.collocations?.flatMap(c => c.items) || []).length >= 2, warning: 'Need terms with at least 2 collocations. Explore the term first.' },
    { id: 'sentencePractice', title: 'Sentence Practice', description: 'Write sentences and get AI feedback.', icon: <i className="fas fa-keyboard fa-lg text-indigo-600"></i>, minRequired: 1, dataCheck: () => true, warning: 'Need at least 1 term.' },
];

interface PracticeHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTerms: TermData[];
    allTerms: TermData[];
    onStartQuiz: (type: PracticeType, questions: TermData[], allTerms: TermData[]) => void;
}

export const PracticeHubModal: React.FC<PracticeHubModalProps> = ({ isOpen, onClose, selectedTerms, allTerms, onStartQuiz }) => {
    const [warning, setWarning] = useState('');

    const handleStart = (option: PracticeOption) => {
        if (selectedTerms.length < option.minRequired) {
            setWarning(option.warning);
            return;
        }
        const validTerms = selectedTerms.filter(option.dataCheck);
        if (validTerms.length < option.minRequired) {
            setWarning(option.warning + " Make sure you've explored details for the selected terms.");
            return;
        }
        setWarning('');
        onClose();
        onStartQuiz(option.id, validTerms, allTerms);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Choose a Practice Activity" maxWidth="max-w-4xl">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PRACTICE_OPTIONS.map(option => (
                    <button key={option.id} onClick={() => handleStart(option)} className="text-left p-4 bg-white border-2 border-slate-200 rounded-lg shadow-sm transition-all hover:border-indigo-400 hover:shadow-md hover:-translate-y-1">
                         <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 text-center">{option.icon}</div>
                            <div>
                                <h3 className="font-semibold text-gray-800">{option.title}</h3>
                                <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            {warning && <p className="text-red-600 text-sm mt-4 text-center">{warning}</p>}
        </Modal>
    );
};