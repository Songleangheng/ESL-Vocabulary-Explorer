
import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'white' | 'indigo';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'indigo' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-10 h-10',
    };

    const colorClasses = {
        white: 'border-white/20 border-t-white',
        indigo: 'border-indigo-200 border-t-indigo-600',
    };

    return (
        <div className={`animate-spin rounded-full border-4 ${sizeClasses[size]} ${colorClasses[color]}`} />
    );
};
