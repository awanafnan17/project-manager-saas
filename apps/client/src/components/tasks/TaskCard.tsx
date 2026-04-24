import { Badge } from '../ui/Badge';
import { getInitials, formatDate } from '../../lib/utils';
import { Calendar, User } from 'lucide-react';
import type { Task } from '../../types';

export function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-800/60 border border-white/5 rounded-lg p-3 cursor-pointer hover:border-brand-500/30 hover:bg-gray-800 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors leading-snug">
          {task.title}
        </h4>
        <Badge variant="priority" value={task.priority} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {task.assignee ? (
          <div className="w-6 h-6 rounded-full bg-brand-600/50 flex items-center justify-center text-[10px] font-bold text-white" title={`${task.assignee.firstName} ${task.assignee.lastName}`}>
            {getInitials(task.assignee.firstName, task.assignee.lastName)}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="w-3 h-3 text-gray-500" />
          </div>
        )}
      </div>
    </div>
  );
}
