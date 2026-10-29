import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
      <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-400 mb-3 shadow-xs">
        <Icon className="w-6 h-6 text-slate-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
