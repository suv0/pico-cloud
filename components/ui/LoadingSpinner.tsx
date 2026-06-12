import { Icon } from '@/components/ui/Icon';

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-24 ${className}`}>
      <Icon name="spinner" size={32} className="animate-spin text-primary" />
    </div>
  );
}
