import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, CheckSquare, Users, Plus, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import { truncate } from '../lib/utils';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const { projects, fetchProjects, loading } = useProjectStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const totalTasks = projects.reduce((sum, p) => sum + (p._count?.tasks || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="text-gray-400 mt-1">{tenant?.name} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FolderKanban className="w-5 h-5 text-brand-400" />} label="Projects" value={projects.length} />
        <StatCard icon={<CheckSquare className="w-5 h-5 text-emerald-400" />} label="Total Tasks" value={totalTasks} />
        <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Role" value={user?.role || '—'} isText />
        <StatCard icon={<CheckSquare className="w-5 h-5 text-amber-400" />} label="Organization" value={tenant?.plan || 'free'} isText />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button onClick={() => navigate('/projects')} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Project
        </Button>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
          <button onClick={() => navigate('/projects')} className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <FolderKanban className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No projects yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="glass-card p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white group-hover:text-brand-300 truncate">{project.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{project.description ? truncate(project.description, 60) : 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge value={project.status} />
                  <Badge variant="priority" value={project.priority} />
                  <span className="text-xs text-gray-500">{project._count?.tasks || 0} tasks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, isText }: { icon: React.ReactNode; label: string; value: string | number; isText?: boolean }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className={`font-bold ${isText ? 'text-sm text-gray-300 capitalize' : 'text-2xl text-white'}`}>{value}</p>
    </div>
  );
}
