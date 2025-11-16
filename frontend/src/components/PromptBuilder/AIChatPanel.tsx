/**
 * AI Chat Panel Component
 * Docked panel for AI-assisted prompt refinement
 */

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { StructuredPrompt } from '../../types/prompt';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  prompt: StructuredPrompt;
  onPromptUpdate?: (updatedPrompt: StructuredPrompt) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatPanel({
  prompt,
  onPromptUpdate,
  isOpen,
  onClose,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initialize with welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi! I'm here to help you refine your prompt "${prompt.title}". I can:
- Suggest improvements to clarity and structure
- Help optimize for better LLM responses
- Identify missing context or constraints
- Provide examples and best practices

What would you like to improve?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, prompt.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call AI chat API
      const response = await fetchChatResponse(userMessage.content, prompt, messages);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const applySuggestion = (suggestion: string) => {
    // Parse suggestion and update prompt
    // This is a simplified version - in production, you'd parse structured suggestions
    if (onPromptUpdate) {
      // For now, just update the context or task based on suggestion
      const updated = { ...prompt };
      // Parse and apply suggestion logic here
      onPromptUpdate(updated);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-xs text-gray-600">Prompt refinement</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.role === 'assistant' && message.id !== 'welcome' && (
                <button
                  onClick={() => applySuggestion(message.content)}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Apply suggestion →
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for help refining your prompt..."
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/**
 * Call AI chat API for prompt refinement suggestions
 */
async function fetchChatResponse(
  userMessage: string,
  prompt: StructuredPrompt,
  conversationHistory: Message[]
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();

  // Build context from prompt
  const promptContext = `
Current Prompt:
Title: ${prompt.title}
Role: ${prompt.role}
Task: ${prompt.task}
Context: ${prompt.context}
Constraints: ${prompt.constraints.join(', ')}
Examples: ${prompt.examples.length} examples
`.trim();

  // Build conversation history
  const history = conversationHistory
    .slice(-5) // Last 5 messages for context
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const systemMessage = `You are an expert prompt engineer helping refine prompts for LLM interactions. 
Analyze the current prompt structure and provide constructive suggestions for improvement.
Focus on clarity, specificity, context, constraints, and examples.

${promptContext}

Previous conversation:
${history}

Provide helpful, actionable suggestions. Be concise but thorough.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/execute-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        prompt: `${systemMessage}\n\nUser: ${userMessage}\n\nAssistant:`,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        system_message: 'You are a helpful prompt engineering assistant.',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    return data.response || data.text || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('AI chat error:', error);
    throw error;
  }
}
