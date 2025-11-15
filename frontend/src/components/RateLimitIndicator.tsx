import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface RateLimitIndicatorProps {
  current: number;
  limit: number;
  resetTime?: Date;
  service?: string;
}

export function RateLimitIndicator({ 
  current, 
  limit, 
  resetTime,
  service = 'API'
}: RateLimitIndicatorProps) {
  const percentage = (current / limit) * 100;
  const remaining = limit - current;
  
  // Determine status based on usage
  const status = percentage >= 90 ? 'critical' : percentage >= 70 ? 'warning' : 'ok';
  
  const statusConfig = {
    critical: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      barColor: 'bg-red-500',
      message: 'Rate limit almost reached!'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      barColor: 'bg-yellow-500',
      message: 'Approaching rate limit'
    },
    ok: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      barColor: 'bg-green-500',
      message: 'Rate limit healthy'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const formatResetTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">
              {service} Rate Limit
            </h4>
            <span className={`text-sm font-medium ${config.color}`}>
              {remaining} remaining
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {config.message}
          </p>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${config.barColor} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-600">
              <span>{current} / {limit} requests</span>
              <span>{Math.round(percentage)}%</span>
            </div>
          </div>

          {/* Reset time */}
          {resetTime && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              <span>Resets in {formatResetTime(resetTime)}</span>
            </div>
          )}

          {/* Warning messages */}
          {status === 'critical' && (
            <p className="mt-2 text-xs text-red-700 font-medium">
              ⚠️ Consider reducing request frequency or wait for reset
            </p>
          )}
          {status === 'warning' && (
            <p className="mt-2 text-xs text-yellow-700">
              💡 You're using your quota quickly. Monitor your usage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface RateLimitBadgeProps {
  current: number;
  limit: number;
  className?: string;
}

export function RateLimitBadge({ current, limit, className = '' }: RateLimitBadgeProps) {
  const percentage = (current / limit) * 100;
  const status = percentage >= 90 ? 'critical' : percentage >= 70 ? 'warning' : 'ok';
  
  const colors = {
    critical: 'bg-red-100 text-red-700 border-red-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    ok: 'bg-green-100 text-green-700 border-green-300'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${colors[status]} ${className}`}>
      {status === 'critical' && '🔴'}
      {status === 'warning' && '🟡'}
      {status === 'ok' && '🟢'}
      {limit - current} / {limit}
    </span>
  );
}

export function RateLimitWarning({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 mb-1">
            Rate Limit Exceeded
          </h3>
          <p className="text-sm text-red-700">
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 ml-3"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
