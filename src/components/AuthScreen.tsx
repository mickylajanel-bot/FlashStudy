import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onAuth: (data: { name: string; email: string; password?: string }, type: 'login' | 'signup') => Promise<string | null>;
  onToggle: () => void;
  isSignUp: boolean;
}

export function AuthScreen({ onAuth, onToggle, isSignUp }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const authError = await onAuth(
        { name: name || email.split('@')[0], email, password }, 
        isSignUp ? 'signup' : 'login'
      );
      if (authError) {
        setError(authError);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-base">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-accent-indigo rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-2xl shadow-accent-indigo/40"
          >
            F
          </motion.div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2 text-gray-900">
            {isSignUp ? "Create Account" : "FlashStudy"}
          </h1>
          <p className="text-gray-500 font-light text-lg">
            {isSignUp ? "Start your journey to mastery" : "Continue your study ritual"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-rose-500 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-12 pr-4 py-3.5 bg-bg-sidebar border border-border-subtle rounded-xl focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo outline-none transition-all placeholder:text-gray-400 text-gray-900"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="@gmail.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-bg-sidebar border border-border-subtle rounded-xl focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo outline-none transition-all placeholder:text-gray-400 text-gray-900"
                  required
                />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-bg-sidebar border border-border-subtle rounded-xl focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo outline-none transition-all placeholder:text-gray-400 text-gray-900"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-accent-indigo hover:bg-accent-indigo-dark text-white font-semibold rounded-xl shadow-lg shadow-accent-indigo/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <>
                {isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button
            onClick={() => {
              setError(null);
              onToggle();
            }}
            className="text-gray-500 text-sm hover:text-accent-indigo transition-colors"
          >
            {isSignUp ? "Already have an account?" : "Need an account?"} <span className="text-accent-indigo font-bold underline underline-offset-4 decoration-1">
              {isSignUp ? "Sign In" : "Sign Up"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
