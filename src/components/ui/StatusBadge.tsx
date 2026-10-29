import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment' | 'invoice' | 'stock' | 'dispatch' | 'purchase';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order' }) => {
  const normalized = status.toLowerCase().replace(/_/g, ' ');

  // Refined, accessible status styling: subtle tint, crisp text, no oversized candy pill
  const getStyle = () => {
    switch (normalized) {
      case 'paid':
      case 'delivered':
      case 'received':
      case 'active':
      case 'in stock':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'partially paid':
      case 'partially dispatched':
      case 'partially received':
      case 'confirmed':
      case 'in transit':
      case 'low stock':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'overdue':
      case 'cancelled':
      case 'out of stock':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'draft':
      case 'packed':
      case 'ordered':
      case 'issued':
      case 'unpaid':
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded whitespace-nowrap ${getStyle()}`}
    >
      <span className="capitalize">{normalized}</span>
    </span>
  );
};
