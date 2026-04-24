import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useProjectStore } from '../../stores/projectStore';

const schema = z.object({
  name: z.string().min(2, 'Name required (min 2 chars)').max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateProjectModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createProject = useProjectStore((s) => s.createProject);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await createProject(data);
      reset();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Project Name" placeholder="e.g. Website Redesign" error={errors.name?.message} {...register('name')} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">Description</label>
          <textarea {...register('description')} rows={3} placeholder="Brief project description..." className="input-field w-full resize-none" />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">Priority</label>
          <select {...register('priority')} className="input-field w-full">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="Start Date" {...register('startDate')} />
          <Input type="date" label="End Date" {...register('endDate')} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Project</Button>
        </div>
      </form>
    </Modal>
  );
}
