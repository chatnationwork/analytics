'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, UserPlus, Lock } from 'lucide-react';

interface InviteInfo {
  valid: boolean;
  email?: string;
  role?: string;
  tenantName?: string;
  expired?: boolean;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'claiming' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link. No token provided.');
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/dashboard/invitations/validate?token=${token}`);
      const response = await res.json();
      
      // Handle wrapped response
      const info = response.data || response;
      setInviteInfo(info);
      
      if (!info.valid) {
        setStatus('error');
        setMessage(info.expired ? 'This invitation has expired.' : 'Invalid invitation link.');
      } else {
        setStatus('ready');
        // Pre-fill name from email
        if (info.email) {
          setName(info.email.split('@')[0]);
        }
      }
    } catch (e) {
      setStatus('error');
      setMessage('Could not validate invitation.');
    }
  };

  const claimInvitation = async () => {
    if (!password) {
      setMessage('Please enter a password.');
      return;
    }
    
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    
    setStatus('claiming');
    setMessage('');
    
    try {
      const res = await fetch('/api/dashboard/invitations/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name: name || undefined }),
      });

      const response = await res.json();
      const data = response.data || response;
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to accept invitation');
      }

      // Now log in with the new credentials
      const loginRes = await fetch('/api/dashboard/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteInfo?.email, password }),
      });
      
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        // Set cookie for auth
        document.cookie = `accessToken=${loginData.data?.accessToken || loginData.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
      }

      setStatus('success');
      setMessage('Welcome! Your account has been created.');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => router.push('/'), 2000);
    } catch (e: any) {
      setStatus('ready');
      setMessage(e.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Validating Invitation...'}
            {status === 'ready' && 'Join Workspace'}
            {status === 'claiming' && 'Creating Your Account...'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Invitation Error'}
          </CardTitle>
          {status === 'ready' && inviteInfo && (
            <CardDescription>
              You've been invited to join <strong>{inviteInfo.tenantName}</strong>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          )}

          {status === 'ready' && inviteInfo && (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="text-center space-y-1 mb-2">
                <p className="font-medium">{inviteInfo.email}</p>
                <p className="text-sm text-gray-500">
                  Role: <span className="capitalize">{inviteInfo.role}</span>
                </p>
              </div>

              <div className="w-full space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Your Name
                  </label>
                  <Input 
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="password"
                      placeholder="At least 8 characters"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="password"
                      placeholder="Confirm password"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                {message && (
                  <p className="text-sm text-red-500 text-center">{message}</p>
                )}
                
                <Button onClick={claimInvitation} size="lg" className="w-full">
                  Create Account & Join
                </Button>
              </div>
            </>
          )}

          {status === 'claiming' && (
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center text-gray-600 dark:text-gray-400">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-gray-600 dark:text-gray-400">{message}</p>
              <Button variant="outline" onClick={() => router.push('/login')}>
                Go to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
