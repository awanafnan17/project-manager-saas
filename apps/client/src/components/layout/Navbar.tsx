import { LogOut, Bell, FolderKanban } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../../lib/utils';

export function Navbar() {
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-white/5 bg-gray-900/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <FolderKanban className="w-6 h-6 text-brand-400" />
        <span className="text-lg font-bold text-white hidden sm:inline">ProjectMgr</span>
        {tenant && <span className="text-xs text-gray-500 hidden lg:inline ml-2">/ {tenant.name}</span>}
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
            {getInitials(user?.firstName, user?.lastName)}
          </div>
          <span className="text-sm text-gray-300 hidden sm:inline">{user?.firstName}</span>
        </div>

        <button onClick={handleLogout} className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors" title="Logout">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
