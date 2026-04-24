import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { getInitials, formatDate } from '../lib/utils';
import type { Task, TaskStatus } from '../types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, fetchProject, loading: projLoading } = useProjectStore();
  const { fetchTasks, loading: taskLoading, tasks } = useTaskStore();

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>('todo');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchTasks(id);
    }
  }, [id]);

  // Keep selected task in sync with store
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  const handleCreateTask = (status: TaskStatus) => {
    setCreateTaskStatus(status);
    setShowCreateTask(true);
  };

  if (projLoading && !currentProject) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-500 mt-3">Loading project...</p>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Project not found</p>
        <Button variant="secondary" onClick={() => navigate('/projects')} className="mt-3">Back to Projects</Button>
      </div>
    );
  }

  const members = currentProject.members || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{currentProject.name}</h1>
              <Badge value={currentProject.status} />
              <Badge variant="priority" value={currentProject.priority} />
            </div>
            {currentProject.description && (
              <p className="text-gray-400 text-sm max-w-2xl">{currentProject.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {currentProject.startDate && <span>Start: {formatDate(currentProject.startDate)}</span>}
              {currentProject.endDate && <span>End: {formatDate(currentProject.endDate)}</span>}
              <span>{tasks.length} tasks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Team Members ({members.length})
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2 bg-white/5 rounded-full pl-1 pr-3 py-1">
              <div className="w-6 h-6 rounded-full bg-brand-600/50 flex items-center justify-center text-[10px] font-bold text-white">
                {getInitials(m.user.firstName, m.user.lastName)}
              </div>
              <span className="text-xs text-gray-300">{m.user.firstName} {m.user.lastName}</span>
              <span className="text-[10px] text-gray-500 capitalize">({m.role})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      {taskLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-3">Loading tasks...</p>
        </div>
      ) : (
        <KanbanBoard
          members={members}
          onCreateTask={handleCreateTask}
          onSelectTask={setSelectedTask}
        />
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={currentProject.id}
        members={members}
        defaultStatus={createTaskStatus}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        members={members}
      />
    </div>
  );
}
