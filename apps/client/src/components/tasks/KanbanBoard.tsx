import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { KANBAN_COLUMNS } from '../../lib/utils';
import { useTaskStore } from '../../stores/taskStore';
import type { Task, ProjectMember, TaskStatus } from '../../types';

interface Props {
  members: ProjectMember[];
  onCreateTask: (status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
}

export function KanbanBoard({ members: _members, onCreateTask, onSelectTask }: Props) {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);
        return (
          <KanbanColumn
            key={col.key}
            column={col}
            tasks={columnTasks}
            onCreateTask={() => onCreateTask(col.key as TaskStatus)}
            onSelectTask={onSelectTask}
            onDropTask={(taskId) => updateTaskStatus(taskId, col.key as TaskStatus)}
          />
        );
      })}
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onCreateTask,
  onSelectTask,
  onDropTask,
}: {
  column: { key: string; label: string; color: string };
  tasks: Task[];
  onCreateTask: () => void;
  onSelectTask: (task: Task) => void;
  onDropTask: (taskId: string) => void;
}) {
  const [isDragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-xl bg-gray-900/40 border-t-2 ${column.color} ${isDragOver ? 'ring-2 ring-brand-500/30' : ''} transition-all`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) onDropTask(taskId);
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-300">{column.label}</h3>
          <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{tasks.length}</span>
        </div>
        <button
          onClick={onCreateTask}
          className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          title={`Add task to ${column.label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 px-3 pb-3 space-y-2 min-h-[100px] max-h-[calc(100vh-320px)] overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
          >
            <TaskCard task={task} onClick={() => onSelectTask(task)} />
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">No tasks</div>
        )}
      </div>
    </div>
  );
}
