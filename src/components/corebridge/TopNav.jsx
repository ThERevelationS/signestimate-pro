import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User as UserIcon } from 'lucide-react';

// ============================================================================
// CoreBridge-style persistent top navigation.
// Dark bar, green active state, hover dropdown menus. Every existing page in
// the app is reachable from here — nothing was removed, only reorganized:
//   Sales Home → Dashboard          Queues   → every module's project list
//   Customers  → customer summaries Quick Price → single-point estimators
//   Estimates  → All-In-One + module estimates  Products → inventories
//   Settings / Tools (right side)   → module settings, admin, profile, etc.
// ============================================================================

const MODULE_NAV = [
  { id: 'channel_letter_installation', name: 'Channel & Dimensional Letters', projects: 'ChannelLetterInstallationProjects', newEst: 'NewChannelLetterInstallation', settings: 'ChannelLetterInstallationSettings', inventory: 'ChannelLetterInstallInventory' },
  { id: 'foundation', name: 'Concrete | Masonry | Poles', projects: 'FoundationProjects', newEst: 'NewFoundationEstimate', settings: 'FoundationSettings' },
  { id: 'sign_maintenance', name: 'Sign Maintenance', projects: 'SignMaintenanceProjects', newEst: 'NewSignMaintenance', settings: 'SignMaintenanceSettings', inventory: 'MaintenanceInventory' },
];

const QUICK_PRICE_NAV = [
  { id: 'painting', name: 'Paint Estimate', projects: 'PaintProjects', newEst: 'NewPaintEstimate', settings: 'PaintSettings' },
  { id: 'laser', name: 'Laser Cutting & Engraving', projects: 'LaserProjects', newEst: 'NewLaserEstimate', settings: 'LaserSettings' },
  { id: 'cnc', name: 'CNC Routing', projects: 'CNCProjects', newEst: 'NewCNCEstimate', settings: 'CNCSettings' },
  { id: 'metal_fabrication', name: 'Metal Fabrication', projects: 'MetalProjects', newEst: 'NewMetalEstimate', settings: 'MetalSettings', inventory: 'Inventory' },
  { id: 'vinyl_estimator', name: 'Vinyl Estimate', projects: 'VinylProjects', newEst: 'NewVinylEstimate', settings: 'VinylSettings', inventory: 'VinylInventory' },
];

