
import { Card, CardContent } from './Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatWidgetProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  subtitle?: string;
}

export function StatWidget({ title, value, trend, icon, subtitle }: StatWidgetProps) {
  const isPositive = trend && trend > 0;
  
  return (
    <Card className="hover:border-brand-500/30 transition-colors duration-300">
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-xl bg-hover flex items-center justify-center text-brand-600 dark:text-brand-400 border border-border-subtle">
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        
        <div>
          <h4 className="text-text-muted text-sm font-medium mb-1">{title}</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-main tracking-tight">{value}</span>
            {subtitle && <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">{subtitle}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
