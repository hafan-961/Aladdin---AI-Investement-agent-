// ============================================
// Alladin – Chat Sidebar (Google-style clean)
// ============================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSidebarProps {
  reportContext?: string;
}

export function ChatSidebar({ reportContext }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId, context: reportContext?.slice(0, 2000) }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.sessionId) setSessionId(data.sessionId);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        id="chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043]'
            : 'bg-[#1a73e8] hover:bg-[#1765cc] dark:bg-[#8ab4f8] dark:hover:bg-[#aecbfa] hover:shadow-xl'
        }`}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-[#5f6368] dark:text-[#bdc1c6]" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white dark:text-[#202124]" />
        )}
      </button>

      {/* Slide-out Panel */}
      <div className={`fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] transition-all duration-200 ${
        isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <div className="rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden flex flex-col h-[480px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#eeeeee] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#1e1e1e]">
            <p className="font-semibold text-sm text-[#202124] dark:text-[#f1f3f4]">Ask Aladdin</p>
            <p className="text-[11px] text-[#9aa0a6] dark:text-[#80868b]">Follow-up questions about the analysis</p>
          </div>

          {/* Messages container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ffffff] dark:bg-[#121212]">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[#9aa0a6] dark:text-[#80868b] text-sm mb-4">Ask a question about the report</p>
                {['Is this safe for defensive investors?', 'What are the key risks?', 'Should I wait for a dip?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="block w-full text-left text-xs text-[#5f6368] dark:text-[#bdc1c6] px-3 py-2 rounded-lg border border-[#eeeeee] dark:border-[#3c4043] bg-white dark:bg-[#1e1e1e] hover:bg-[#f8f9fa] dark:hover:bg-[#303134] transition-colors mb-2"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#1a73e8] dark:bg-[#8ab4f8] text-white dark:text-[#202124] rounded-br-md'
                    : 'bg-[#f1f3f4] dark:bg-[#303134] text-[#202124] dark:text-[#f1f3f4] rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#f1f3f4] dark:bg-[#303134] px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-2 h-2 rounded-full bg-[#9aa0a6] dark:bg-[#80868b]" style={{ animation: `pulse-dot 1.2s ease-in-out ${d}ms infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input field */}
          <div className="p-3 border-t border-[#eeeeee] dark:border-[#3c4043] bg-white dark:bg-[#1e1e1e]">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up..."
                className="flex-1 h-9 px-3 text-[13px] bg-[#f1f3f4] dark:bg-[#303134] rounded-full outline-none focus:bg-[#e8eaed] dark:focus:bg-[#3c4043] transition-colors text-[#202124] dark:text-[#f1f3f4] placeholder:text-[#9aa0a6] dark:placeholder:text-[#80868b]"
                style={{ outline: 'none', boxShadow: 'none' }}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-9 w-9">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
