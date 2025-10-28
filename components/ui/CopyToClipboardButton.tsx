
import React, { useState } from 'react';

interface CopyToClipboardButtonProps {
    textToCopy: () => string;
    className?: string;
    title?: string;
    iconOnly?: boolean;
}

export const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({ textToCopy, className, title = "Copy to clipboard", iconOnly = false }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isCopied) return;
        try {
            await navigator.clipboard.writeText(textToCopy());
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };
    
    const defaultClasses = iconOnly 
        ? "text-slate-400 hover:text-slate-700"
        : "px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md shadow-sm hover:bg-slate-200 disabled:opacity-70 flex items-center justify-center";

    return (
        <button onClick={handleCopy} className={`${defaultClasses} ${className || ''}`} title={title} disabled={isCopied}>
            {iconOnly ? (
                <i className={`fas ${isCopied ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
            ) : (
                <>
                    <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'} mr-1.5`}></i>
                    {isCopied ? 'Copied!' : 'Copy All'}
                </>
            )}
        </button>
    );
};
