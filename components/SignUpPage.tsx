import React, { useState } from 'react';
import { api } from '../services/api';
import { User, ViewMode } from '../types';
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react';

interface SignUpPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (view: ViewMode) => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
        setError("Passwords don't match");
        return;
    }

    if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
    }

    setIsLoading(true);
    try {
      const user = await api.register(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white font-sans p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => onNavigate(ViewMode.LANDING)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm">
            <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="text-center mb-8">
            <img src="/logo/Dishcovery_logo.png" alt="Dishcovery" className="h-12 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">Join Dishcovery ARfor free.</p>
        </div>
        
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="text-sm font-medium text-gray-300">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="••••••••"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="••••••••"
                    />
                </div>
                
                {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-500/20">{error}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-900/50 transition-all disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={18} />}
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </div>
            </form>
        </div>
        
        <p className="text-sm text-gray-400 text-center mt-6">
            Already have an account? <button onClick={() => onNavigate(ViewMode.LOGIN)} className="text-brand-400 hover:text-brand-300 font-bold hover:underline">Sign In</button>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;