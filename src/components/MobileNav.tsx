import { NavLink as RRNavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Layers, TrendingUp, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Lançamentos', url: '/lancamentos', icon: Receipt },
  { title: 'Categorias', url: '/categorias', icon: Layers },
  { title: 'Projeção', url: '/projecao', icon: TrendingUp },
  { title: 'Importar', url: '/importar', icon: Upload },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <RRNavLink
            key={item.title}
            to={item.url}
            end={item.url === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
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
