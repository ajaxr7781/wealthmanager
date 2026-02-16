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
  Target,
  Scale,
  CreditCard,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const IconMap: Record<string, typeof Coins> = {
  Coins, Landmark, TrendingUp, Building2, Bitcoin, Wallet,
  Briefcase, BarChart3, PieChart, FileText, MapPin, Package,
};

interface DynamicSidebarNavProps {
  onItemClick?: () => void;
  isMobile?: boolean;
  collapsed?: boolean;
}

// Section label component
function SectionLabel({ collapsed, children }: { collapsed?: boolean; children: React.ReactNode }) {
  if (collapsed) return null;
  return (
    <span className="px-3 pt-5 pb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 select-none">
      {children}
    </span>
  );
}

// Nav item wrapper with tooltip for collapsed state
function NavItem({ collapsed, label, children }: { collapsed?: boolean; label: string; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
    </Tooltip>
  );
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
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isActive = (path: string) => location.pathname === path;
  const isActivePrefix = (prefix: string) => location.pathname.startsWith(prefix);

  const hasTransactionTypes = transactionTypes && transactionTypes.length > 0;
  const hasPriceFeedTypes = priceFeedTypes && priceFeedTypes.length > 0;

  const sortedAssetItems = useMemo(() => {
    const items = [
      ...(categoriesWithTypes?.filter(cat => cat.asset_types.length > 0).map(category => ({
        type: 'category' as const,
        code: category.code,
        name: category.name,
        icon: category.icon,
        path: `/holdings/${category.code}`,
        totalValue: categoryTotals?.[category.code]?.totalValue || 0,
      })) || []),
      {
        type: 'mf' as const,
        code: 'mutual_funds',
        name: 'Mutual Funds',
        icon: 'LineChart',
        path: '/mf/holdings',
        totalValue: categoryTotals?.['mutual_funds']?.totalValue || 0,
      },
      {
        type: 'sip' as const,
        code: 'sips',
        name: 'My SIPs',
        icon: 'Calendar',
        path: '/mf/sips',
        totalValue: 0,
      },
    ];

    return items.sort((a, b) => {
      if (a.totalValue !== b.totalValue) return b.totalValue - a.totalValue;
      return a.name.localeCompare(b.name);
    });
  }, [categoriesWithTypes, categoryTotals]);

  // Desktop nav item with left accent bar
  const navItemClass = (active: boolean) => cn(
    'group relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-150',
    collapsed ? 'justify-center mx-auto w-10 h-10' : 'gap-3 px-3 py-2',
    active
      ? 'bg-white/15 text-white shadow-sm'
      : 'text-white/60 hover:bg-white/8 hover:text-white/90'
  );

  // Left accent indicator for active items
  const ActiveIndicator = ({ active }: { active: boolean }) => (
    active ? (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all" />
    ) : null
  );

  // Mobile nav item
  const mobileNavItemClass = (active: boolean) => cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
  );

  const renderDesktopItem = (path: string, icon: React.ReactNode, label: string, activeCheck?: boolean) => {
    const active = activeCheck ?? isActive(path);
    return (
      <NavItem collapsed={collapsed} label={label} key={path}>
        <Link to={path} onClick={onItemClick} className={navItemClass(active)}>
          <ActiveIndicator active={active} />
          {icon}
          {!collapsed && <span>{label}</span>}
        </Link>
      </NavItem>
    );
  };

  if (isMobile) {
    return (
      <nav className="flex-1 space-y-1">
        <Link to="/portfolio" onClick={onItemClick} className={mobileNavItemClass(isActive('/portfolio') || isActive('/'))}>
          <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
          <span>Dashboard</span>
        </Link>

        <div className="pt-3">
          <button
            onClick={() => toggleCategory('assets')}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActivePrefix('/assets') || isActivePrefix('/holdings')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span>Assets</span>
            </div>
            {expandedCategories.has('assets') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {expandedCategories.has('assets') && (
            <div className="mt-1 ml-4 border-l-2 border-border pl-3 space-y-0.5">
              <Link to="/holdings" onClick={onItemClick} className={mobileNavItemClass(isActive('/holdings'))}>
                <Package className="h-4 w-4 flex-shrink-0" />
                <span>All Holdings</span>
              </Link>
              {sortedAssetItems.map(item => {
                const Icon = item.icon === 'LineChart' ? LineChart : item.icon === 'Calendar' ? Calendar : IconMap[item.icon || 'Package'] || Package;
                const isItemActive = item.type === 'mf'
                  ? isActive('/mf/holdings') || (isActivePrefix('/mf/') && !isActive('/mf/sips'))
                  : item.type === 'sip' ? isActive('/mf/sips') : isActive(item.path);
                return (
                  <Link key={item.code} to={item.path} onClick={onItemClick} className={mobileNavItemClass(isItemActive)}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3">
          <span className="px-3 pb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 select-none">Markets</span>
          {hasPriceFeedTypes && (
            <Link to="/prices" onClick={onItemClick} className={mobileNavItemClass(isActive('/prices'))}>
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span>Market</span>
            </Link>
          )}
          {hasTransactionTypes && (
            <Link to="/transactions" onClick={onItemClick} className={mobileNavItemClass(isActive('/transactions'))}>
              <Receipt className="h-4 w-4 flex-shrink-0" />
              <span>Trades</span>
            </Link>
          )}
        </div>

        <div className="pt-3">
          <span className="px-3 pb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 select-none">Insights</span>
          <Link to="/reports" onClick={onItemClick} className={mobileNavItemClass(isActive('/reports'))}>
            <BarChart3 className="h-4 w-4 flex-shrink-0" />
            <span>Reports</span>
          </Link>
          <Link to="/goals" onClick={onItemClick} className={mobileNavItemClass(isActive('/goals'))}>
            <Target className="h-4 w-4 flex-shrink-0" />
            <span>Goals</span>
          </Link>
          <Link to="/rebalancing" onClick={onItemClick} className={mobileNavItemClass(isActive('/rebalancing'))}>
            <Scale className="h-4 w-4 flex-shrink-0" />
            <span>Rebalancing</span>
          </Link>
          <Link to="/liabilities" onClick={onItemClick} className={mobileNavItemClass(isActive('/liabilities'))}>
            <CreditCard className="h-4 w-4 flex-shrink-0" />
            <span>Liabilities</span>
          </Link>
        </div>

        <div className="pt-3">
          <button
            onClick={() => toggleCategory('settings')}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActivePrefix('/settings')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Settings</span>
            </div>
            {expandedCategories.has('settings') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {expandedCategories.has('settings') && (
            <div className="mt-1 ml-4 border-l-2 border-border pl-3 space-y-0.5">
              <Link to="/settings/asset-types" onClick={onItemClick} className={mobileNavItemClass(isActive('/settings/asset-types'))}>
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <span>Asset Types</span>
              </Link>
              <Link to="/settings/mf-schemes" onClick={onItemClick} className={mobileNavItemClass(isActive('/settings/mf-schemes'))}>
                <LineChart className="h-4 w-4 flex-shrink-0" />
                <span>MF Schemes</span>
              </Link>
              <Link to="/settings/preferences" onClick={onItemClick} className={mobileNavItemClass(isActive('/settings/preferences'))}>
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>Preferences</span>
              </Link>
            </div>
          )}
        </div>
      </nav>
    );
  }

  // Desktop sidebar
  return (
    <nav className="flex-1 space-y-0.5">
      {/* Dashboard - top level, no section label */}
      {renderDesktopItem('/portfolio', <LayoutDashboard className="h-4 w-4 flex-shrink-0" />, 'Dashboard', isActive('/portfolio') || isActive('/'))}

      {/* Portfolio section */}
      <SectionLabel collapsed={collapsed}>Portfolio</SectionLabel>

      {collapsed ? (
        // Collapsed: show icons only with tooltips
        <>
          <NavItem collapsed label="All Holdings">
            <Link to="/holdings" onClick={onItemClick} className={navItemClass(isActive('/holdings'))}>
              <ActiveIndicator active={isActive('/holdings')} />
              <Package className="h-4 w-4 flex-shrink-0" />
            </Link>
          </NavItem>
          {sortedAssetItems.map(item => {
            const Icon = item.icon === 'LineChart' ? LineChart : item.icon === 'Calendar' ? Calendar : IconMap[item.icon || 'Package'] || Package;
            const isItemActive = item.type === 'mf'
              ? isActive('/mf/holdings') || (isActivePrefix('/mf/') && !isActive('/mf/sips'))
              : item.type === 'sip' ? isActive('/mf/sips') : isActive(item.path);
            return (
              <NavItem collapsed label={item.name} key={item.code}>
                <Link to={item.path} onClick={onItemClick} className={navItemClass(isItemActive)}>
                  <ActiveIndicator active={isItemActive} />
                  <Icon className="h-4 w-4 flex-shrink-0" />
                </Link>
              </NavItem>
            );
          })}
        </>
      ) : (
        // Expanded: collapsible assets group
        <>
          <button
            onClick={() => toggleCategory('assets')}
            className={cn(
              'flex items-center justify-between w-full rounded-lg text-[13px] font-medium transition-all duration-150 px-3 py-2',
              isActivePrefix('/assets') || isActivePrefix('/holdings')
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:bg-white/8 hover:text-white/90'
            )}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span>Assets</span>
            </div>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-white/40 transition-transform duration-200",
              !expandedCategories.has('assets') && "-rotate-90"
            )} />
          </button>

          {expandedCategories.has('assets') && (
            <div className="ml-[22px] border-l border-white/15 pl-2.5 space-y-0.5 py-0.5">
              <NavItem collapsed={false} label="All Holdings">
                <Link to="/holdings" onClick={onItemClick} className={navItemClass(isActive('/holdings'))}>
                  <ActiveIndicator active={isActive('/holdings')} />
                  <Package className="h-4 w-4 flex-shrink-0" />
                  <span>All Holdings</span>
                </Link>
              </NavItem>

              {sortedAssetItems.map(item => {
                const Icon = item.icon === 'LineChart' ? LineChart : item.icon === 'Calendar' ? Calendar : IconMap[item.icon || 'Package'] || Package;
                const isItemActive = item.type === 'mf'
                  ? isActive('/mf/holdings') || (isActivePrefix('/mf/') && !isActive('/mf/sips'))
                  : item.type === 'sip' ? isActive('/mf/sips') : isActive(item.path);
                return (
                  <NavItem collapsed={false} label={item.name} key={item.code}>
                    <Link to={item.path} onClick={onItemClick} className={navItemClass(isItemActive)}>
                      <ActiveIndicator active={isItemActive} />
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  </NavItem>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Markets section - Market data first, then Trades */}
      <SectionLabel collapsed={collapsed}>Markets</SectionLabel>
      {hasPriceFeedTypes && renderDesktopItem('/prices', <TrendingUp className="h-4 w-4 flex-shrink-0" />, 'Market')}
      {hasTransactionTypes && renderDesktopItem('/transactions', <Receipt className="h-4 w-4 flex-shrink-0" />, 'Trades')}

      {/* Insights section */}
      <SectionLabel collapsed={collapsed}>Insights</SectionLabel>
      {renderDesktopItem('/reports', <BarChart3 className="h-4 w-4 flex-shrink-0" />, 'Reports')}
      {renderDesktopItem('/goals', <Target className="h-4 w-4 flex-shrink-0" />, 'Goals')}
      {renderDesktopItem('/rebalancing', <Scale className="h-4 w-4 flex-shrink-0" />, 'Rebalancing')}
      {renderDesktopItem('/liabilities', <CreditCard className="h-4 w-4 flex-shrink-0" />, 'Liabilities')}

      {/* Settings section */}
      <SectionLabel collapsed={collapsed}>Manage</SectionLabel>
      {collapsed ? (
        <>
          <NavItem collapsed label="Asset Types">
            <Link to="/settings/asset-types" onClick={onItemClick} className={navItemClass(isActive('/settings/asset-types'))}>
              <ActiveIndicator active={isActive('/settings/asset-types')} />
              <Briefcase className="h-4 w-4 flex-shrink-0" />
            </Link>
          </NavItem>
          <NavItem collapsed label="MF Schemes">
            <Link to="/settings/mf-schemes" onClick={onItemClick} className={navItemClass(isActive('/settings/mf-schemes'))}>
              <ActiveIndicator active={isActive('/settings/mf-schemes')} />
              <LineChart className="h-4 w-4 flex-shrink-0" />
            </Link>
          </NavItem>
          <NavItem collapsed label="Preferences">
            <Link to="/settings/preferences" onClick={onItemClick} className={navItemClass(isActive('/settings/preferences'))}>
              <ActiveIndicator active={isActive('/settings/preferences')} />
              <Settings className="h-4 w-4 flex-shrink-0" />
            </Link>
          </NavItem>
        </>
      ) : (
        <>
          <button
            onClick={() => toggleCategory('settings')}
            className={cn(
              'flex items-center justify-between w-full rounded-lg text-[13px] font-medium transition-all duration-150 px-3 py-2',
              isActivePrefix('/settings')
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:bg-white/8 hover:text-white/90'
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Settings</span>
            </div>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-white/40 transition-transform duration-200",
              !expandedCategories.has('settings') && "-rotate-90"
            )} />
          </button>

          {expandedCategories.has('settings') && (
            <div className="ml-[22px] border-l border-white/15 pl-2.5 space-y-0.5 py-0.5">
              {renderDesktopItem('/settings/asset-types', <Briefcase className="h-4 w-4 flex-shrink-0" />, 'Asset Types')}
              {renderDesktopItem('/settings/mf-schemes', <LineChart className="h-4 w-4 flex-shrink-0" />, 'MF Schemes')}
              {renderDesktopItem('/settings/preferences', <Settings className="h-4 w-4 flex-shrink-0" />, 'Preferences')}
            </div>
          )}
        </>
      )}
    </nav>
  );
}
