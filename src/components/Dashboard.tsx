import { Plus, Edit2, Trash2, Play, Cloud, Search } from 'lucide-react';
import { Deck } from '../types';
import { motion } from 'motion/react';
import { useState } from 'react';

interface DashboardProps {
  decks: Deck[];
  onStudy: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  user: {
    name: string;
    streak: number;
    activity: string[];
    avatarColor?: string;
    avatarImage?: string;
  };
}

export function Dashboard({ decks, onStudy, onEdit, onDelete, onCreate, user }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return null;
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const filteredDecks = decks.filter(deck => 
    deck.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
          Welcome, <span className="text-accent-indigo">{user.name || 'Scholar'}</span>!
        </h1>
        <p className="text-gray-400 font-medium text-sm">Ready for your next breakthrough today?</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Your Decks</h2>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-tight">Manage your study collections</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent-indigo transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-subtle rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo transition-all shadow-sm"
            />
          </div>
          <button
            onClick={onCreate}
            className="w-full sm:w-auto px-6 py-2.5 bg-accent-indigo text-white rounded-xl shadow-lg shadow-accent-indigo/20 text-sm font-medium hover:bg-accent-indigo-dark transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Study Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDecks.map((deck, index) => (
          <motion.div
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 transition-all cursor-pointer"
            onClick={() => onStudy(deck.id)}
          >
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(deck.id); }}
                className="p-2 bg-bg-sidebar hover:bg-accent-indigo/20 text-gray-500 hover:text-accent-indigo rounded-lg transition-colors shadow-sm border border-border-subtle"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }}
                className="p-2 bg-bg-sidebar hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-colors shadow-sm border border-border-subtle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <div className="text-xs font-bold text-accent-indigo uppercase tracking-widest mb-2">Collection</div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-accent-indigo transition-colors line-clamp-1">
                {deck.name}
              </h3>
              <div className="flex flex-col gap-1 mt-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'} • {deck.progress * 100 >= 100 ? 'Mastered' : 'Learning'}
                </p>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                  {deck.lastStudied ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      Last Studied {formatRelativeTime(deck.lastStudied)}
                    </>
                  ) : deck.updatedAt ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-blue-400" />
                      Updated {formatRelativeTime(deck.updatedAt)}
                    </>
                  ) : (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      Created {formatRelativeTime(deck.createdAt)}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border-subtle">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
                <span>{deck.cards.filter(c => c.mastered).length} / {deck.cards.length} Mastered</span>
                <div className="flex items-center gap-2">
                  {deck.progress * 100 >= 60 && <span className="text-emerald-500 font-black animate-pulse">Good Job!</span>}
                  {deck.progress * 100 < 50 && deck.progress > 0 && <span className="text-rose-500 font-black">Try Again!</span>}
                  <span className={deck.progress * 100 >= 60 ? "text-emerald-600" : "text-gray-600"}>
                    {Math.round(deck.progress * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${deck.progress * 100}%` }}
                  className="h-full bg-gradient-to-r from-accent-indigo to-purple-500 rounded-full"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Cloud className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-tighter">Synced</span>
              </div>
              <div
                className="flex items-center gap-2 text-accent-indigo text-xs font-bold group-hover:gap-3 transition-all"
              >
                STUDY <Play className="w-3 h-3 fill-current" />
              </div>
            </div>
          </motion.div>
        ))}

        {filteredDecks.length === 0 && decks.length > 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-sm">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-500">No results found</h3>
            <p className="text-gray-400 mt-2">No decks match "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 px-6 py-2 text-accent-indigo font-bold hover:underline transition-all"
            >
              Clear search
            </button>
          </div>
        )}

        {decks.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-500">No decks yet</h3>
            <p className="text-gray-400 mt-2">Create your first deck to start learning</p>
            <button 
              onClick={onCreate}
              className="mt-6 px-6 py-2 bg-white text-accent-indigo font-bold border border-accent-indigo rounded-xl hover:bg-accent-indigo hover:text-white transition-all shadow-sm shadow-accent-indigo/5"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
