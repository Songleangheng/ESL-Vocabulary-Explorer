import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import type { TermData } from '../../types';

interface FlashcardModalProps {
    isOpen: boolean;
    onClose: () => void;
    terms: TermData[];
}

export const FlashcardModal: React.FC<FlashcardModalProps> = ({ isOpen, onClose, terms }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setIsFlipped(false);
        }
    }, [isOpen]);

    if (!terms || terms.length === 0) return null;

    const currentCard = terms[currentIndex];
    const currentMeaning = currentCard.meanings[0];
    const currentDetails = currentCard.details?.[0];

    const handleNext = () => {
        if (currentIndex < terms.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setCurrentIndex(currentIndex - 1);
        }
    };
    
    const formatExample = (text: string) => {
        if (!text) return 'No example provided.';
        const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const boldedText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-600 font-semibold">$1</strong>');
        return <span dangerouslySetInnerHTML={{ __html: boldedText }} />;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Flashcards" maxWidth="max-w-xl">
            <div className="w-full h-72 mb-6" style={{ perspective: '1000px' }}>
                <div 
                    className="relative w-full h-full text-center transition-transform duration-700"
                    style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* Front */}
                    <div className="absolute w-full h-full p-6 rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                        <p className="text-lg md:text-xl text-slate-700 text-center leading-relaxed">{currentMeaning.definition}</p>
                    </div>
                    {/* Back */}
                    <div className="absolute w-full h-full p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div>
                             <p className="text-2xl md:text-3xl font-bold text-slate-800 text-center">{currentCard.term}</p>
                            <p className="text-sm text-slate-500 italic mt-1 mb-3">{`(${currentMeaning.partOfSpeech})`}</p>
                            <div className="text-sm text-slate-600 italic space-y-1">
                                {currentDetails?.examples?.slice(0, 2).map((ex, i) => <p key={i}>{formatExample(ex)}</p>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
             <div className="flex justify-between items-center">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="px-5 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors text-sm">
                    <i className="fas fa-arrow-left mr-1"></i> Prev
                </button>
                <p className="text-sm text-slate-500 font-medium">{`Card ${currentIndex + 1} / ${terms.length}`}</p>
                <button onClick={handleNext} disabled={currentIndex === terms.length - 1} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm">
                    Next <i className="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        </Modal>
    );
};
