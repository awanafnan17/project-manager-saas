import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { getInitials, truncate } from '../../lib/utils';
import { Users, CheckSquare } from 'lucide-react';
import type { Project } from '../../types';

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="glass-card p-5 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold group-hover:text-brand-300 transition-colors">{project.name}</h3>
        <Badge variant="priority" value={project.priority} />
      </div>

      {project.description && (
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">{truncate(project.description, 100)}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {project._count?.members || 0}</span>
          <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5" /> {project._count?.tasks || 0} tasks</span>
        </div>
        <Badge value={project.status} />
      </div>

      {project.owner && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-brand-600/50 flex items-center justify-center text-[10px] font-bold text-white">
            {getInitials(project.owner.firstName, project.owner.lastName)}
          </div>
          <span className="text-xs text-gray-500">{project.owner.firstName} {project.owner.lastName}</span>
        </div>
      )}
    </div>
  );
}
