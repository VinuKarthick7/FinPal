import React, { useState, useEffect } from 'react';
// Card removed: use styled div instead
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistantChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const user = useAuthStore((state: any) => state.user);
  // Use user to avoid unused variable warning
  console.log(user);

  useEffect(() => {
    // Check if user has consented (for now, assume not; in real app, fetch from API)
    if (!aiConsent) {
      setShowConsentModal(true);
    }
  }, [aiConsent]);

  const handleConsent = async (consent: boolean) => {
    if (consent) {
      try {
        const token = useAuthStore.getState().token;
        const res = await fetch('http://localhost:5000/api/ai-assistant/consent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ consent: true }),
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          setAiConsent(true);
          setShowConsentModal(false);
        } else {
          setError('Failed to enable AI assistant.');
        }
      } catch (e) {
        setError('Network error.');
      }
    } else {
      setShowConsentModal(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!user) {
      setError('Please log in to use the AI assistant.');
      return;
    }
    if (!aiConsent) {
      setError('Please enable AI assistant first.');
      return;
    }
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setLoading(true);
    setError('');
    try {
      const token = useAuthStore.getState().token; // Get token from store
      const res = await fetch('http://localhost:5000/api/ai-assistant/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ question: input }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.insights) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.insights }]);
      } else {
        setError(data.message || 'Something went wrong.');
      }
    } catch (e) {
      setError('Network error.');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl shadow-lg bg-white/90 border border-gray-200 p-6 flex flex-col gap-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">FinPal AI Assistant</h2>
      {showConsentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Enable AI Assistant</h3>
            <p className="text-gray-600 mb-6">
              FinPal AI analyzes anonymized spending summaries. No individual transactions, bank data, or personal identifiers are shared. AI insights are advisory only.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => handleConsent(false)} variant="secondary" className="flex-1">
                Decline
              </Button>
              <Button onClick={() => handleConsent(true)} className="flex-1">
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
        <div className="flex flex-col gap-3 min-h-[180px] max-h-72 overflow-y-auto rounded-xl bg-gray-50 p-4 border border-gray-100">
          {messages.length === 0 && (
            <span className="text-gray-400 text-center">Ask a question about your spending patterns...</span>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded-xl px-4 py-2 max-w-[80%] whitespace-pre-line ${
                msg.role === 'user'
                  ? 'ml-auto bg-blue-100 text-blue-900'
                  : 'mr-auto bg-green-50 text-gray-800 border border-green-200'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && <Skeleton className="h-6 w-2/3 rounded-xl bg-gray-200" />}
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="flex gap-2 mt-2">
          <Input
            className="flex-1 rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-200"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={loading}
            maxLength={200}
          />
          <Button
            className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            Send
          </Button>
        </div>
        <div className="text-xs text-gray-400 mt-2 text-center">
          Insights are advisory only. No personal data is shared with AI.
        </div>
    </div>
  );
};

export default AIAssistantChat;
