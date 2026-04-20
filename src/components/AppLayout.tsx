import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileNav } from '@/components/MobileNav';
import { OnboardingTour } from '@/components/OnboardingTour';
import { useAuth } from '@/hooks/useAuth';

function formatDisplayName(email: string): string {
  const local = email.split('@')[0];
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const displayName = user?.email ? formatDisplayName(user.email) : '';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 md:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {greeting}, <span className="text-foreground font-medium">{displayName}</span>
              </span>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8 overflow-auto">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        <MobileNav />
        <OnboardingTour />
      </div>
    </SidebarProvider>
  );
}
