import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '#', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} hidden md:flex flex-col bg-gray-900/50 border-r border-white/5 transition-all duration-300`}>
      <nav className="flex-1 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600/20 text-brand-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 mx-2 mb-4 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
