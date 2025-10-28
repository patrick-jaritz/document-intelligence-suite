import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import { SourceViewer } from './SourceViewer';
import { supabaseUrl } from '../lib/supabase';

interface ChatInterfaceProps {
  provider: 'openai' | 'anthropic' | 'mistral' | 'gemini';
  docId: string;
  documentName: string;
}

interface Message {
  id: string;
  question: string;
  answer: string;
  sources?: Array<{
    text: string;
    metadata: any;
    similarity: number;
  }>;
  timestamp: Date;
}

export function ChatInterface({ provider, docId, documentName }: ChatInterfaceProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedProvider, setSelectedProvider] = useState(provider);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const currentQuestion = question.trim();
    setQuestion('');
    setLoading(true);
    setError('');

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      question: currentQuestion,
      answer: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Prepare request payload
      const requestPayload = {
        question: currentQuestion,
        documentId: docId,  // Use the documentId for filtering
        filename: documentName,
        model: selectedProvider === 'openai' ? 'gpt-4o-mini' : 
               selectedProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
               selectedProvider === 'mistral' ? 'mistral-small-latest' : 'gemini-1.5-flash',
        provider: selectedProvider,
      };

      // Always log the RAG query for debugging (showing ACTUAL payload)
      console.log('🔍 RAG Query Request (actual payload):', requestPayload);

      // Call Supabase Edge Function for RAG query
      const response = await fetch(`${supabaseUrl}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('📡 RAG Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ RAG Error Response:', errorText);
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      console.log('✅ RAG Response Data:', {
        answer: data.answer?.substring(0, 100) + '...',
        sources: data.sources?.length || 0,
        retrievedChunks: data.retrievedChunks,
        debug: data.debug  // Show debug info if present
      });
      
      // Update the message with the answer
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, answer: data.answer, sources: data.source_chunks || [] }
          : msg
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to process question');
      // Remove the user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Chat with Document</h3>
            <p className="text-sm text-gray-500">{documentName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
            <option value="mistral">Mistral (Small)</option>
            <option value="gemini">Google Gemini (1.5 Flash)</option>
          </select>
          
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">Ask questions about your document to get AI-powered answers with source citations.</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            {/* User Question */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
                <p className="text-sm">{message.question}</p>
              </div>
            </div>

            {/* AI Answer */}
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-gray-100 rounded-lg px-4 py-2">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.answer}</p>
                
                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Sources:</p>
                    <SourceViewer sources={message.sources} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the document..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send • Using {selectedProvider} for answers
        </p>
      </div>
    </div>
  );
}
