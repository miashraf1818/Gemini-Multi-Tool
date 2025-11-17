
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { continueChat } from '../services/geminiService';
import { ChatMessage } from '../types';
import Spinner from './Spinner';
import { ChatBubbleLeftRightIcon, SparklesIcon, PaperAirplaneIcon, BoltIcon, CpuChipIcon } from './IconComponents';

type ChatMode = 'fast' | 'pro';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>('fast');
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatHistoryRef.current?.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const modelResponse = await continueChat([...messages, userMessage], mode);
      const modelMessage: ChatMessage = { role: 'model', text: modelResponse };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error(err);
      setMessages(prev => prev.slice(0, -1)); // Remove the user message if API fails
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, mode]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const ModeToggle: React.FC = () => (
    <div className="flex bg-gray-700 rounded-full p-1">
      <button 
        onClick={() => setMode('fast')}
        className={`w-1/2 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${mode === 'fast' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
      >
        <BoltIcon className="w-4 h-4"/>
        Fast
      </button>
      <button 
        onClick={() => setMode('pro')}
        className={`w-1/2 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${mode === 'pro' ? 'bg-purple-600 text-white' : 'text-gray-300'}`}
      >
        <CpuChipIcon className="w-4 h-4"/>
        Pro
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">AI Chat</h2>
          </div>
          <ModeToggle />
      </div>
      
      <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-white" /></div>}
            <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-gray-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"><Spinner/></div>
            <div className="max-w-xl p-3 rounded-2xl bg-gray-700 text-gray-400 rounded-bl-none italic">
              Gemini is thinking...
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700">
        {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={mode === 'fast' ? "Ask a quick question..." : "Ask a complex question..."}
            className="w-full bg-gray-700 text-gray-200 rounded-lg p-3 pr-12 resize-none border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={1}
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
