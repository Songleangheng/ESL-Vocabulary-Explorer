
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { GoogleGenAI, Chat } from '@google/genai';
import { fetchChatSuggestions } from '../../services/geminiService';
import { VISAKHA_CHAT_PROMPT } from '../../constants';
import type { TermData } from '../../types';
import { CopyToClipboardButton } from '../ui/CopyToClipboardButton';

interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
    contextTerms: TermData[];
    level: string;
    userApiKey: string | null;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface StoredChat {
    timestamp: number;
    messages: Message[];
}

const API_KEY = process.env.API_KEY;
const CHAT_HISTORY_KEY = 'visakhaChatHistory';
const HISTORY_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ isOpen, onClose, contextTerms, level, userApiKey }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const chatInstance = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            try {
                const key = userApiKey || API_KEY;
                if (!key) throw new Error("API key not found");
                
                const ai = new GoogleGenAI({ apiKey: key });
                const systemInstruction = VISAKHA_CHAT_PROMPT.replace('{LEVEL}', level);

                chatInstance.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction: systemInstruction },
                });

                // Load history or start new chat
                const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
                let initialMessages: Message[] = [];

                if (savedHistory) {
                    const parsed: StoredChat = JSON.parse(savedHistory);
                    if (Date.now() - parsed.timestamp < HISTORY_DURATION) {
                        initialMessages = parsed.messages;
                    }
                }
                
                if (initialMessages.length > 0) {
                     setMessages(initialMessages);
                } else {
                    const greeting = "ជម្រាបសួរ​ ខ្ញុំ​ឈ្មោះ​វិសាខា​ 🇰🇭 Hello! I'm Visakha. How can I help you with your vocabulary today? 🤔 (Just a heads-up, our chat history will be saved for 7 days.)";
                    setMessages([{ role: 'model', text: greeting }]);
                    
                    const fetchSuggestions = async () => {
                        const suggs = await fetchChatSuggestions(contextTerms, level, userApiKey);
                        setSuggestions(suggs);
                    };
                    fetchSuggestions();
                }


            } catch(error) {
                console.error("Failed to initialize chatbot:", error);
                setMessages([{ role: 'model', text: "Sorry, I'm having trouble connecting right now. Please check your API key or try again later." }]);
            }
        } else {
            // Reset state on close
            if (messages.length > 1) { // Don't save if it's just the initial greeting
                 const chatToStore: StoredChat = {
                    timestamp: Date.now(),
                    messages: messages,
                };
                localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatToStore));
            }
            setMessages([]);
            setSuggestions([]);
            setInput('');
            setIsLoading(false);
            chatInstance.current = null;
        }
    }, [isOpen, contextTerms, level, userApiKey]);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (messageText: string) => {
        const text = messageText.trim();
        if (!text || isLoading || !chatInstance.current) return;
        
        setSuggestions([]);
        setInput('');
        const newMessages: Message[] = [...messages, { role: 'user', text }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response = await chatInstance.current.sendMessage({ message: text });
            const modelResponse = response.text;
            setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);
        } catch (error: any) {
            console.error("Chatbot error:", error);
            const errorMessage = "I'm sorry, I encountered an error. Could you please try asking that a different way?";
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderMessageText = (text: string) => {
        const formatted = text
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, "<br />");
        return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Chat with Visakha" maxWidth="max-w-lg">
            <div className="flex flex-col h-[70vh]">
                <div className="flex-grow overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">V</div>}
                            <div className={`relative group max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-lg' : 'bg-slate-100 text-slate-800 rounded-bl-lg'}`}>
                                <div className="leading-relaxed">{renderMessageText(msg.text)}</div>
                                <CopyToClipboardButton
                                    textToCopy={() => msg.text}
                                    iconOnly
                                    className={`absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow text-xs ${msg.role === 'user' ? 'text-indigo-500' : 'text-slate-500'}`}
                                    title="Copy message"
                                />
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex gap-3 justify-start">
                             <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">V</div>
                             <div className="px-4 py-3 bg-slate-100 rounded-2xl rounded-bl-lg"><Spinner size="sm" /></div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="mt-4 flex-shrink-0">
                    {suggestions.length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs text-slate-500 mb-1 text-center">Or try a suggestion:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {suggestions.map((s, i) => (
                                    <button key={i} onClick={() => handleSend(s)} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full hover:bg-slate-200 transition-colors">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Visakha anything..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="bg-indigo-600 text-white rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                           <i className="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        </Modal>
    );
};
