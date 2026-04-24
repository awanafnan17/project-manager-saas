import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderKanban } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';

const schema = z.object({
  organizationName: z.string().min(2, 'Organization name required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const [error, setError] = useState('');
  const registerUser = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await registerUser(data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <FolderKanban className="w-12 h-12 text-brand-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Create your workspace</h1>
          <p className="text-gray-400 mt-1">Get started with your team</p>
        </div>

        <div className="glass-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Organization Name" placeholder="Acme Inc." error={errors.organizationName?.message} {...register('organizationName')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" placeholder="John" error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last Name" placeholder="Doe" error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="Min 8 characters" error={errors.password?.message} {...register('password')} />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">Create Workspace</Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
