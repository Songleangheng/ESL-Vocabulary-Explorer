
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, maxWidth = "max-w-2xl" }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div 
                className={`bg-white w-full ${maxWidth} p-6 rounded-2xl shadow-xl relative modal-content custom-scrollbar flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center mb-6 flex-shrink-0">
                     <h2 className="text-2xl font-bold text-center text-indigo-700 w-full">{title}</h2>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {children}
                </div>
            </div>
        </div>
    );
};
