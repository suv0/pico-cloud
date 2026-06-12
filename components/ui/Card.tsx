import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: boolean;
};

export function Card({ children, className = '', padding = true, ...rest }: CardProps) {
  return (
    <div
      className={[
        'bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card',
        padding ? 'p-container-padding' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-container-padding py-ui-md border-b border-outline-variant ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-container-padding ${className}`}>{children}</div>;
}
