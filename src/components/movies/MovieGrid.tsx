import { ReactNode } from 'react';

interface MovieGridProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MovieGrid({ children, title, subtitle }: MovieGridProps) {
  return (
    <section className="space-y-4 px-4">
      {(title || subtitle) && (
        <div>
          {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {children}
      </div>
    </section>
  );
}
