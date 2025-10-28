import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import type { Library, QuizAttempt, DashboardStats, TermData, DashboardSummary } from '../../types';
import { fetchDashboardSummary } from '../../services/geminiService';

interface DashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    library: Library;
    userApiKey: string | null;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <i className={`fas ${icon} text-xl text-white`}></i>
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

export const DashboardModal: React.FC<DashboardModalProps> = ({ isOpen, onClose, library, userApiKey }) => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(false);

    const { stats, learningWords } = useMemo(() => {
        const words: TermData[] = Object.values(library);
        const totalWords = words.length;
        const masteredWords = words.filter(w => w.status === 'mastered').length;
        const learningWordsList = words.filter(w => w.status === 'learning').map(w => w.term);
        
        const detailsExplored = words.reduce((acc, word) => acc + Object.keys(word.details || {}).length, 0);
        const totalMeanings = words.reduce((acc, word) => acc + word.meanings.length, 0);
        const depthPercentage = totalMeanings > 0 ? Math.round((detailsExplored / totalMeanings) * 100) : 0;
        
        const masteredWithTimestamps = words.filter(w => w.status === 'mastered' && w.addedTimestamp && w.masteredTimestamp);
        const totalMasteryTime = masteredWithTimestamps.reduce((acc, w) => acc + (w.masteredTimestamp! - w.addedTimestamp!), 0);
        const avgTimeToMasteryMs = masteredWithTimestamps.length > 0 ? totalMasteryTime / masteredWithTimestamps.length : null;
        const avgTimeToMasteryHours = avgTimeToMasteryMs ? avgTimeToMasteryMs / (1000 * 60 * 60) : null;

        const quizHistory: QuizAttempt[] = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        const accuracyTrend = quizHistory.slice(-10).map(attempt => ({
            timestamp: attempt.timestamp,
            accuracy: attempt.total > 0 ? (attempt.score / attempt.total) * 100 : 0
        }));

        const stats: DashboardStats = {
            totalWords,
            masteredWords,
            learningWords: totalWords - masteredWords,
            depthPercentage,
            avgTimeToMasteryHours,
            accuracyTrend
        };
        return { stats, learningWords: learningWordsList };
    }, [library]);

    const getSummary = async () => {
        if (stats.totalWords === 0) return;
        setLoading(true);
        try {
            const result = await fetchDashboardSummary(stats, learningWords, userApiKey);
            setSummary(result);
        } catch (e) {
            console.error("Failed to get dashboard summary", e);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };
    
    // Reset summary when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setSummary(null);
            setLoading(false);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Your Progress Dashboard" maxWidth="max-w-4xl">
            {stats.totalWords === 0 ? (
                <div className="text-center py-10">
                    <p className="text-slate-600">Your dashboard is empty. Start by exploring some words!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Total Words" value={stats.totalWords} icon="fa-book" color="bg-blue-500" />
                        <StatCard title="Mastered" value={stats.masteredWords} icon="fa-check-circle" color="bg-green-500" />
                        <StatCard title="Learning" value={stats.learningWords} icon="fa-pencil-alt" color="bg-yellow-500" />
                        <StatCard title="Study Depth" value={`${stats.depthPercentage}%`} icon="fa-layer-group" color="bg-purple-500" />
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <h3 className="font-semibold text-slate-700 mb-3">AI Coach Summary</h3>
                        {loading && <div className="flex justify-center p-4"><Spinner /></div>}
                        
                        {!loading && summary && (
                             <div className="space-y-3 text-slate-600">
                                 <p><i className="fas fa-star text-yellow-400 mr-2"></i><strong>What you've done well:</strong> {summary.strength}</p>
                                 <p><i className="fas fa-lightbulb text-blue-400 mr-2"></i><strong>A friendly suggestion:</strong> {summary.suggestion}</p>
                                 <p><i className="fas fa-rocket text-red-400 mr-2"></i><strong>Your next adventure:</strong> {summary.motivation}</p>
                             </div>
                        )}

                        {!loading && !summary && (
                            <div className="text-center py-4">
                                <button onClick={getSummary} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                                    <i className="fas fa-magic-wand-sparkles mr-2"></i>Generate AI Coach Summary
                                </button>
                            </div>
                        )}
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-lg">
                           <h3 className="font-semibold text-slate-700 mb-3">Time to Master</h3>
                           {stats.avgTimeToMasteryHours !== null ? (
                               <p className="text-slate-600">On average, it takes you <strong className="text-2xl text-indigo-600">{stats.avgTimeToMasteryHours.toFixed(1)} hours</strong> to master a word.</p>
                           ) : (
                               <p className="text-sm text-slate-500">Master more words to see this stat!</p>
                           )}
                        </div>
                        <div className="p-4 bg-white border border-slate-200 rounded-lg">
                            <h3 className="font-semibold text-slate-700 mb-3">Recent Quiz Accuracy</h3>
                            {stats.accuracyTrend.length > 0 ? (
                                <div className="h-24 flex items-end gap-1">
                                    {stats.accuracyTrend.map((item, index) => (
                                        <div key={index} className="flex-1 bg-blue-200 rounded-t-md hover:bg-blue-400 group" style={{ height: `${item.accuracy}%` }} title={`Accuracy: ${item.accuracy.toFixed(0)}%`}>
                                            <span className="sr-only">{item.accuracy.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Complete some quizzes to see your trend!</p>
                            )}
                        </div>
                     </div>
                </div>
            )}
        </Modal>
    );
};
