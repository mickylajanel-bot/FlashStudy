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
import { auth } from './lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  deleteDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [view, setView] = useState<View>('auth');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ 
    name: string; 
    email: string; 
    lastLogin: string;
    activity: string[];
    bio?: string;
    avatarColor?: string;
    avatarImage?: string;
  }>({ 
    name: '', 
    email: '', 
    lastLogin: '', 
    activity: [], 
    bio: '', 
    avatarColor: 'bg-accent-indigo' 
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Listener for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        // Initial user state from Auth
        const initialName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Scholar';
        setUser(prev => ({
          ...prev,
          name: prev.name && prev.name !== 'User' ? prev.name : initialName,
          email: firebaseUser.email || prev.email
        }));
        
        if (view === 'auth' || view === 'signup') {
          setView('dashboard');
        }
      } else {
        setIsAuthenticated(false);
        setUser({ 
          name: '', 
          email: '', 
          lastLogin: '', 
          activity: [], 
          bio: '', 
          avatarColor: 'bg-accent-indigo' 
        });
        setDecks([]);
        setIsLoadingProfile(false);
        if (view !== 'signup') setView('auth');
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization for profile
  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) {
      setIsLoadingProfile(false);
      return;
    }

    const userId = auth.currentUser.uid;
    const profileRef = doc(db, 'users', userId);
    
    setIsLoadingProfile(true);
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const firebaseUser = auth.currentUser;
        
        // Use data name, fallback to auth displayName, then fallback to email prefix
        const finalName = data.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Scholar';
        
        setUser({
          name: finalName,
          email: data.email || firebaseUser?.email || '',
          lastLogin: data.lastLogin || '',
          activity: data.activity || [],
          bio: data.bio || '',
          avatarColor: data.avatarColor || 'bg-accent-indigo',
          avatarImage: data.avatarImage
        });
      }
      setIsLoadingProfile(false);
    }, (error) => {
      setIsLoadingProfile(false);
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Real-time synchronization for decks
  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const decksRef = collection(db, 'users', userId, 'decks');
    
    const unsubscribe = onSnapshot(decksRef, (querySnapshot) => {
      const decksData: Deck[] = [];
      querySnapshot.forEach((doc) => {
        decksData.push(doc.data() as Deck);
      });
      // Sort decks by createdAt descending
      setDecks(decksData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/decks`);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleAuth = async (userData: { name: string; email: string; password?: string }, type: 'login' | 'signup'): Promise<string | null> => {
    const today = getLocalDate();
    
    try {
      if (type === 'signup') {
        if (!userData.password) return "Password is required";
        
        let firebaseUser;
        try {
          const res = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
          firebaseUser = res.user;
          // Set display name in Auth
          await updateAuthProfile(firebaseUser, { displayName: userData.name });
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            return "User already exists. Please sign in.";
          }
          return error.message;
        }
        
        // Create profile in Firestore
        const newUserProfile = {
          name: userData.name,
          email: userData.email,
          lastLogin: today,
          activity: [today],
          bio: '',
          avatarColor: 'bg-accent-indigo',
          updatedAt: Date.now().toString()
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        });
        
        setView('dashboard');
        return null;
      } else {
        // Login
        if (!userData.password) return "Password is required";
        
        let res;
        try {
          res = await signInWithEmailAndPassword(auth, userData.email, userData.password);
        } catch (error: any) {
          return "Email or password is incorrect.";
        }
        const firebaseUser = res.user;
        
        // Update last login in Firestore
        const profileRef = doc(db, 'users', firebaseUser.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const data = profileSnap.data();
            const currentActivity = data.activity || [];
            const updatedActivity = currentActivity.includes(today) ? currentActivity : [...currentActivity, today];
            
            const updatePayload: any = {
              lastLogin: today,
              activity: updatedActivity,
              updatedAt: Date.now().toString()
            };

            // If profile name is still generic "User" or empty, try to improve it
            if (!data.name || data.name === 'User') {
              updatePayload.name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || data.name || 'Scholar';
            }
            
            await updateDoc(profileRef, updatePayload);
          } else {
            // Auto-create missing profile
            const newUserProfile = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Scholar',
              email: firebaseUser.email || '',
              lastLogin: today,
              activity: [today],
              bio: '',
              avatarColor: 'bg-accent-indigo',
              updatedAt: Date.now().toString()
            };
            await setDoc(profileRef, newUserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
        
        setView('dashboard');
        return null;
      }
    } catch (error: any) {
      return error.message;
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    setUser({ 
      name: 'User', 
      email: '', 
      lastLogin: '', 
      activity: [], 
      bio: '', 
      avatarColor: 'bg-accent-indigo' 
    });
    setDecks([]);
    setView('auth');
  };

  const addDeck = async (newDeck: Deck) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const deckId = newDeck.id || Date.now().toString();
    const deckWithTime = { 
      ...newDeck, 
      id: deckId,
      creatorId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now() 
    };
    try {
      await setDoc(doc(db, 'users', userId, 'decks', deckId), deckWithTime);
      setView('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/decks/${deckId}`);
    }
  };

  const updateDeck = async (updatedDeck: Deck) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const deckWithTime = { ...updatedDeck, updatedAt: Date.now() };
    try {
      await setDoc(doc(db, 'users', userId, 'decks', updatedDeck.id), deckWithTime);
      setView('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/decks/${updatedDeck.id}`);
    }
  };

  const updateProfile = async (data: { name: string; bio: string; avatarColor: string; avatarImage?: string }) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const profileRef = doc(db, 'users', userId);
    try {
      await updateDoc(profileRef, {
        ...data,
        updatedAt: Date.now().toString()
      });
      setView('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      await signOut(auth);
      setView('auth');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const deleteDeck = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'decks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/decks/${id}`);
    }
  };

  const startStudy = (id: string) => {
    setCurrentDeckId(id);
    setView('study');
  };

  const handleFinishStudy = async (deckId: string, masteredCardIds: string[]) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const today = getLocalDate();
    
    try {
      // Update activity if it's a new day
      const profileRef = doc(db, 'users', userId);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        const activity = data.activity || [];
        if (!activity.includes(today)) {
          await updateDoc(profileRef, {
            activity: [...activity, today],
            lastLogin: today,
            updatedAt: Date.now().toString()
          });
        }
      }

      const deckRef = doc(db, 'users', userId, 'decks', deckId);
      const deckSnap = await getDoc(deckRef);
      if (deckSnap.exists()) {
        const deck = deckSnap.data() as Deck;
        const updatedCards = deck.cards.map(card => ({
          ...card,
          mastered: masteredCardIds.includes(card.id)
        }));
        const progress = updatedCards.filter(c => c.mastered).length / updatedCards.length;
        await updateDoc(deckRef, {
          cards: updatedCards,
          progress,
          lastStudied: Date.now(),
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/decks/${deckId}`);
    }
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