function NavMenu({ label, to, items, isActive, onNavClick, align = 'left' }) {
  const cls = `block px-4 lg:px-6 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
    isActive ? 'text-lime-400' : 'text-white hover:bg-zinc-800'
  }`;
  return (
    <div className="relative group">
      {to ? (
        <Link to={to} onClick={(e) => onNavClick(e, to)} className={cls}>{label}</Link>
      ) : (
        <span className={`${cls} cursor-default`}>{label}</span>
      )}
      {items && items.length > 0 && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full hidden group-hover:block bg-zinc-900 border border-zinc-700 shadow-2xl min-w-[240px] max-h-[70vh] overflow-y-auto z-[130]`}>
          {items.map((it, i) =>
            it.divider ? (
              <div key={`d-${i}`} className="px-4 py-1 text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-zinc-800/60 border-b border-zinc-800">{it.divider}</div>
            ) : (
              <Link
                key={it.to + it.label}
                to={it.to}
                onClick={(e) => onNavClick(e, it.to)}
                className="block px-4 py-2.5 text-sm text-white font-medium hover:bg-zinc-700 border-b border-zinc-800 last:border-0"
              >
                {it.label}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function TopNav({ currentUser, hasPermission, onNavClick, pathname }) {
  const p = (page) => createPageUrl(page);
  const visibleModules = MODULE_NAV.filter((m) => hasPermission(m.id));
  const visibleQuick = QUICK_PRICE_NAV.filter((m) => hasPermission(m.id));
  const isAdmin = currentUser?.role === 'admin';

  const menus = [
    { label: 'Sales Home', to: p('Dashboard') },
    {
      label: 'Queues',
      items: [
        { divider: 'Estimate Queues' },
        { label: 'All-In-One Estimates', to: p('AllInOneProjects') },
        ...visibleModules.map((m) => ({ label: m.name, to: p(m.projects) })),
        ...visibleQuick.map((m) => ({ label: m.name.replace(' Estimate', ''), to: p(m.projects) })),
      ],
    },
    {
      label: 'Customers',
      to: p('Customers'),
      items: [
        { label: 'Customer Search', to: p('Customers') },
      ],
    },
    {
      label: 'Quick Price',
      items: visibleQuick.map((m) => ({ label: m.name, to: p(m.newEst) })),
    },
    {
      label: 'Estimates',
      to: p('AllInOneProjects'),
      items: [
        { label: 'Search', to: p('AllInOneProjects') },
        { label: 'Create New', to: p('NewAllInOneEstimate') },
        { divider: 'New Module Estimate' },
        ...visibleModules.map((m) => ({ label: m.name, to: p(m.newEst) })),
      ],
    },
    {
      label: 'Products',
      to: p('QuickProducts'),
      items: [
        { label: 'Manage Quick Products', to: p('QuickProducts') },
        { label: 'New Quick Product', to: p('QuickProductEditor') },
        { divider: 'Inventories' },
        ...(isAdmin ? [{ label: 'Master Inventory', to: p('MasterInventory') }] : []),
        ...[...visibleModules, ...visibleQuick]
          .filter((m) => m.inventory)
          .map((m) => ({ label: `${m.name.replace(' Estimate', '')} Inventory`, to: p(m.inventory) })),
      ],
    },
  ].filter((m) => m.to || (m.items && m.items.some((it) => !it.divider)));

  const settingsItems = [{ label: 'Estimate Settings', to: p('EstimateSettings') }, { divider: 'Modules' }].concat(
    [...visibleModules, ...visibleQuick].map((m) => ({
      label: m.name.replace(' Estimate', ''),
      to: p(m.settings),
    }))
  );
  const toolsItems = [
    { label: 'Formula Viewer', to: p('FormulaViewer') },
    { label: 'Report Bug / Feature', to: p('Report') },
    ...(isAdmin ? [{ label: 'Admin', to: p('Admin') }] : []),
    { label: 'My Profile', to: p('MyProfile') },
  ];

  const menuActive = (m) =>
    (m.to && pathname === m.to) ||
    (m.items || []).some((it) => !it.divider && pathname === it.to);

  return (
    <div className="sticky top-0 z-[110] shadow-md">
      {/* Brand strip */}
      <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex items-center justify-between">
        <Link to={p('Dashboard')} onClick={(e) => onNavClick(e, p('Dashboard'))} className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">SE</span>
          </div>
          <span className="font-bold text-slate-900 text-sm">SignEstimate Pro</span>
          <span className="text-slate-300 text-sm">|</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">Professional Estimating</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="hidden md:inline">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span className="flex items-center gap-1 font-medium text-slate-800">
            <UserIcon className="w-3.5 h-3.5" />
            {currentUser?.screen_name || currentUser?.full_name || currentUser?.email || ''}
          </span>
          <span className="uppercase text-[10px] font-bold tracking-wider text-lime-700 hidden sm:inline">Sales Module</span>
        </div>
      </div>

      {/* Primary nav bar */}
      <nav className="bg-zinc-900 flex items-stretch flex-wrap">
        <div className="flex items-stretch flex-1">
          {menus.map((m) => (
            <NavMenu key={m.label} label={m.label} to={m.to} items={m.items} isActive={menuActive(m)} onNavClick={onNavClick} />
          ))}
        </div>
        <div className="flex items-stretch">
          <NavMenu label="Settings" align="right" items={settingsItems} isActive={menuActive({ items: settingsItems })} onNavClick={onNavClick} />
          <NavMenu label="Tools" align="right" items={toolsItems} isActive={menuActive({ items: toolsItems })} onNavClick={onNavClick} />
        </div>
      </nav>
    </div>
  );
}