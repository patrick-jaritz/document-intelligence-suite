/**
 * PromptForge Guide Component
 * Onboarding and help for new users
 */

import { BookOpen, Sparkles, FileText, Zap, BarChart3, Package, Share2, MessageSquare, X } from 'lucide-react';
import { useState } from 'react';

interface PromptForgeGuideProps {
  onClose?: () => void;
}

export function PromptForgeGuide({ onClose }: PromptForgeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'What is PromptForge?',
      content: (
        <div className="space-y-3">
          <p>
            PromptForge is your complete prompt management system. Create, refine, execute, and share prompts with AI assistance.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold">Key Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Structured prompt building</li>
              <li>Version control and history</li>
              <li>AI-powered refinement</li>
              <li>Execution tracking and analytics</li>
              <li>Public app sharing</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Creating Prompts',
      content: (
        <div className="space-y-3">
          <p>
            Build prompts using the structured format:
          </p>
          <div className="bg-gray-100 p-3 rounded text-sm space-y-1">
            <div><strong>Role:</strong> Define the AI's role</div>
            <div><strong>Task:</strong> What should it do?</div>
            <div><strong>Context:</strong> Background information</div>
            <div><strong>Constraints:</strong> Rules and limitations</div>
            <div><strong>Examples:</strong> Sample inputs/outputs</div>
          </div>
          <p className="text-sm text-gray-600">
            Use placeholders like <code className="bg-gray-200 px-1 rounded">{'{{variable}}'}</code> to create dynamic prompts.
          </p>
        </div>
      ),
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'AI Assistant',
      content: (
        <div className="space-y-3">
          <p>
            Get real-time help refining your prompts with the AI Assistant:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Click "AI Assistant" in the prompt editor</li>
            <li>Ask questions or request improvements</li>
            <li>Apply suggestions directly to your prompt</li>
            <li>Iterate and refine based on feedback</li>
          </ul>
        </div>
      ),
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Executing Prompts',
      content: (
        <div className="space-y-3">
          <p>
            Test your prompts with real LLM execution:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Click "Execute" to test your prompt</li>
            <li>Fill in placeholder values</li>
            <li>Choose your LLM model</li>
            <li>View results and provide feedback</li>
            <li>Track performance over time</li>
          </ul>
        </div>
      ),
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Analytics',
      content: (
        <div className="space-y-3">
          <p>
            Monitor prompt performance:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>View success rates and ratings</li>
            <li>Track token usage and latency</li>
            <li>See model usage distribution</li>
            <li>Identify top-performing prompts</li>
          </ul>
        </div>
      ),
    },
    {
      icon: <Share2 className="w-8 h-8" />,
      title: 'Sharing Prompts',
      content: (
        <div className="space-y-3">
          <p>
            Share prompts as public web apps:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Click "Share" in the prompt editor</li>
            <li>Create a public app with a unique URL</li>
            <li>Use placeholders to generate forms</li>
            <li>Share the URL with anyone</li>
            <li>Track usage and analytics</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">PromptForge Guide</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all ${
                  currentStep === index
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-indigo-600 flex-shrink-0">{step.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    {step.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentStep === index ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Next
              </button>
            ) : (
              onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Got it!
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
