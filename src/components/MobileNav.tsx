import { NavLink as RRNavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Bot, Layers, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { title: 'Início', url: '/', icon: LayoutDashboard },
  { title: 'Lançamentos', url: '/lancamentos', icon: Receipt },
  { title: 'Consultor', url: '/consultor', icon: Bot },
  { title: 'Categorias', url: '/categorias', icon: Layers },
  { title: 'Projeção', url: '/projecao', icon: TrendingUp },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => (
          <RRNavLink
            key={item.title}
            to={item.url}
            end={item.url === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all min-w-[52px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:scale-95'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isActive ? 'bg-primary/10' : ''
                )}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <span>{item.title}</span>
              </>
            )}
          </RRNavLink>
        ))}
      </div>
    </nav>
  );
}
