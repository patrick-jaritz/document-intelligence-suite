import { useState } from 'react';
import { AlertCircle, X, RefreshCw, FileText, Settings, BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorAction {
  label: string;
  action: () => void;
  type: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}

interface UserFriendlyErrorProps {
  error: string;
  context?: {
    fileSize?: number;
    fileName?: string;
    provider?: string;
    template?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function UserFriendlyError({ 
  error, 
  context, 
  onRetry, 
  onDismiss, 
  className = '' 
}: UserFriendlyErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showSolutions, setShowSolutions] = useState(true);

  // Extract error code and reason from error message
  const parseError = (errorMessage: string) => {
    // Try to extract structured error patterns
    // Pattern 1: "provider error: message" or "provider processing error: message"
    const providerMatch = errorMessage.match(/^([\w.-]+)(?:\s+processing)?\s+error:\s+(.+)$/i);
    if (providerMatch) {
      return {
        code: providerMatch[1].toUpperCase().replace(/[.-]/g, '_'),
        reason: providerMatch[2]
      };
    }

    // Pattern 2: "ERROR_CODE: message"
    const codeMatch = errorMessage.match(/^([A-Z_]+):\s+(.+)$/);
    if (codeMatch) {
      return {
        code: codeMatch[1],
        reason: codeMatch[2]
      };
    }

    // Pattern 3: Extract from HTTP errors "HTTP 500: message"
    const httpMatch = errorMessage.match(/HTTP\s+(\d+):\s+(.+)/i);
    if (httpMatch) {
      return {
        code: `HTTP_${httpMatch[1]}`,
        reason: httpMatch[2]
      };
    }

    // No structured error found
    return {
      code: 'UNKNOWN_ERROR',
      reason: errorMessage
    };
  };

  const { code, reason } = parseError(error);

  // Parse error message to determine type and provide appropriate solutions
  const getErrorInfo = (errorMessage: string, errorCode: string) => {
    const message = errorMessage.toLowerCase();

    // Page limit errors (OCR.space specific)
    if (message.includes('maximum page limit') || message.includes('page limit') || errorCode === 'OCR_SPACE') {
      return {
        type: 'page_limit',
        title: 'Page Limit Exceeded',
        description: 'The OCR provider has a maximum page limit. Your document exceeds this limit.',
        errorCode: errorCode,
        errorReason: reason,
        solutions: [
          {
            title: 'Use Google Vision (Recommended)',
            description: 'Google Vision supports unlimited pages with better accuracy.',
            action: () => {
              console.log('Switch to Google Vision');
            },
            type: 'primary' as const,
            icon: <Settings className="w-4 h-4" />
          },
          {
            title: 'Use Tesseract (Free, Client-side)',
            description: 'Tesseract processes documents locally in your browser with no page limits.',
            action: () => {
              console.log('Switch to Tesseract');
            },
            type: 'secondary' as const,
            icon: <Settings className="w-4 h-4" />
          },
          {
            title: 'Split your document',
            description: 'Process the first few pages separately, then process the rest.',
            action: () => {
              window.open('https://smallpdf.com/split-pdf', '_blank');
            },
            type: 'secondary' as const,
            icon: <FileText className="w-4 h-4" />
          }
        ],
        learnMore: {
          title: 'Why do page limits exist?',
          content: 'OCR.space free tier limits processing to 3 pages per document. Other providers like Google Vision, OpenAI Vision, and Tesseract have no such limits.'
        }
      };
    }

    // File size errors
    if (message.includes('file size') || message.includes('too large') || message.includes('exceeds')) {
      return {
        type: 'file_size',
        title: 'File is too large',
        description: 'Your file exceeds the size limit for the selected provider.',
        errorCode: errorCode,
        errorReason: reason,
        solutions: [
          {
            title: 'Use a different OCR provider',
            description: 'Switch to Google Vision, AWS Textract, or Azure Document Intelligence which support larger files.',
            action: () => {
              // This would trigger a provider switch in the parent component
              console.log('Switch provider');
            },
            type: 'primary' as const,
            icon: <Settings className="w-4 h-4" />
          },
          {
            title: 'Compress your file',
            description: 'Reduce the file size by compressing the PDF or reducing image quality.',
            action: () => {
              window.open('https://smallpdf.com/compress-pdf', '_blank');
            },
            type: 'secondary' as const,
            icon: <FileText className="w-4 h-4" />
          },
          {
            title: 'Split into smaller files',
            description: 'Break your document into smaller parts and process them separately.',
            action: () => {
              window.open('https://smallpdf.com/split-pdf', '_blank');
            },
            type: 'secondary' as const,
            icon: <FileText className="w-4 h-4" />
          }
        ],
        learnMore: {
          title: 'Why do file size limits exist?',
          content: 'Different OCR providers have different limits based on their pricing tiers and processing capabilities. Free tiers typically have smaller limits to manage costs and server resources.'
        }
      };
    }

    // API key errors
    if (message.includes('api key') || message.includes('authentication') || message.includes('unauthorized')) {
      return {
        type: 'api_key',
        title: 'API Configuration Issue',
        description: 'There\'s a problem with the API configuration for the selected provider.',
        errorCode: errorCode,
        errorReason: reason,
        solutions: [
          {
            title: 'Contact your administrator',
            description: 'Ask your admin to configure the API keys for the OCR providers.',
            action: () => {
              // This would open a contact form or email
              console.log('Contact admin');
            },
            type: 'primary' as const,
            icon: <Settings className="w-4 h-4" />
          },
          {
            title: 'Try a different provider',
            description: 'Switch to a provider that\'s already configured and working.',
            action: () => {
              console.log('Switch provider');
            },
            type: 'secondary' as const,
            icon: <Settings className="w-4 h-4" />
          }
        ],
        learnMore: {
          title: 'How are API keys configured?',
          content: 'API keys are configured by administrators in the system settings. They provide access to external OCR and AI services.'
        }
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return {
        type: 'network',
        title: 'Connection Problem',
        description: 'There was a problem connecting to the processing service.',
        errorCode: errorCode,
        errorReason: reason,
        solutions: [
          {
            title: 'Check your internet connection',
            description: 'Make sure you have a stable internet connection and try again.',
            action: onRetry,
            type: 'primary' as const,
            icon: <RefreshCw className="w-4 h-4" />
          },
          {
            title: 'Try again in a few minutes',
            description: 'The service might be temporarily unavailable.',
            action: onRetry,
            type: 'secondary' as const,
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        learnMore: {
          title: 'What causes connection issues?',
          content: 'Connection issues can be caused by network problems, server maintenance, or high traffic. Most issues resolve themselves within a few minutes.'
        }
      };
    }

    // Processing errors
    if (message.includes('processing') || message.includes('failed') || message.includes('error')) {
      return {
        type: 'processing',
        title: 'Processing Failed',
        description: 'The document could not be processed successfully.',
        errorCode: errorCode,
        errorReason: reason,
        solutions: [
          {
            title: 'Try a different OCR provider',
            description: 'Some providers work better with certain document types.',
            action: () => {
              console.log('Switch provider');
            },
            type: 'primary' as const,
            icon: <Settings className="w-4 h-4" />
          },
          {
            title: 'Check document quality',
            description: 'Make sure your document is clear and readable.',
            action: () => {
              console.log('Show quality tips');
            },
            type: 'secondary' as const,
            icon: <FileText className="w-4 h-4" />
          },
          {
            title: 'Try again',
            description: 'Sometimes processing fails due to temporary issues.',
            action: onRetry,
            type: 'secondary' as const,
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        learnMore: {
          title: 'What makes a document easy to process?',
          content: 'Clear text, good contrast, proper orientation, and minimal noise or artifacts help OCR engines work more accurately.'
        }
      };
    }

    // Default error
    return {
      type: 'unknown',
      title: 'Something went wrong',
      description: 'An unexpected error occurred while processing your document.',
      errorCode: errorCode,
      errorReason: reason,
      solutions: [
        {
          title: 'Try again',
          description: 'The issue might be temporary.',
          action: onRetry,
          type: 'primary' as const,
          icon: <RefreshCw className="w-4 h-4" />
        },
        {
          title: 'Get help',
          description: 'Contact support if the problem persists.',
          action: () => {
            window.open('/help', '_blank');
          },
          type: 'secondary' as const,
          icon: <BookOpen className="w-4 h-4" />
        }
      ],
      learnMore: {
        title: 'Need more help?',
        content: 'Check our help documentation or contact support for assistance with persistent issues.'
      }
    };
  };

  const errorInfo = getErrorInfo(reason, code);

  const getActionButtonClass = (type: string) => {
    switch (type) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700';
    }
  };

  return (
    <div className={`bg-red-50 border-2 border-red-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                {errorInfo.title}
              </h3>
              <p className="text-sm text-red-700 mb-4">
                {errorInfo.description}
              </p>

              {/* Error Code and Reason */}
              {(errorInfo.errorCode || errorInfo.errorReason) && (
                <div className="bg-red-200 rounded-lg p-3 mb-4 border border-red-300">
                  {errorInfo.errorCode && errorInfo.errorCode !== 'UNKNOWN_ERROR' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-red-900 bg-red-300 px-2 py-1 rounded">
                        {errorInfo.errorCode}
                      </span>
                    </div>
                  )}
                  {errorInfo.errorReason && (
                    <p className="text-sm text-red-800 font-medium">
                      <strong>Reason:</strong> {errorInfo.errorReason}
                    </p>
                  )}
                </div>
              )}
              
              {/* Context information */}
              {context && (
                <div className="bg-red-100 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-red-800 mb-2">Details:</p>
                  <div className="space-y-1 text-xs text-red-700">
                    {context.fileName && (
                      <p><strong>File:</strong> {context.fileName}</p>
                    )}
                    {context.fileSize && (
                      <p><strong>Size:</strong> {(context.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    )}
                    {context.provider && (
                      <p><strong>Provider:</strong> {context.provider}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-400 hover:text-red-600 transition-colors"
                title="Dismiss error"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Solutions */}
          {showSolutions && errorInfo.solutions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-red-800 mb-3">
                What you can do:
              </h4>
              <div className="space-y-2">
                {errorInfo.solutions.map((solution, index) => (
                  <button
                    key={index}
                    onClick={solution.action}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${getActionButtonClass(solution.type)}`}
                  >
                    <div className="flex items-center gap-3">
                      {solution.icon}
                      <div>
                        <p className="font-medium text-sm">{solution.title}</p>
                        <p className="text-xs opacity-90">{solution.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Learn more section */}
          {errorInfo.learnMore && (
            <div className="border-t border-red-200 pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-red-700 hover:text-red-800 transition-colors"
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {errorInfo.learnMore.title}
              </button>
              
              {showDetails && (
                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                  <p className="text-sm text-red-800">
                    {errorInfo.learnMore.content}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-red-200">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
            
            <button
              onClick={() => window.open('https://github.com/patrick-jaritz/minimal-rag/issues', '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <BookOpen className="w-4 h-4" />
              Get Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

