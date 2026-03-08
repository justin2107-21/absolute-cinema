import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsValidSession(true);
    }

    // Listen for auth state change with recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/auth?mode=login'), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/30 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/30 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="relative z-10 p-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/auth')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="text-center space-y-2">
            <motion.img
              src={logoImage}
              alt="Absolute Cinema"
              className="h-20 w-20 rounded-full object-cover mx-auto mb-4 shadow-2xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <h1 className="text-4xl font-bold uppercase tracking-wider" style={{ fontFamily: "'Oswald', sans-serif" }}>
              <span className="text-foreground">Reset</span>
              <span className="text-primary ml-2">Password</span>
            </h1>
            <p className="text-muted-foreground">Enter your new password below</p>
          </div>

          {isSuccess ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-foreground font-medium">Password updated successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
            </motion.div>
          ) : !isValidSession ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">This link may be invalid or expired.</p>
              <Button onClick={() => navigate('/auth?mode=login')}>Back to Sign In</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
