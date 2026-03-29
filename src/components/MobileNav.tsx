import { NavLink as RRNavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Layers, TrendingUp, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Lançamentos', url: '/lancamentos', icon: Receipt },
  { title: 'Consultor', url: '/consultor', icon: Bot },
  { title: 'Categorias', url: '/categorias', icon: Layers },
  { title: 'Projeção', url: '/projecao', icon: TrendingUp },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <RRNavLink
            key={item.title}
            to={item.url}
            end={item.url === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </RRNavLink>
        ))}
      </div>
    </nav>
  );
}
