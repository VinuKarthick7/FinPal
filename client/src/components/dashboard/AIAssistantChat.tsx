import React from 'react';

/**
 * AI Assistant has been removed.
 * This component intentionally displays a short notice and no longer
 * communicates with server AI endpoints or handles consent.
 */
const AIAssistantChat: React.FC = () => {
  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl shadow-lg bg-white/90 border border-gray-200 p-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">FinPal AI Assistant (Disabled)</h2>
      <p className="text-gray-600">The AI assistant feature has been removed from this deployment. If you need it restored, contact your administrator.</p>
    </div>
  );
};

export default AIAssistantChat;
