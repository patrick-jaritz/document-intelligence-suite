/**
 * Info Panel Component
 * Collapsible panel with helpful information
 */

import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface InfoPanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'info' | 'warning' | 'success';
  className?: string;
}

export function InfoPanel({
  title,
  children,
  defaultOpen = false,
  variant = 'info',
  className = '',
}: InfoPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    success: 'bg-green-50 border-green-200 text-green-900',
  };

  return (
    <div className={`border rounded-lg ${variantClasses[variant]} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          <span className="font-semibold">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-current border-opacity-20">
          <div className="text-sm space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}
