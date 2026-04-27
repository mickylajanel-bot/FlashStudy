import React, { useState } from 'react';
import { User, Mail, Shield, Save, ChevronLeft, Camera, Layout, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileViewProps {
  user: {
    name: string;
    email: string;
    bio?: string;
    avatarColor?: string;
    avatarImage?: string;
  };
  onSave: (data: { name: string; bio: string; avatarColor: string; avatarImage?: string }) => void;
  onBack: () => void;
  onUpdateStreak?: (daysAgo: number) => void;
  onDeleteAccount?: () => void;
}

const COLORS = [
  'bg-accent-indigo',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-purple-600',
  'bg-cyan-500',
  'bg-orange-500'
];

export function ProfileView({ user, onSave, onBack, onUpdateStreak, onDeleteAccount }: ProfileViewProps) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || 'bg-accent-indigo');
  const [avatarImage, setAvatarImage] = useState(user.avatarImage || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, bio, avatarColor, avatarImage });
  };

  return (
    <div className="max-w-2xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-accent-indigo font-semibold transition-all group"
        >
          <div className="p-2 rounded-lg bg-bg-sidebar border border-border-subtle group-hover:border-accent-indigo shadow-lg shadow-gray-200/20 text-gray-500 group-hover:text-accent-indigo">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 whitespace-nowrap">
          User Settings
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="bg-bg-sidebar border border-border-subtle rounded-3xl p-6 flex flex-col items-center">
          <div className={`relative group mb-4`}>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange}
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-24 h-24 md:w-32 md:h-32 ${avatarColor} rounded-full flex items-center justify-center text-white text-3xl md:text-5xl font-bold shadow-2xl shadow-accent-indigo/20 overflow-hidden cursor-pointer relative`}
            >
              {avatarImage ? (
                <img src={avatarImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white w-8 h-8" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`w-8 h-8 ${color} rounded-full transition-all transform hover:scale-110 active:scale-95 ${avatarColor === color ? 'ring-4 ring-offset-2 ring-accent-indigo' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-accent-indigo uppercase tracking-[0.2em] ml-1">Full Identity</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What shall we call you?"
                className="w-full pl-12 pr-4 py-3 bg-bg-sidebar border border-border-subtle rounded-2xl focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-accent-indigo uppercase tracking-[0.2em] ml-1">E-Mail Address (Read-Only)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-border-subtle rounded-2xl text-gray-400 cursor-not-allowed italic"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-accent-indigo uppercase tracking-[0.2em] ml-1">Short Biography</label>
            <div className="relative">
              <Layout className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a bit about your learning journey..."
                className="w-full pl-12 pr-4 py-3 bg-bg-sidebar border border-border-subtle rounded-2xl focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300 min-h-[100px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Streak Debugging (Verification) */}
        <div className="pt-10 mt-10 border-t border-border-subtle">
          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Logic Verification Tool</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateStreak && onUpdateStreak(1)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-500 hover:border-accent-indigo hover:text-accent-indigo transition-all text-center uppercase tracking-wider"
              >
                Set Last Login: Yesterday
              </button>
              <button
                type="button"
                onClick={() => onUpdateStreak && onUpdateStreak(2)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-500 hover:border-red-400 hover:text-red-500 transition-all text-center uppercase tracking-wider"
              >
                Set Last Login: 2 Days Ago
              </button>
            </div>
            <p className="mt-3 text-[9px] text-gray-400 text-center italic">
              * Use these to verify that the streak accurately increases or resets based on time.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-12 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-border-subtle">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-rose-400 hover:text-rose-500 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Erase Identity
          </button>

          <div className="flex gap-6">
            <button
              type="button"
              onClick={onBack}
              className="px-8 py-3 text-gray-500 font-bold text-xs tracking-widest uppercase hover:text-gray-900 transition-all font-display"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-12 py-3 bg-accent-indigo text-white font-bold text-xs tracking-widest uppercase rounded-xl shadow-xl shadow-accent-indigo/10 hover:bg-accent-indigo-dark transition-all active:scale-[0.98] flex items-center gap-3 font-display"
            >
              <Save className="w-4 h-4" />
              Save Profile
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden relative"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
                  <p className="text-gray-500 text-sm">
                    This will permanently erase your learning history and all collections. This action is irreversible.
                  </p>
                </div>
                <div className="pt-4 flex flex-col gap-2">
                  <button
                    onClick={() => onDeleteAccount && onDeleteAccount()}
                    className="w-full py-4 bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95 text-xs uppercase tracking-widest"
                  >
                    Yes, Erase Everything
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-4 text-gray-400 font-bold hover:text-gray-900 transition-all text-xs uppercase tracking-widest"
                  >
                    I've Changed My Mind
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
