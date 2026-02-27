/**
 * FinMate Chat Page — Advanced Generative RAG Chatbot Interface
 *
 * Features:
 * - Full conversation history passed to every API call
 * - Rich message rendering with markdown support
 * - Mode indicator (RAG vs fallback) for transparency (dev only)
 * - Quick action chips that update dynamically
 * - Typing indicator with animated dots
 * - New Chat button that clears history properly
 * - Premium fintech design with glassmorphism and smooth animations
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Send,
    User,
    Sparkles,
    MessageCircle,
    TrendingUp,
    PiggyBank,
    Target,
    BarChart2,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { chatbotApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { FinMateIcon } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    mode?: 'rag' | 'fallback' | 'welcome';
    isError?: boolean;
}

type ConversationHistoryItem = {
    role: 'user' | 'assistant';
    content: string;
};

// ─── Quick Action definitions ─────────────────────────────────────────────────

const quickActions = [
    {
        id: 'budget',
        label: 'Budget Status',
        icon: TrendingUp,
        query: 'What is my current budget status for this month? Am I on track?',
    },
    {
        id: 'spending',
        label: 'Spending Analysis',
        icon: BarChart2,
        query: 'Give me a detailed breakdown of where I am spending the most money this month by category and merchant.',
    },
    {
        id: 'savings',
        label: 'Savings Tips',
        icon: PiggyBank,
        query: 'Analyze my savings rate this month compared to last month and suggest specific ways to improve it based on my spending patterns.',
    },
    {
        id: 'trends',
        label: 'Monthly Trends',
        icon: Target,
        query: 'How does my spending this month compare to last month? What categories changed the most?',
    },
];

// ─── Message formatter ────────────────────────────────────────────────────────

const formatMessage = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
        // Bold: **text**
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        const renderedLine = boldParts.map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
        );

        return (
            <span key={lineIdx}>
                {renderedLine}
                {lineIdx < lines.length - 1 && <br />}
            </span>
        );
    });
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const FinMatePage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const userName = user?.fullName?.split(' ')[0] || 'User';

    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHistory, setChatHistory] = useState<ConversationHistoryItem[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);



    // ── Initialise chat ──────────────────────────────────────────────────────
    const initializeChat = useCallback(async () => {
        setIsInitializing(true);
        setMessages([]);
        setChatHistory([]);

        try {
            const response = await chatbotApi.getContext();
            if (response.success && response.welcomeMessage) {
                const welcomeMsg: Message = {
                    id: 'welcome-' + Date.now(),
                    text: response.welcomeMessage,
                    sender: 'bot',
                    timestamp: new Date(),
                    mode: 'welcome',
                };
                setMessages([welcomeMsg]);
                setChatHistory([{ role: 'assistant', content: response.welcomeMessage }]);
            }
        } catch (err) {
            console.error('[FinMate] Failed to initialise chat:', err);
            const fallbackMsg: Message = {
                id: 'welcome-fallback',
                text: `Hi ${userName}! 👋 I'm **FinMate**, your personal financial assistant.\n\nHow can I help you with your finances today?`,
                sender: 'bot',
                timestamp: new Date(),
                mode: 'welcome',
            };
            setMessages([fallbackMsg]);
            setChatHistory([{ role: 'assistant', content: fallbackMsg.text }]);
        } finally {
            setIsInitializing(false);
        }
    }, [userName]);

    useEffect(() => {
        initializeChat();
    }, [initializeChat]);

    // ── New chat session ──────────────────────────────────────────────────────
    const handleNewChat = async () => {
        try { await chatbotApi.clearHistory(); } catch (_) { }
        await initializeChat();
    };

    // ── Send a message ────────────────────────────────────────────────────────
    const handleSend = async (messageText?: string) => {
        const text = (messageText || input).trim();
        if (!text || isLoading) return;

        const userMsg: Message = {
            id: 'user-' + Date.now(),
            text,
            sender: 'user',
            timestamp: new Date(),
        };

        const updatedHistory: ConversationHistoryItem[] = [
            ...chatHistory,
            { role: 'user', content: text },
        ];

        setMessages((prev) => [...prev, userMsg]);
        setChatHistory(updatedHistory);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatbotApi.sendMessage(text, updatedHistory.slice(-12));

            const replyText = response.reply || "I'm sorry, I couldn't process that. Please try again.";

            const botMsg: Message = {
                id: 'bot-' + (Date.now() + 1),
                text: replyText,
                sender: 'bot',
                timestamp: new Date(),
                mode: response.mode as 'rag' | 'fallback',
            };

            setMessages((prev) => [...prev, botMsg]);
            setChatHistory((prev) => [...prev, { role: 'assistant', content: replyText }]);
        } catch (err) {
            console.error('[FinMate] Send error:', err);
            const errMsg: Message = {
                id: 'err-' + Date.now(),
                text: "Sorry, I'm having trouble connecting right now. Please check your connection and try again.",
                sender: 'bot',
                timestamp: new Date(),
                isError: true,
            };
            setMessages((prev) => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen min-h-[100dvh] flex flex-col" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f0f9ff 100%)' }}>

            {/* ── Header ── */}
            <header style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #0f766e 100%)' }} className="text-white shadow-xl safe-top">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 hover:bg-white/15 rounded-xl transition-all active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                                    <FinMateIcon size={34} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold flex items-center gap-2">
                                        FinMate
                                        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                                    </h1>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        <p className="text-cyan-100 text-xs font-medium">AI Financial Advisor • Online</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* New Chat Button */}
                        <button
                            onClick={handleNewChat}
                            disabled={isLoading || isInitializing}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl transition-all text-xs font-medium active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>New Chat</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Messages Container ── */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
                <div className="max-w-3xl mx-auto space-y-5">

                    {/* Initializing state */}
                    {isInitializing && (
                        <div className="flex justify-center py-10">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-3 bg-white rounded-2xl px-6 py-5 shadow-lg border border-gray-100"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center">
                                    <FinMateIcon size={28} className="animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">FinMate is analysing your data…</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Retrieving your financial context</p>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Messages */}
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className={`flex items-end gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${message.sender === 'user'
                                            ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                            : message.isError
                                                ? 'bg-gradient-to-br from-red-100 to-rose-100'
                                                : 'bg-gradient-to-br from-cyan-100 to-teal-100'
                                        }`}
                                >
                                    {message.sender === 'user' ? (
                                        <User className="w-4 h-4 text-white" />
                                    ) : message.isError ? (
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                    ) : (
                                        <FinMateIcon size={26} />
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[82%] ${message.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                    <div
                                        className={`px-4 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${message.sender === 'user'
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md'
                                                : message.isError
                                                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                                            }`}
                                        style={message.sender === 'bot' && !message.isError ? { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } : undefined}
                                    >
                                        {formatMessage(message.text)}
                                    </div>

                                    <div className={`flex items-center gap-2 px-1 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-[10px] text-gray-400">
                                            {message.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                        {message.mode === 'rag' && (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                                                RAG AI
                                            </span>
                                        )}
                                        {message.mode === 'fallback' && (
                                            <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                                                Offline
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    <AnimatePresence>
                        {isLoading && (
                            <motion.div
                                key="typing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="flex items-end gap-3"
                            >
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center shadow-sm">
                                    <FinMateIcon size={26} />
                                </div>
                                <div className="bg-white px-4 py-3.5 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                                    <div className="flex gap-1.5 items-center">
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
                                        <span className="text-xs text-gray-400 ml-1">Analysing your data…</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ── Quick Actions (always visible) ── */}
            <div className="px-4 pb-2">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex flex-wrap justify-center gap-2">
                                {quickActions.map((action) => (
                                    <motion.button
                                        key={action.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSend(action.query)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50 shadow-sm hover:shadow transition-all text-left group"
                                    >
                                        <action.icon className={`w-4 h-4 text-cyan-600 flex-shrink-0`} />
                                        <span className="text-xs font-medium text-gray-700 group-hover:text-cyan-700 whitespace-nowrap">{action.label}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
            </div>

            {/* ── Input Area ── */}
            <div className="border-t border-gray-100 bg-white/90 backdrop-blur-xl p-4 pb-6 safe-bottom" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.04)' }}>
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-2.5">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about your budget, spending, savings…"
                                disabled={isLoading || isInitializing}
                                className="w-full px-4 py-3.5 pr-12 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 transition-all"
                                style={{ background: '#f1f5f9', border: '1.5px solid transparent' }}
                                onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#22d3ee'; }}
                                onBlur={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.borderColor = 'transparent'; }}
                            />
                            <MessageCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading || isInitializing}
                            className="p-3.5 rounded-2xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)', boxShadow: '0 4px 15px rgba(6,182,212,0.35)' }}
                        >
                            <Send className="w-5 h-5" />
                        </motion.button>
                    </div>

                    <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        FinMate uses your real FinPal data to give you accurate, personalised advice
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinMatePage;
