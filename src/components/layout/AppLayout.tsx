import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Briefcase,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { AlertBell } from './AlertBell';
import { useTheme } from 'next-themes';
import { DynamicSidebarNav } from './DynamicSidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Collapsible */}
      <aside 
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out z-30",
          sidebarCollapsed ? "lg:w-[60px]" : "lg:w-[252px]"
        )}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-[hsl(220,58%,28%)] via-[hsl(218,55%,22%)] to-[hsl(220,52%,18%)]">
          {/* Logo */}
          <div className={cn(
            "flex-shrink-0 flex items-center gap-3 border-b border-white/10",
            sidebarCollapsed ? "justify-center px-2 py-4" : "px-5 py-5"
          )}>
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0 backdrop-blur-sm">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-semibold text-white text-[15px] tracking-tight whitespace-nowrap">InvestTracker</h1>
                <p className="text-[11px] text-white/40 whitespace-nowrap">Portfolio Manager</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 min-h-0 px-2 py-2 overflow-y-auto scrollbar-none">
            <DynamicSidebarNav collapsed={sidebarCollapsed} />
          </div>

          {/* Bottom section */}
          <div className="flex-shrink-0 px-2 py-3 border-t border-white/10 space-y-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "w-full text-white/50 hover:text-white/80 hover:bg-white/8 rounded-lg h-9 text-[13px]",
                sidebarCollapsed ? "justify-center px-2" : "justify-start"
              )}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 mr-3" />
                  Collapse
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "w-full text-white/50 hover:text-white/80 hover:bg-white/8 rounded-lg h-9 text-[13px]",
                sidebarCollapsed ? "justify-center px-2" : "justify-start"
              )}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {!sidebarCollapsed && (
                <span className="ml-3">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={cn(
                "w-full text-white/50 hover:text-white/80 hover:bg-white/8 rounded-lg h-9 text-[13px]",
                sidebarCollapsed ? "justify-center px-2" : "justify-start"
              )}
            >
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed && <span className="ml-3">Sign out</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header - White with subtle border */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">InvestTracker</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertBell className="text-muted-foreground hover:text-foreground" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="px-4 py-3 border-t border-border bg-card max-h-[70vh] overflow-y-auto">
            <DynamicSidebarNav 
              onItemClick={() => setMobileMenuOpen(false)} 
              isMobile 
            />
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign out
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={cn(
        "w-full transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-[252px]"
      )}>
        <div className="pt-16 lg:pt-0 min-h-screen px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}