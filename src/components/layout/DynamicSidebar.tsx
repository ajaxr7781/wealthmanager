import { Link, useLocation } from 'react-router-dom';
import { useCategoriesWithTypes, useTransactionSupportedTypes, usePriceFeedSupportedTypes } from '@/hooks/useAssetConfig';
import { useCategoryTotals } from '@/hooks/useCategoryTotals';
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
import { useState, useMemo } from 'react';

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
  collapsed?: boolean;
}

export function DynamicSidebarNav({ onItemClick, isMobile, collapsed }: DynamicSidebarNavProps) {
  const location = useLocation();
  const { data: categoriesWithTypes } = useCategoriesWithTypes();
  const { data: transactionTypes } = useTransactionSupportedTypes();
  const { data: priceFeedTypes } = usePriceFeedSupportedTypes();
  const { data: categoryTotals } = useCategoryTotals();
  
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

  // Memoize sorted asset items - MUST be at top level, not inside conditional render
  const sortedAssetItems = useMemo(() => {
    const items = [
      // Dynamic categories
      ...(categoriesWithTypes?.filter(cat => cat.asset_types.length > 0).map(category => ({
        type: 'category' as const,
        code: category.code,
        name: category.name,
        icon: category.icon,
        path: `/holdings/${category.code}`,
        totalValue: categoryTotals?.[category.code]?.totalValue || 0,
      })) || []),
      // Mutual Funds
      {
        type: 'mf' as const,
        code: 'mutual_funds',
        name: 'Mutual Funds',
        icon: 'LineChart',
        path: '/mf/holdings',
        totalValue: categoryTotals?.['mutual_funds']?.totalValue || 0,
      },
      // SIPs (no value, always at end of zero-value items alphabetically)
      {
        type: 'sip' as const,
        code: 'sips',
        name: 'My SIPs',
        icon: 'Calendar',
        path: '/mf/sips',
        totalValue: 0,
      },
    ];

    // Sort: by value desc, then alphabetically for zero-value items
    return items.sort((a, b) => {
      if (a.totalValue !== b.totalValue) {
        return b.totalValue - a.totalValue; // Descending by value
      }
      return a.name.localeCompare(b.name); // Alphabetical for same value
    });
  }, [categoriesWithTypes, categoryTotals]);

  // Desktop sidebar nav item styling - clean charcoal with slate blue active
  const navItemClass = (active: boolean) => cn(
    'flex items-center rounded-md text-sm font-medium transition-all duration-150',
    collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
  );

  // Mobile nav item styling
  const mobileNavItemClass = (active: boolean) => cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
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
        title={collapsed ? 'Dashboard' : undefined}
      >
        <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span>Dashboard</span>}
      </Link>

      {/* Assets Section with Categories */}
      <div className="pt-4">
        <button
          onClick={() => !collapsed && toggleCategory('assets')}
          className={cn(
            'flex items-center w-full rounded-md text-sm font-medium transition-colors',
            collapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2',
            isActivePrefix('/assets') || isActivePrefix('/holdings')
              ? isMobile ? 'bg-accent text-accent-foreground' : 'bg-sidebar-accent text-sidebar-foreground'
              : isMobile ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          title={collapsed ? 'Assets' : undefined}
        >
          <div className={cn("flex items-center", collapsed ? "" : "gap-3")}>
            <Briefcase className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Assets</span>}
          </div>
          {!collapsed && (
            expandedCategories.has('assets') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          )}
        </button>

        {(expandedCategories.has('assets') || collapsed) && (
          <div className={cn(
            "mt-1 space-y-0.5",
            !collapsed && "ml-4 border-l-2 border-sidebar-border pl-3"
          )}>
            <Link
              to="/holdings"
              onClick={onItemClick}
              className={getItemClass(isActive('/holdings'))}
              title={collapsed ? 'All Holdings' : undefined}
            >
              <Package className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>All Holdings</span>}
            </Link>

            {/* Dynamic category-based links - sorted by value desc, then alphabetically */}
            {sortedAssetItems.map((item) => {
              const Icon = item.icon === 'LineChart' ? LineChart 
                : item.icon === 'Calendar' ? Calendar 
                : IconMap[item.icon || 'Package'] || Package;
              
              const isItemActive = item.type === 'mf' 
                ? isActive('/mf/holdings') || (isActivePrefix('/mf/') && !isActive('/mf/sips'))
                : item.type === 'sip'
                ? isActive('/mf/sips')
                : isActive(item.path);

              return (
                <Link
                  key={item.code}
                  to={item.path}
                  onClick={onItemClick}
                  className={getItemClass(isItemActive)}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Trades / Transactions - Only show if there are transaction-supporting types */}
      {hasTransactionTypes && (
        <Link
          to="/transactions"
          onClick={onItemClick}
          className={getItemClass(isActive('/transactions'))}
          title={collapsed ? 'Trades' : undefined}
        >
          <Receipt className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Trades</span>}
        </Link>
      )}

      {/* Market / Prices - Only show if there are price-feed-supporting types */}
      {hasPriceFeedTypes && (
        <Link
          to="/prices"
          onClick={onItemClick}
          className={getItemClass(isActive('/prices'))}
          title={collapsed ? 'Market' : undefined}
        >
          <TrendingUp className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Market</span>}
        </Link>
      )}

      {/* Reports */}
      <Link
        to="/reports"
        onClick={onItemClick}
        className={getItemClass(isActive('/reports'))}
        title={collapsed ? 'Reports' : undefined}
      >
        <FileText className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span>Reports</span>}
      </Link>

      {/* Settings */}
      <div className="pt-4">
        <button
          onClick={() => !collapsed && toggleCategory('settings')}
          className={cn(
            'flex items-center w-full rounded-md text-sm font-medium transition-colors',
            collapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2',
            isActivePrefix('/settings')
              ? isMobile ? 'bg-accent text-accent-foreground' : 'bg-sidebar-accent text-sidebar-foreground'
              : isMobile ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <div className={cn("flex items-center", collapsed ? "" : "gap-3")}>
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </div>
          {!collapsed && (
            expandedCategories.has('settings') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          )}
        </button>

        {(expandedCategories.has('settings') || collapsed) && (
          <div className={cn(
            "mt-1 space-y-0.5",
            !collapsed && "ml-4 border-l-2 border-sidebar-border pl-3"
          )}>
            <Link
              to="/settings/asset-types"
              onClick={onItemClick}
              className={getItemClass(isActive('/settings/asset-types'))}
              title={collapsed ? 'Asset Types' : undefined}
            >
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Asset Types</span>}
            </Link>
            <Link
              to="/settings/mf-schemes"
              onClick={onItemClick}
              className={getItemClass(isActive('/settings/mf-schemes'))}
              title={collapsed ? 'MF Schemes' : undefined}
            >
              <LineChart className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>MF Schemes</span>}
            </Link>
            <Link
              to="/settings/preferences"
              onClick={onItemClick}
              className={getItemClass(isActive('/settings/preferences'))}
              title={collapsed ? 'Preferences' : undefined}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Preferences</span>}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}