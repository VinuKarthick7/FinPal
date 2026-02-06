/**
 * FinMate Chat Page
 * 
 * A dedicated full-page chat interface for FinMate - FinPal's smart financial assistant.
 * FinMate provides personalized financial insights using your real budget and expense data.
 * 
 * Features:
 * - Contextual welcome message based on user's current financial status
 * - Real-time chat with intelligent responses
 * - Quick action buttons for common queries
 * - Beautiful gradient UI with smooth animations
 * - Mobile-responsive design
 */

import React, { useState, useRef, useEffect } from 'react';
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
    Users,
    HelpCircle,
} from 'lucide-react';
import { chatbotApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { FinMateIcon } from '@/components/ui';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

const quickActions = [
    { id: 'budget', label: 'Budget Status', icon: TrendingUp, query: 'What is my budget status?', color: 'from-emerald-100 to-teal-100' },
    { id: 'spending', label: 'Spending Analysis', icon: PiggyBank, query: 'Where did I spend more this month?', color: 'from-purple-100 to-pink-100' },
    { id: 'family', label: 'Family Info', icon: Users, query: 'Show my family info', color: 'from-blue-100 to-indigo-100' },
    { id: 'help', label: 'Help', icon: HelpCircle, query: 'What can you help me with?', color: 'from-amber-100 to-orange-100' },
];

export const FinMatePage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const userName = user?.fullName?.split(' ')[0] || 'User';

    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize chat with context
    useEffect(() => {
        const initializeChat = async () => {
            try {
                const response = await chatbotApi.getContext();
                if (response.success && response.welcomeMessage) {
                    setMessages([
                        {
                            id: 'welcome',
                            text: response.welcomeMessage,
                            sender: 'bot',
                            timestamp: new Date(),
                        },
                    ]);
                }
            } catch (error) {
                console.error('Failed to get chat context:', error);
                setMessages([
                    {
                        id: 'welcome',
                        text: `Hi ${userName}! 👋 I'm **FinMate**, your personal financial assistant.\n\nHow can I help you with your finances today?`,
                        sender: 'bot',
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setIsInitializing(false);
            }
        };

        initializeChat();
    }, [userName]);

    // Send message
    const handleSend = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatbotApi.sendMessage(text);
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.reply || "I'm sorry, I couldn't process that request.",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting. Please try again.",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    // Handle quick action click
    const handleQuickAction = (query: string) => {
        handleSend(query);
    };

    // Handle Enter key
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format message text with markdown-like formatting
    const formatMessage = (text: string) => {
        // Split by newlines and process each line
        const lines = text.split('\n');

        return lines.map((line, lineIndex) => {
            // Bold text
            let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // Handle bullet points
            if (processedLine.startsWith('• ') || processedLine.startsWith('- ')) {
                processedLine = `<span class="inline-block ml-2">${processedLine}</span>`;
            }

            return (
                <span key={lineIndex}>
                    <span dangerouslySetInnerHTML={{ __html: processedLine }} />
                    {lineIndex < lines.length - 1 && <br />}
                </span>
            );
        });
    };

    return (
        <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-cyan-50 via-white to-teal-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-cyan-500 via-cyan-600 to-teal-600 text-white shadow-lg safe-top">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                                <FinMateIcon size={36} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    FinMate
                                    <Sparkles className="w-5 h-5 text-yellow-300" />
                                </h1>
                                <p className="text-cyan-100 text-sm">Your Financial Assistant</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    {isInitializing ? (
                        <div className="flex justify-center py-8">
                            <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-md">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl flex items-center justify-center">
                                        <FinMateIcon size={28} className="animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-gray-600">FinMate is getting ready...</div>
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${message.sender === 'user'
                                            ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                            : 'bg-gradient-to-br from-cyan-100 to-teal-100'
                                            }`}
                                    >
                                        {message.sender === 'user' ? (
                                            <User className="w-5 h-5 text-white" />
                                        ) : (
                                            <FinMateIcon size={28} />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div
                                        className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${message.sender === 'user'
                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-md'
                                            : 'bg-white text-gray-800 rounded-tl-md border border-gray-100'
                                            }`}
                                    >
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {formatMessage(message.text)}
                                        </div>
                                        <div
                                            className={`text-xs mt-2 ${message.sender === 'user' ? 'text-emerald-100' : 'text-gray-400'
                                                }`}
                                        >
                                            {message.timestamp.toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}

                    {/* Loading indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center">
                                <FinMateIcon size={28} />
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-md shadow-sm border border-gray-100">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && !isLoading && (
                <div className="px-4 pb-4">
                    <div className="max-w-4xl mx-auto">
                        <p className="text-sm text-gray-500 mb-3 text-center">Quick Actions</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {quickActions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={() => handleQuickAction(action.query)}
                                    className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all group active:scale-95"
                                >
                                    <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <action.icon className="w-5 h-5 text-gray-700" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white/80 backdrop-blur-xl p-4 pb-6 safe-bottom">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me about your finances..."
                                disabled={isLoading}
                                className="w-full px-5 py-3.5 bg-gray-100 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all disabled:opacity-50"
                            />
                            <MessageCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="p-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-2xl hover:from-cyan-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-200 hover:shadow-xl hover:shadow-cyan-300"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        FinMate helps you manage money better • Always here for you
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinMatePage;
