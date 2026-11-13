import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button, Card, Field, inputClass } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../lib/home';
import { Role } from '../../types';

const loginSchema = z.object({
  phone: z.string().min(10, 'Enter your mobile number'),
  password: z.string().min(1, 'Enter your password'),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Enter your name'),
  role: z.enum(['CUSTOMER', 'SALON_OWNER']),
  password: z.string().min(8, 'Use at least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
});

function afterLogin(role: Role, next: string | null) {
  if (role === 'CUSTOMER' && next && next.startsWith('/') && !next.startsWith('//')) return next;
  return homeFor(role);
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp] = useState('');
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  if (auth.user) return <Navigate to={afterLogin(auth.user.role, params.get('next'))} replace />;

  return (
    <main className="mx-auto grid max-w-md px-4 py-12">
      <Card>
        <h1 className="font-display text-3xl">Welcome back</h1>
        <form
          className="mt-5 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError('');
            try {
              const signedIn = await auth.login(values.phone, values.password);
              navigate(afterLogin(signedIn.role, params.get('next')));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Login failed');
            }
          })}
        >
          <Field label="Mobile number" error={form.formState.errors.phone?.message}>
            <input className={inputClass} {...form.register('phone')} />
          </Field>
          <Field label="Password" error={form.formState.errors.password?.message}>
            <input className={inputClass} type="password" {...form.register('password')} />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full">Log in</Button>
        </form>
        <form
          className="mt-6 space-y-3 border-t border-line pt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const code = await auth.requestOtp(otpPhone);
            setDevCode(code || '');
          }}
        >
          <Field label="Or request a login OTP">
            <input className={inputClass} value={otpPhone} onChange={(event) => setOtpPhone(event.target.value)} />
          </Field>
          {devCode ? <p className="rounded-2xl bg-canvas p-3 text-sm">Development code: {devCode}</p> : null}
          <input className={inputClass} placeholder="6-digit code" value={otp} onChange={(event) => setOtp(event.target.value)} />
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              const signedIn = await auth.verifyOtp(otpPhone, otp);
              navigate(afterLogin(signedIn.role, params.get('next')));
            }}
          >
            Verify OTP
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          New here? <Link to="/register" className="font-semibold text-primary">Create an account</Link>
        </p>
      </Card>
    </main>
  );
}

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CUSTOMER' },
  });

  return (
    <main className="mx-auto grid max-w-md px-4 py-12">
      <Card>
        <h1 className="font-display text-3xl">Create your account</h1>
        <form
          className="mt-5 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError('');
            try {
              const signedIn = await auth.register(values);
              navigate(homeFor(signedIn.role));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not register');
            }
          })}
        >
          <Field label="Name" error={form.formState.errors.name?.message}>
            <input className={inputClass} {...form.register('name')} />
          </Field>
          <Field label="Mobile number" error={form.formState.errors.phone?.message}>
            <input className={inputClass} {...form.register('phone')} />
          </Field>
          <Field label="Password" error={form.formState.errors.password?.message}>
            <input className={inputClass} type="password" {...form.register('password')} />
          </Field>
          <Field label="I am joining as">
            <select className={inputClass} {...form.register('role')}>
              <option value="CUSTOMER">A customer</option>
              <option value="SALON_OWNER">A salon partner</option>
            </select>
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full">Create account</Button>
        </form>
      </Card>
    </main>
  );
}
