/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { INITIAL_DECKS, Deck, View } from './types';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { StudySession } from './components/StudySession';
import { DeckEditor } from './components/DeckEditor';
import { ProfileView } from './components/ProfileView';

export default function App() {
  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [view, setView] = useState<View>('auth');
  const [allUserDecks, setAllUserDecks] = useState<{ [email: string]: Deck[] }>(() => {
    const saved = localStorage.getItem('flashstudy_all_user_decks');
    return saved ? JSON.parse(saved) : {};
  });
  const [decks, setDecks] = useState<Deck[]>(() => {
    const savedUser = localStorage.getItem('flashstudy_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.email) {
        const savedAllDecks = localStorage.getItem('flashstudy_all_user_decks');
        const allDecks = savedAllDecks ? JSON.parse(savedAllDecks) : {};
        return allDecks[parsedUser.email] || [];
      }
    }
    return [];
  });
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showStreakPopover, setShowStreakPopover] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<{ 
    name: string; 
    email: string; 
    password?: string; // Stored for verification
    streak: number; 
    lastLogin: string; 
    activity: string[]; 
    bio?: string; 
    avatarColor?: string; 
    avatarImage?: string;
  }[]>(() => {
    const saved = localStorage.getItem('flashstudy_registered_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [user, setUser] = useState<{ 
    name: string; 
    email: string; 
    streak: number; 
    lastLogin: string;
    activity: string[];
    bio?: string;
    avatarColor?: string;
    avatarImage?: string;
  }>(() => {
    const saved = localStorage.getItem('flashstudy_user');
    return saved ? JSON.parse(saved) : { 
      name: 'User', 
      email: '', 
      streak: 0, 
      lastLogin: '', 
      activity: [], 
      bio: '', 
      avatarColor: 'bg-accent-indigo' 
    };
  });

  useEffect(() => {
    if (isAuthenticated && user.email) {
      setAllUserDecks(prev => ({
        ...prev,
        [user.email]: decks
      }));
    }
  }, [decks, user.email, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('flashstudy_all_user_decks', JSON.stringify(allUserDecks));
  }, [allUserDecks]);

  useEffect(() => {
    localStorage.setItem('flashstudy_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('flashstudy_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (isAuthenticated) {
      const today = getLocalDate();
      const lastLogin = user.lastLogin;
      
      if (lastLogin && lastLogin !== today) {
        const lastDate = new Date(lastLogin);
        const todayDate = new Date(today);
        
        const oneDay = 24 * 60 * 60 * 1000;
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / oneDay);
        
        if (diffDays > 1) {
          // If more than 24 hours (actually more than 1 day boundary) has passed, streak is broken
          setUser(prev => ({ ...prev, streak: 0 }));
        }
      }
    }
  }, [isAuthenticated, user.lastLogin]);

  useEffect(() => {
    if (showStreakPopover) {
      const handleClose = () => setShowStreakPopover(false);
      window.addEventListener('click', handleClose);
      return () => window.removeEventListener('click', handleClose);
    }
  }, [showStreakPopover]);

  const handleAuth = (userData: { name: string; email: string; password?: string }, type: 'login' | 'signup'): string | null => {
    const today = getLocalDate();
    
    if (type === 'signup') {
      const exists = registeredUsers.find(u => u.email === userData.email);
      if (exists) return "Email already registered. Please sign in.";
      
      const newUser = {
        ...userData,
        streak: 1,
        lastLogin: today,
        activity: [today],
        bio: '',
        avatarColor: 'bg-accent-indigo'
      };
      
      setRegisteredUsers([...registeredUsers, newUser]);
      setUser(newUser);
      setDecks([]); // New account starts with no decks
      setIsAuthenticated(true);
      setView('dashboard');
      return null;
    } else {
      // Login
      const existingUser = registeredUsers.find(u => u.email === userData.email);
      if (!existingUser) return "No account found with this email. Please sign up first.";
      
      // Password check
      if (userData.password && existingUser.password && userData.password !== existingUser.password) {
        return "Incorrect password. Please try again.";
      }
      
      // Update streak and activity for the existing user
      let newStreak = existingUser.streak;
      const newActivity = [...(existingUser.activity || [])];

      if (!newActivity.includes(today)) {
        newActivity.push(today);
      }

      if (!existingUser.lastLogin) {
        newStreak = 1;
      } else {
        const lastDate = new Date(existingUser.lastLogin);
        const todayDate = new Date(today);
        
        const oneDay = 24 * 60 * 60 * 1000;
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / oneDay);

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      const updatedUser = {
        ...existingUser,
        streak: newStreak,
        lastLogin: today,
        activity: newActivity
      };

      // Update both current user and the list
      setUser(updatedUser);
      setRegisteredUsers(registeredUsers.map(u => u.email === userData.email ? updatedUser : u));
      
      // Load this specific user's decks
      setDecks(allUserDecks[userData.email] || []);
      
      setIsAuthenticated(true);
      setView('dashboard');
      return null;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser({ 
      name: 'User', 
      email: '', 
      streak: 0, 
      lastLogin: '', 
      activity: [], 
      bio: '', 
      avatarColor: 'bg-accent-indigo' 
    });
    setDecks([]); // Clear decks on logout
    setView('auth');
  };

  const addDeck = (newDeck: Deck) => {
    const deckWithTime = { ...newDeck, updatedAt: Date.now() };
    setDecks([...decks, deckWithTime]);
    setView('dashboard');
  };

  const updateDeck = (updatedDeck: Deck) => {
    const deckWithTime = { ...updatedDeck, updatedAt: Date.now() };
    setDecks(decks.map(d => d.id === updatedDeck.id ? deckWithTime : d));
    setView('dashboard');
  };

  const updateProfile = (data: { name: string; bio: string; avatarColor: string; avatarImage?: string }) => {
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    setRegisteredUsers(registeredUsers.map(u => u.email === user.email ? updatedUser : u));
    setView('dashboard');
  };

  const deleteAccount = () => {
    const updatedAllDecks = { ...allUserDecks };
    delete updatedAllDecks[user.email];
    setAllUserDecks(updatedAllDecks);
    
    setRegisteredUsers(registeredUsers.filter(u => u.email !== user.email));
    setIsAuthenticated(false);
    setDecks([]);
    setView('auth');
    // Also clear the current user from storage
    setUser({ 
      name: 'User', 
      email: '', 
      streak: 0, 
      lastLogin: '', 
      activity: [], 
      bio: '', 
      avatarColor: 'bg-accent-indigo' 
    });
  };

  const updateStreakDebug = (daysAgo: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    
    // Convert target date to local date string to match our logic
    const local = new Date(targetDate);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    const dateStr = local.toISOString().split('T')[0];
    
    const updatedUser = { ...user, lastLogin: dateStr };
    setUser(updatedUser);
    setRegisteredUsers(registeredUsers.map(u => u.email === user.email ? updatedUser : u));
  };

  const deleteDeck = (id: string) => {
    setDecks(decks.filter(d => d.id !== id));
  };

  const startStudy = (id: string) => {
    setCurrentDeckId(id);
    setView('study');
  };

  const handleFinishStudy = (deckId: string, masteredCardIds: string[]) => {
    const today = getLocalDate();
    
    // Update activity and potentially streak if it's a new day
    const activity = user.activity || [];
    if (!activity.includes(today)) {
      const lastDate = new Date(user.lastLogin);
      const todayDate = new Date(today);
      const oneDay = 24 * 60 * 60 * 1000;
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffTime / oneDay);

      let newStreak = user.streak;
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;

      const updatedUser = { 
        ...user, 
        activity: [...activity, today], 
        lastLogin: today,
        streak: newStreak
      };
      
      setUser(updatedUser);
      setRegisteredUsers(registeredUsers.map(u => u.email === user.email ? updatedUser : u));
    }

    setDecks(prevDecks => prevDecks.map(deck => {
      if (deck.id === deckId) {
        const updatedCards = deck.cards.map(card => ({
          ...card,
          mastered: masteredCardIds.includes(card.id)
        }));
        const progress = updatedCards.filter(c => c.mastered).length / updatedCards.length;
        return { ...deck, cards: updatedCards, progress, lastStudied: Date.now() };
      }
      return deck;
    }));
  };

  const openEditor = (id: string | null) => {
    setCurrentDeckId(id);
    setView('edit');
  };

  const currentDeck = decks.find(d => d.id === currentDeckId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <AnimatePresence mode="wait">
        {view === 'auth' || view === 'signup' ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1"
          >
            <AuthScreen 
              onAuth={handleAuth} 
              isSignUp={view === 'signup'} 
              onToggle={() => setView(view === 'auth' ? 'signup' : 'auth')} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 flex">
              {/* Sidebar */}
              <aside className="w-72 bg-bg-sidebar border-r border-border-subtle flex flex-col h-screen sticky top-0 hidden lg:flex">
                <div className="p-6 pb-4">
                  <div 
                    className="flex items-center justify-between mb-8"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="flex items-center gap-2 cursor-pointer group" 
                        onClick={() => setView('dashboard')}
                      >
                        <div className="w-8 h-8 bg-accent-indigo rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-accent-indigo/20">F</div>
                        <h1 className="text-xl font-semibold tracking-tight text-gray-900 group-hover:text-accent-indigo transition-colors">FlashStudy</h1>
                      </div>
                      {user.streak > 0 && (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setShowStreakPopover(!showStreakPopover)}
                            className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-xs font-bold border border-orange-100 animate-pulse transition-transform active:scale-95 hover:bg-orange-100"
                          >
                            <span>🔥</span>
                            {user.streak}
                          </button>

                          <AnimatePresence>
                            {showStreakPopover && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute left-0 mt-3 w-56 bg-white border border-border-subtle rounded-2xl p-4 shadow-2xl z-50 overflow-hidden"
                              >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-rose-500" />
                                <div className="flex flex-col items-center text-center gap-2 pt-2">
                                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shadow-md">
                                    <span className="text-xl">🔥</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-2xl font-black text-gray-900 tracking-tight">{user.streak} DAY STREAK</span>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">Persistence is key</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => openEditor(null)}
                    className="w-full bg-accent-indigo hover:bg-accent-indigo-dark text-white py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 mb-2 transition-all shadow-lg shadow-accent-indigo/10"
                  >
                    <span className="text-xl">+</span> New Deck
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scroll">
                  <nav className="space-y-1">
                    {decks.map(deck => (
                      <div key={deck.id} className="group relative">
                        <button
                          onClick={() => startStudy(deck.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                            currentDeckId === deck.id && view === 'study'
                              ? 'bg-accent-indigo/10 border border-accent-indigo/30 text-accent-indigo'
                              : 'hover:bg-accent-indigo/5 text-gray-600'
                          }`}
                        >
                          <span className="font-medium truncate text-left">{deck.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            currentDeckId === deck.id && view === 'study' ? 'bg-accent-indigo/20' : 'bg-border-subtle'
                          }`}>
                            {deck.cards.length}
                          </span>
                        </button>
                      </div>
                    ))}
                  </nav>
                </div>

                <button 
                  onClick={() => setView('profile')}
                  className={`mt-auto p-6 border-t border-border-subtle hover:bg-black/5 transition-colors text-left w-full ${view === 'profile' ? 'bg-bg-card' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden ${user.avatarColor || 'bg-accent-indigo'}`}>
                      {user.avatarImage ? (
                        <img src={user.avatarImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{user.name}</p>
                    <div onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="ml-auto text-gray-500 hover:text-red-500 transition-colors p-1">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    </div>
                  </div>
                </button>
              </aside>

              {/* Main Content Area */}
              <main className="flex-1 flex flex-col min-h-full bg-bg-base">
                {/* Mobile Header */}
                {view !== 'study' && (
                  <div className="lg:hidden flex items-center justify-between p-4 border-b border-border-subtle bg-bg-sidebar sticky top-0 z-20">
                    <div 
                      className="flex items-center gap-2 cursor-pointer" 
                      onClick={() => setView('dashboard')}
                    >
                      <div className="w-8 h-8 bg-accent-indigo rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-accent-indigo/20 text-sm">F</div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900">FlashStudy</h1>
                        {user.streak > 0 && (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setShowStreakPopover(!showStreakPopover)}
                              className="flex items-center gap-0.5 bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border border-orange-100"
                            >
                              <span>🔥</span>
                              {user.streak}
                            </button>
                            
                            <AnimatePresence>
                              {showStreakPopover && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute left-0 mt-2 w-44 bg-white border border-border-subtle rounded-xl p-3 shadow-2xl z-50 text-center"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-lg font-black text-gray-900 tracking-tight leading-none">{user.streak} DAY STREAK</span>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Keep it up!</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setView('profile')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold border-2 overflow-hidden ${view === 'profile' ? 'border-accent-indigo' : 'border-transparent'} ${user.avatarColor || 'bg-accent-indigo'}`}
                      >
                        {user.avatarImage ? (
                          <img src={user.avatarImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 md:p-12">
                  {view === 'dashboard' && (
                    <Dashboard 
                      decks={decks} 
                      onStudy={startStudy} 
                      onEdit={openEditor} 
                      onDelete={deleteDeck} 
                      onCreate={() => openEditor(null)}
                      user={user}
                    />
                  )}
                  {view === 'study' && currentDeck && (
                    <StudySession 
                      deck={currentDeck} 
                      onBack={() => setView('dashboard')} 
                      onFinish={handleFinishStudy}
                    />
                  )}
                  {view === 'edit' && (
                    <DeckEditor 
                      deck={currentDeck} 
                      onSave={currentDeck ? updateDeck : addDeck} 
                      onCancel={() => setView('dashboard')} 
                    />
                  )}
                  {view === 'profile' && (
                    <ProfileView 
                      user={user} 
                      onSave={updateProfile} 
                      onBack={() => setView('dashboard')} 
                      onUpdateStreak={updateStreakDebug}
                      onDeleteAccount={deleteAccount}
                    />
                  )}
                </div>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

