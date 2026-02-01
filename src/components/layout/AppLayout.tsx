import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  TrendingUp, 
  FileText, 
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/transactions', label: 'Metal Trades', icon: Receipt },
  { href: '/holdings', label: 'Metal Holdings', icon: Wallet },
  { href: '/prices', label: 'Prices', icon: TrendingUp },
  { href: '/reports', label: 'Reports', icon: FileText },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-sidebar border-r border-sidebar-border">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="p-2 rounded-lg gold-gradient">
              <Briefcase className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">InvestTracker</h1>
              <p className="text-xs text-sidebar-foreground/60">Portfolio Manager</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 mr-3" />
              ) : (
                <Moon className="h-5 w-5 mr-3" />
              )}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gold-gradient">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">InvestTracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
          <div className="px-4 py-3 border-t border-border bg-background">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign out
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
