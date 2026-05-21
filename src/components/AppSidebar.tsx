import { useAuth } from '@/hooks/useAuth';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, Receipt, Layers, TrendingUp,
  LogOut, Bot, Wallet, Sun, Moon, ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { PlmccWordmark } from '@/components/PlmccWordmark';
import { PlmccMark } from '@/components/PlmccMark';

const items = [
  { title: 'Dashboard',   url: '/',            icon: LayoutDashboard },
  { title: 'Lançamentos', url: '/lancamentos', icon: Receipt },
  { title: 'Contas',      url: '/contas',      icon: Wallet },
  { title: 'Consultor IA',url: '/consultor',   icon: Bot },
  { title: 'Categorias',  url: '/categorias',  icon: Layers },
  { title: 'Projeção',    url: '/projecao',    icon: TrendingUp },
];

const externalItems = [
  { title: 'Tarefas', href: 'https://pedro-hq-workbench.lovable.app/shopping', icon: ShoppingCart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/60 bg-sidebar/90 backdrop-blur-2xl"
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-center min-h-[56px]">
        {collapsed ? (
          <PlmccMark size={32} style={{ color: '#E58430' }} />
        ) : (
          <PlmccWordmark size={38} color="#E58430" />
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary"
                    >
                      <item.icon className="w-[17px] h-[17px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {externalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <item.icon className="w-[17px] h-[17px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/50 space-y-1">
        {!collapsed && user && (
          <p className="text-[11px] text-muted-foreground/60 truncate mb-1.5 px-2">
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-[10px] transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-[17px] w-[17px]" />
          ) : (
            <Moon className="h-[17px] w-[17px]" />
          )}
          {!collapsed && (
            <span className="ml-2">{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={signOut}
          className="w-full justify-start text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[10px] transition-colors"
        >
          <LogOut className="h-[17px] w-[17px]" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
