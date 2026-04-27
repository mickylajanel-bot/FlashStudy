import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, RotateCcw, ArrowRight, CheckCircle2, XCircle, Send, Timer, Star, Play, Zap, Volume2, VolumeX } from 'lucide-react';
import { Deck, Flashcard, StudyMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const SOUNDS = {
  FLIP: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/1939/1939-preview.mp3',
  ERROR: 'https://assets.mixkit.co/active_storage/sfx/1120/1120-preview.mp3',
  COMPLETE: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
};

interface StudySessionProps {
  deck: Deck;
  onBack: () => void;
  onFinish: (deckId: string, masteredCardIds: string[]) => void;
}

export function StudySession({ deck, onBack, onFinish }: StudySessionProps) {
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const playSound = (type: keyof typeof SOUNDS) => {
    if (isMuted) return;
    const audio = new Audio(SOUNDS[type]);
    audio.volume = type === 'FLIP' ? 0.3 : 0.4;
    audio.play().catch(() => {}); // Ignore autoplay blocks
  };

  const [sessionMastery, setSessionMastery] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    deck.cards.forEach(card => {
      if (card.mastered) initial[card.id] = true;
    });
    return initial;
  });

  const currentCard = sessionCards[currentIndex];

  const startSession = (selectedMode: StudyMode) => {
    let cards = [...deck.cards];
    if (selectedMode === 'mastery') {
      cards = cards.filter(c => !c.mastered);
      if (cards.length === 0) {
        alert("All cards mastered! Starting Classic mode instead.");
        cards = [...deck.cards];
        selectedMode = 'classic';
      }
    }
    setSessionCards(cards);
    setMode(selectedMode);
    setCurrentIndex(0);
  };

  useEffect(() => {
    if (mode === 'timed' && !isFlipped && !isComplete && currentCard) {
      setTimeLeft(15);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, mode, isFlipped, isComplete, currentCard]);

  const handleTimeUp = () => {
    if (!hasChecked) {
      playSound('ERROR');
      playSound('FLIP');
      setIsCorrect(false);
      setHasChecked(true);
      setIsFlipped(true);
    }
  };

  useEffect(() => {
    if (!currentCard && !isComplete && sessionCards.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentCard, isComplete, sessionCards.length]);

  useEffect(() => {
    setUserInput('');
    setHasChecked(false);
    setIsCorrect(null);
    setIsFlipped(false);
  }, [currentIndex]);

  const checkAnswer = () => {
    if (!currentCard) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const type = currentCard.type || 'identification';
    
    if (type === 'flip-card') {
      playSound('FLIP');
      setIsCorrect(true); // Always "correct" or neutral for basic flip
      setHasChecked(true);
      setIsFlipped(true);
      return;
    }

    let correct = false;

    if (type === 'multiple-choice') {
      correct = userInput.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();
    } else if (type === 'enumeration') {
      const userAnswers = userInput.split(',').map(s => s.toLowerCase().trim()).sort();
      const actualAnswers = currentCard.answer.split(',').map(s => s.toLowerCase().trim()).sort();
      correct = actualAnswers.every(ans => userAnswers.includes(ans)) && userAnswers.length >= actualAnswers.length;
    } else {
      // Identification, Fill in the blank
      correct = userInput.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();
    }

    playSound(correct ? 'SUCCESS' : 'ERROR');
    playSound('FLIP');
    setIsCorrect(correct);
    setHasChecked(true);
    setIsFlipped(true);
  };

  const handleMark = (isMastered: boolean) => {
    if (!currentCard) return;
    setSessionMastery(prev => ({ ...prev, [currentCard.id]: isMastered }));
    
    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      playSound('COMPLETE');
      setIsComplete(true);
      const allMasteredIds = deck.cards
        .map(c => c.id)
        .filter(id => {
          const inSession = sessionCards.some(sc => sc.id === id);
          if (inSession) {
            return id === currentCard.id ? isMastered : sessionMastery[id];
          }
          return sessionMastery[id];
        });
      onFinish(deck.id, allMasteredIds);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(false);
    setUserInput('');
    setHasChecked(false);
    setMode(null);
  };

  if (!mode) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display font-bold text-gray-900 tracking-tight">Choose Your Study Mode</h2>
          <p className="text-gray-500">Pick the best way to master <span className="font-semibold text-accent-indigo">{deck.name}</span></p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => startSession('classic')}
            className="group flex items-center gap-6 p-6 bg-white border border-border-subtle rounded-3xl hover:border-accent-indigo hover:shadow-xl hover:shadow-accent-indigo/5 transition-all text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-indigo/10 flex items-center justify-center text-accent-indigo shrink-0 group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 mb-1">Classic Mode</h4>
              <p className="text-sm text-gray-500">Traditional flashcard review at your own pace.</p>
            </div>
          </button>

          <button 
            onClick={() => startSession('timed')}
            className="group flex items-center gap-6 p-6 bg-white border border-border-subtle rounded-3xl hover:border-amber-400 hover:shadow-xl hover:shadow-amber-400/5 transition-all text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
              <Timer className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 mb-1">Timed Sprint</h4>
              <p className="text-sm text-gray-500">15 seconds per card. Think fast, answer faster!</p>
            </div>
          </button>

          <button 
            onClick={() => startSession('mastery')}
            className="group flex items-center gap-6 p-6 bg-white border border-border-subtle rounded-3xl hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-400/5 transition-all text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
              <Star className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 mb-1">Mastery Focus</h4>
              <p className="text-sm text-gray-500">Focus ONLY on cards you haven't mastered yet.</p>
            </div>
          </button>
        </div>

        <button 
          onClick={onBack}
          className="w-full py-4 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-gray-900 transition-colors"
        >
          Cancel and Return
        </button>
      </div>
    );
  }

  if (isComplete) {
    const masteredCount = Object.values(sessionMastery).filter(v => v).length;
    const scorePercentage = (masteredCount / deck.cards.length) * 100;
    
    let feedback = "";
    if (scorePercentage >= 60) feedback = "Good Job!";
    else if (scorePercentage < 50) feedback = "Try Again!";

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${
             scorePercentage >= 60 ? 'bg-green-100 text-green-500 shadow-green-100/30' : 
             scorePercentage < 50 ? 'bg-rose-100 text-rose-500 shadow-rose-100/30' : 
             'bg-accent-indigo/10 text-accent-indigo shadow-accent-indigo/10'
           }`}
        >
          {scorePercentage >= 60 ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
        </motion.div>
        <h2 className="text-4xl font-display font-bold tracking-tight mb-2 text-gray-900">
          {feedback || "Deck Completed!"}
        </h2>
        <div className="bg-gray-50 px-6 py-2 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 border border-gray-100 inline-block">
          Mode: {mode}
        </div>
        <p className="text-gray-500 max-w-sm mx-auto mb-10 text-lg">
          You've mastered <span className={`font-bold ${scorePercentage >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>{masteredCount} of {deck.cards.length}</span> cards in <span className="font-bold text-accent-indigo">{deck.name}</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={handleRestart}
            className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-xl transition-all active:scale-95 hover:bg-black"
          >
            Restart Session
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white text-gray-900 border border-gray-200 font-bold rounded-xl shadow-sm transition-all active:scale-95 hover:bg-gray-50"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  const renderInput = () => {
    if (!currentCard) return null;
    const type = currentCard.type || 'identification';

    if (hasChecked) return null;

    if (type === 'multiple-choice') {
      return (
        <div className="grid grid-cols-1 gap-3 w-full max-w-sm mx-auto mt-8">
          {currentCard.options?.map((option, i) => {
            const label = ['A', 'B', 'C', 'D'][i] || (i + 1).toString();
            return (
              <button
                key={i}
                onClick={() => { setUserInput(option); checkAnswer(); }}
                className={`w-full py-3.5 px-5 rounded-2xl border-2 font-bold transition-all text-left flex items-center gap-4 group/option ${
                  userInput === option 
                    ? 'border-accent-indigo bg-accent-indigo text-white shadow-lg' 
                    : 'border-border-subtle bg-white text-gray-700 hover:border-accent-indigo/20 hover:shadow-md'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border shrink-0 transition-all ${
                  userInput === option 
                    ? 'bg-white/20 border-white/40 text-white' 
                    : 'bg-gray-50 border-border-subtle text-gray-400 group-hover/option:border-accent-indigo/30 group-hover/option:text-accent-indigo'
                }`}>
                  {label}
                </div>
                <span className="flex-1 truncate">{option}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (type === 'flip-card') {
      return (
        <div className="mt-8 w-full max-w-md mx-auto">
          <button
            onClick={checkAnswer}
            className="w-full py-6 bg-gradient-to-r from-accent-indigo to-purple-600 text-white font-bold rounded-2xl shadow-xl shadow-accent-indigo/20 flex items-center justify-center gap-3 transition-all active:scale-95 group"
          >
            <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            FLIP TO REVEAL
          </button>
          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
            Test your memory, then flip
          </p>
        </div>
      );
    }

    return (
      <div className="mt-8 space-y-4 w-full max-w-md mx-auto">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && userInput.trim() && checkAnswer()}
          placeholder={type === 'enumeration' ? "Answer 1, Answer 2..." : "Type your answer..."}
          className="w-full bg-white border-2 border-border-subtle rounded-2xl px-6 py-4 text-gray-900 font-bold outline-none focus:border-accent-indigo transition-all shadow-sm"
          autoFocus
        />
        <button
          onClick={checkAnswer}
          disabled={!userInput.trim()}
          className="w-full py-4 bg-accent-indigo text-white font-bold rounded-2xl shadow-xl shadow-accent-indigo/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          Check Answer <Send className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 text-gray-500 hover:text-accent-indigo font-semibold transition-all group"
        >
          <div className="p-2 rounded-lg bg-bg-sidebar border border-border-subtle group-hover:border-accent-indigo group-hover:text-accent-indigo transition-colors shadow-lg shadow-gray-200/20">
            <ChevronLeft className="w-5 h-5" />
          </div>
          Change Mode
        </button>
        <div className="text-right flex items-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:text-accent-indigo hover:bg-accent-indigo/5 transition-all outline-none"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {mode === 'timed' && !isFlipped && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border animate-pulse ${timeLeft < 5 ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
              <Timer className="w-4 h-4" />
              <span className="font-mono font-bold text-lg">{timeLeft}s</span>
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{deck.name}</h3>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Flashcard {currentIndex + 1} of {sessionCards.length}</span>
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-border-subtle rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / sessionCards.length) * 100}%` }}
          className="h-full bg-accent-indigo"
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative h-[400px] w-full perspective-1000"
        >
          <motion.div
            className="w-full h-full relative preserve-3d"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden w-full h-full bg-white border border-border-subtle rounded-[32px] p-8 md:p-12 flex flex-col shadow-xl translate-z-0 overflow-hidden">
               <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-bold text-accent-indigo uppercase tracking-[0.3em] font-display">
                    {currentCard?.type?.replace(/-/g, ' ') || 'Identification'}
                  </span>
                  {mode === 'timed' && (
                    <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter ${timeLeft < 5 ? 'bg-rose-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                      {timeLeft < 5 ? 'URGENT' : 'TIMED QUIZ'}
                    </div>
                  )}
               </div>
               <div className="flex-1 flex items-center justify-center">
                 <p className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-tight text-center">
                   {currentCard?.question}
                 </p>
               </div>
            </div>

            {/* Back */}
            <div 
              className={`absolute inset-0 backface-hidden w-full h-full border border-border-subtle rounded-[32px] p-8 md:p-12 flex flex-col shadow-xl overflow-hidden ${
                currentCard?.type === 'flip-card' ? 'bg-blue-50 border-blue-100' :
                isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
              }`}
              style={{ transform: 'rotateY(180deg)' }}
            >
               <div className="flex justify-between items-center mb-6">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.3em] font-display ${
                    currentCard?.type === 'flip-card' ? 'text-blue-500' :
                    isCorrect ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {currentCard?.type === 'flip-card' ? 'Answer Revealed' : isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                  {mode === 'timed' && !isCorrect && isFlipped && timeLeft === 0 && (
                    <span className="text-[9px] font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-md uppercase">Out of Time</span>
                  )}
               </div>
               <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                 <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-1">
                     {currentCard?.type === 'flip-card' ? 'The Answer is' : 'Correct Answer'}
                   </p>
                   <p className={`text-2xl md:text-3xl font-bold tracking-tight text-center leading-tight ${
                      currentCard?.type === 'flip-card' ? 'text-blue-700' :
                      isCorrect ? 'text-emerald-700' : 'text-rose-700'
                   }`}>
                     {currentCard?.answer}
                   </p>
                 </div>
                 {!isCorrect && currentCard?.type !== 'flip-card' && (
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-1">Your Attempt</p>
                     <p className="text-lg font-medium text-rose-400 italic text-center">"{userInput || '(No Answer)'}"</p>
                   </div>
                 )}
               </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="min-h-[140px] flex items-center justify-center">
        {!isFlipped ? (
          renderInput()
        ) : (
          <div className="grid grid-cols-2 gap-6 w-full animate-in fade-in slide-in-from-top-4 duration-500">
            <button
              onClick={() => handleMark(false)}
              className="py-5 bg-white text-rose-500 border border-rose-100 font-bold text-sm tracking-widest uppercase rounded-2xl shadow-xl hover:bg-rose-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Hard
            </button>
            <button
              onClick={() => handleMark(true)}
              className="py-5 bg-emerald-500 text-white font-bold text-sm tracking-widest uppercase rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] hover:bg-emerald-600 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Easy
            </button>
          </div>
        )}
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
