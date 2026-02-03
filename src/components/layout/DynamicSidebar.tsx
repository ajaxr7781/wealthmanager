import { Link, useLocation } from 'react-router-dom';
import { useCategoriesWithTypes, useTransactionSupportedTypes, usePriceFeedSupportedTypes } from '@/hooks/useAssetConfig';
import { cn } from '@/lib/utils';
import { 
  Briefcase, 
  LayoutDashboard,
  Receipt,
  TrendingUp,
  FileText,
  Settings,
  Coins,
  Landmark,
  Building2,
  BarChart3,
  PieChart,
  Wallet,
  MapPin,
  Bitcoin,
  ChevronDown,
  ChevronRight,
  Package,
  LineChart,
  Calendar,
} from 'lucide-react';
import { useState } from 'react';

// Map string icons to components
const IconMap: Record<string, typeof Coins> = {
  Coins,
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart,
  FileText,
  MapPin,
  Package,
};

interface DynamicSidebarNavProps {
  onItemClick?: () => void;
  isMobile?: boolean;
}

export function DynamicSidebarNav({ onItemClick, isMobile }: DynamicSidebarNavProps) {
  const location = useLocation();
  const { data: categoriesWithTypes } = useCategoriesWithTypes();
  const { data: transactionTypes } = useTransactionSupportedTypes();
  const { data: priceFeedTypes } = usePriceFeedSupportedTypes();
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['assets']));

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isActive = (path: string) => location.pathname === path;
  const isActivePrefix = (prefix: string) => location.pathname.startsWith(prefix);

  // Check if transactions or prices sections should show
  const hasTransactionTypes = transactionTypes && transactionTypes.length > 0;
  const hasPriceFeedTypes = priceFeedTypes && priceFeedTypes.length > 0;

  const navItemClass = (active: boolean) => cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
    active
      ? 'bg-sidebar-accent text-sidebar-primary'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
  );

  const mobileNavItemClass = (active: boolean) => cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
    active
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
  );

  const getItemClass = isMobile ? mobileNavItemClass : navItemClass;

  return (
    <nav className="flex-1 space-y-1">
      {/* Portfolio / Dashboard */}
      <Link
        to="/portfolio"
        onClick={onItemClick}
        className={getItemClass(isActive('/portfolio') || isActive('/'))}
      >
        <LayoutDashboard className="h-5 w-5" />
        Portfolio
      </Link>

      {/* Assets Section with Categories */}
      <div>
        <button
          onClick={() => toggleCategory('assets')}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActivePrefix('/assets') || isActivePrefix('/holdings')
              ? isMobile ? 'bg-accent text-accent-foreground' : 'bg-sidebar-accent text-sidebar-primary'
              : isMobile ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5" />
            Assets
          </div>
          {expandedCategories.has('assets') ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {expandedCategories.has('assets') && (
          <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
            <Link
              to="/holdings"
              onClick={onItemClick}
              className={getItemClass(isActive('/holdings'))}
            >
              <Package className="h-4 w-4" />
              All Holdings
            </Link>

            {/* Dynamic category-based links */}
            {categoriesWithTypes?.filter(cat => cat.asset_types.length > 0).map((category) => {
              const Icon = IconMap[category.icon || 'Package'] || Package;
              return (
                <Link
                  key={category.code}
                  to={`/holdings/${category.code}`}
                  onClick={onItemClick}
                  className={getItemClass(isActive(`/holdings/${category.code}`))}
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                </Link>
              );
            })}

            {/* Mutual Funds under Assets */}
            <Link
              to="/mf/holdings"
              onClick={onItemClick}
              className={getItemClass(isActive('/mf/holdings') || isActivePrefix('/mf/'))}
            >
              <LineChart className="h-4 w-4" />
              Mutual Funds
            </Link>
          </div>
        )}
      </div>

      {/* Trades / Transactions - Only show if there are transaction-supporting types */}
      {hasTransactionTypes && (
        <Link
          to="/transactions"
          onClick={onItemClick}
          className={getItemClass(isActive('/transactions'))}
        >
          <Receipt className="h-5 w-5" />
          Trades
        </Link>
      )}

      {/* Market / Prices - Only show if there are price-feed-supporting types */}
      {hasPriceFeedTypes && (
        <Link
          to="/prices"
          onClick={onItemClick}
          className={getItemClass(isActive('/prices'))}
        >
          <TrendingUp className="h-5 w-5" />
          Market
        </Link>
      )}

      {/* Reports */}
      <Link
        to="/reports"
        onClick={onItemClick}
        className={getItemClass(isActive('/reports'))}
      >
        <FileText className="h-5 w-5" />
        Reports
      </Link>

      {/* SIPs as separate top-level item */}
      <Link
        to="/mf/sips"
        onClick={onItemClick}
        className={getItemClass(isActive('/mf/sips'))}
      >
        <Calendar className="h-5 w-5" />
        My SIPs
      </Link>

      {/* Settings */}
      <div>
        <button
          onClick={() => toggleCategory('settings')}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActivePrefix('/settings')
              ? isMobile ? 'bg-accent text-accent-foreground' : 'bg-sidebar-accent text-sidebar-primary'
              : isMobile ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5" />
            Settings
          </div>
          {expandedCategories.has('settings') ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {expandedCategories.has('settings') && (
          <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
            <Link
              to="/settings/asset-types"
              onClick={onItemClick}
              className={getItemClass(isActive('/settings/asset-types'))}
            >
              <Briefcase className="h-4 w-4" />
              Asset Types
            </Link>
            <Link
              to="/settings/mf-schemes"
              onClick={onItemClick}
              className={getItemClass(isActive('/settings/mf-schemes'))}
            >
              <LineChart className="h-4 w-4" />
              MF Schemes
            </Link>
            <Link
              to="/settings/preferences"
              onClick={onItemClick}
              className={getItemClass(isActive('/settings/preferences'))}
            >
              <Settings className="h-4 w-4" />
              Preferences
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
