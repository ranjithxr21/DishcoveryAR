import React, { useState } from 'react';
import { api } from '../services/api';
import { User, ViewMode } from '../types';
import { Loader2, KeyRound, ArrowLeft, Mail, CheckCircle, UserCheck } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (view: ViewMode) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await api.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
      setEmail('demo@gastrovision.com');
      setPassword('demo123');
      setError('');
      setIsLoading(true);
      try {
          // Small delay to show filling
          await new Promise(r => setTimeout(r, 500));
          const user = await api.login('demo@gastrovision.com', 'demo123');
          onLoginSuccess(user);
      } catch (err) {
          setError("Demo login failed. Server might be restarting.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setResetStatus('sending');
      // Simulate API call - To be configured with backend later
      setTimeout(() => {
          setResetStatus('success');
      }, 1500);
  };

  if (showForgotPassword) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white font-sans p-4">
            <div className="w-full max-w-sm">
                <button 
                    onClick={() => { setShowForgotPassword(false); setResetStatus('idle'); setError(''); }} 
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm"
                >
                    <ArrowLeft size={16} /> Back to Login
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
                    <p className="text-gray-400">Enter your email to receive reset instructions.</p>
                </div>

                <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                    {resetStatus === 'success' ? (
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                                <CheckCircle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                We have sent password reset instructions to <strong>{resetEmail}</strong>.
                            </p>
                            <button 
                                onClick={() => { setShowForgotPassword(false); setResetStatus('idle'); }}
                                className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors"
                            >
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleResetSubmit} className="space-y-6">
                            <div>
                                <label className="text-sm font-medium text-gray-300">Email Address</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                    className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={resetStatus === 'sending'}
                                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-900/50 transition-all disabled:opacity-50"
                            >
                                {resetStatus === 'sending' ? <Loader2 className="animate-spin" size={20} /> : <Mail size={18} />}
                                {resetStatus === 'sending' ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white font-sans p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => onNavigate(ViewMode.LANDING)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm">
            <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="text-center mb-8">
            <img src="/logo/Dishcovery_logo.png" alt="Dishcovery" className="h-12 mx-auto mb-4" />
            <p className="text-gray-400 mt-2">Sign in to your dashboard</p>
        </div>
        
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-gray-300">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="admin@example.com"
                    />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-gray-300">Password</label>
                        <button 
                            type="button" 
                            onClick={() => setShowForgotPassword(true)} 
                            className="text-xs text-brand-400 hover:text-brand-300 hover:underline"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="••••••••"
                    />
                </div>
                
                {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-500/20">{error}</p>}

                <div className="space-y-3">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-gray-600"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={18} />}
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                    
                    {/* <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">OR</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDemoLogin}
                        disabled={isLoading}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-gray-600"
                    >
                        <UserCheck size={18} /> Try Demo Account
                    </button> */}
                </div>
            </form>
        </div>
        
        <p className="text-sm text-gray-400 text-center mt-6">
            Don't have an account? <button onClick={() => onNavigate(ViewMode.SIGNUP)} className="text-brand-400 hover:text-brand-300 font-bold hover:underline">Sign Up</button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;