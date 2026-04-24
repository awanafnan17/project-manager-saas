import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTaskStore } from '../../stores/taskStore';
import type { ProjectMember, TaskStatus } from '../../types';

const schema = z.object({
  title: z.string().min(3, 'Title required (min 3 chars)').max(500),
  description: z.string().max(10000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  members: ProjectMember[];
  defaultStatus?: TaskStatus;
}

export function CreateTaskModal({ isOpen, onClose, projectId, members, defaultStatus = 'todo' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createTask = useTaskStore((s) => s.createTask);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await createTask(projectId, {
        ...data,
        status: defaultStatus,
        assigneeId: data.assigneeId || undefined,
        dueDate: data.dueDate || undefined,
      });
      reset();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Task Title" placeholder="e.g. Implement user authentication" error={errors.title?.message} {...register('title')} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">Description</label>
          <textarea {...register('description')} rows={3} placeholder="Task details..." className="input-field w-full resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Priority</label>
            <select {...register('priority')} className="input-field w-full">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Assignee</label>
            <select {...register('assigneeId')} className="input-field w-full">
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.firstName} {m.user.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Input type="date" label="Due Date" {...register('dueDate')} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}
