import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { formatDate } from '../../lib/utils';
import { useTaskStore } from '../../stores/taskStore';
import { KANBAN_COLUMNS } from '../../lib/utils';
import type { Task, ProjectMember, TaskStatus } from '../../types';
import { Calendar, Trash2 } from 'lucide-react';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  members: ProjectMember[];
}

export function TaskDetailModal({ task, isOpen, onClose, members }: Props) {
  const { updateTaskStatus, assignTask, deleteTask } = useTaskStore();

  if (!task) return null;

  const handleStatusChange = async (status: string) => {
    await updateTaskStatus(task.id, status as TaskStatus);
  };

  const handleAssign = async (assigneeId: string) => {
    if (assigneeId) await assignTask(task.id, assigneeId);
  };

  const handleDelete = async () => {
    if (confirm('Delete this task? This cannot be undone.')) {
      await deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task.title} size="lg">
      <div className="space-y-5">
        {/* Status & Priority */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="input-field text-sm"
            >
              {KANBAN_COLUMNS.map((col) => (
                <option key={col.key} value={col.key}>{col.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Priority</label>
            <Badge variant="priority" value={task.priority} className="block mt-1" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Assignee</label>
            <select
              value={task.assigneeId || ''}
              onChange={(e) => handleAssign(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.firstName} {m.user.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          {task.dueDate && (
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Due: {formatDate(task.dueDate)}</span>
          )}
          {task.reporter && (
            <span>Reporter: {task.reporter.firstName} {task.reporter.lastName}</span>
          )}
          <span>Created: {formatDate(task.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-3 border-t border-white/5">
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
