import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, Trash2, Save, ChevronLeft, Type, Hash, FormInput, ListFilter, Undo2, Redo2, RotateCcw } from 'lucide-react';
import { Deck, Flashcard, CardType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface DeckEditorProps {
  deck: Deck | null;
  onSave: (deck: Deck) => void;
  onCancel: () => void;
}

const CARD_TYPES: { type: CardType; label: string; icon: any }[] = [
  { type: 'flip-card', label: 'Basic Flip', icon: RotateCcw },
  { type: 'identification', label: 'Identification', icon: Type },
  { type: 'enumeration', label: 'Enumeration', icon: Hash },
  { type: 'fill-in-the-blank', label: 'Fill in Blank', icon: FormInput },
  { type: 'multiple-choice', label: 'Multiple Choice', icon: ListFilter },
];

export function DeckEditor({ deck, onSave, onCancel }: DeckEditorProps) {
  const [name, setName] = useState(deck?.name || '');
  
  // Undo/Redo State Pattern
  const [history, setHistory] = useState<{
    past: Flashcard[][],
    present: Flashcard[],
    future: Flashcard[][]
  }>({
    past: [],
    present: deck?.cards || [{ id: Date.now().toString(), question: '', answer: '', type: 'identification' }],
    future: []
  });

  const cards = history.present;

  const undo = () => {
    if (history.past.length === 0) return;
    
    setHistory(prev => {
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  };

  const redo = () => {
    if (history.future.length === 0) return;
    
    setHistory(prev => {
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history]);

  const pushToHistory = (newCards: Flashcard[]) => {
    setHistory(prev => ({
      past: [...prev.past, JSON.parse(JSON.stringify(prev.present))].slice(-50),
      present: newCards,
      future: []
    }));
  };

  const addCard = () => {
    const newCards = [...cards, { id: Date.now().toString(), question: '', answer: '', type: 'identification' }];
    pushToHistory(newCards);
  };

  const updateCard = (index: number, updates: Partial<Flashcard>) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], ...updates };
    pushToHistory(newCards);
  };

  const removeCard = (index: number) => {
    if (cards.length > 1) {
      const newCards = cards.filter((_, i) => i !== index);
      pushToHistory(newCards);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      setSaveError("Please enter a collection name.");
      return;
    }
    
    // Filter out empty cards
    const validCards = cards.filter(c => {
      const hasContent = c.question.trim() && c.answer.trim();
      if (c.type === 'multiple-choice') {
        const hasOptions = c.options && c.options.some(o => o.trim());
        const answerInOptions = c.options?.includes(c.answer);
        return hasContent && hasOptions && answerInOptions;
      }
      return hasContent;
    });
    
    if (validCards.length === 0) {
      setSaveError("Please ensure your cards have questions, answers, and at least one correct choice selected for Multiple Choice types.");
      return;
    }
    
    setSaveError(null);
    setIsSaving(true);
    try {
      await onSave({
        id: deck?.id || Date.now().toString(),
        name: name.trim(),
        cards: validCards,
        progress: deck?.progress || 0,
        createdAt: deck?.createdAt || Date.now(),
      });
    } catch (error) {
      console.error("Failed to save:", error);
      setSaveError("Failed to save changes. Please check your connection.");
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form onSubmit={handleSave}>
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 text-gray-500 hover:text-accent-indigo font-semibold transition-all group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-bg-sidebar border border-border-subtle group-hover:border-accent-indigo shadow-lg shadow-gray-200/20 text-gray-500 group-hover:text-accent-indigo">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            {deck ? "Edit Collection" : "New Collection"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={history.past.length === 0}
              className="p-2 rounded-lg bg-bg-sidebar border border-border-subtle hover:border-accent-indigo text-gray-400 hover:text-accent-indigo disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={history.future.length === 0}
              className="p-2 rounded-lg bg-bg-sidebar border border-border-subtle hover:border-accent-indigo text-gray-400 hover:text-accent-indigo disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-10">
          <div className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (saveError) setSaveError(null);
              }}
              placeholder="Collection Name"
              className="w-full px-0 py-2 bg-transparent border-b border-border-subtle focus:border-accent-indigo outline-none transition-all text-2xl font-bold placeholder:text-gray-200 text-gray-900"
              required
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between ml-1">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Flash Contents</h3>
              <span className="text-[10px] font-bold text-accent-indigo bg-accent-indigo/10 px-3 py-1 rounded-lg">
                {cards.length} Slots
              </span>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {cards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-bg-sidebar border border-border-subtle p-6 rounded-3xl relative group transition-all hover:border-accent-indigo/30 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => removeCard(index)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-2 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      {/* Left side: Type selection */}
                      <div className="md:col-span-3 space-y-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Question Type</label>
                        <div className="grid grid-cols-1 gap-2">
                          {CARD_TYPES.map((t) => (
                            <button
                              key={t.type}
                              type="button"
                              onClick={() => {
                                updateCard(index, { type: t.type });
                                if (saveError) setSaveError(null);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                card.type === t.type 
                                  ? 'bg-accent-indigo text-white shadow-lg shadow-accent-indigo/20' 
                                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              <t.icon className="w-4 h-4" />
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right side: Inputs */}
                      <div className="md:col-span-9 space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest ml-1">Question / Prompt</label>
                          <textarea
                            value={card.question}
                            onChange={(e) => {
                              updateCard(index, { question: e.target.value });
                              if (saveError) setSaveError(null);
                            }}
                            placeholder="What is the question?"
                            className="w-full bg-white border border-border-subtle rounded-2xl p-4 text-gray-900 font-medium outline-none focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo transition-all resize-none"
                            rows={2}
                          />
                        </div>

                        {card.type === 'multiple-choice' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between ml-1">
                              <label className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest">Options Configuration</label>
                              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-tighter">Select one as correct</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                              {['A', 'B', 'C', 'D'].map((label, i) => {
                                const isCorrectOption = card.answer === (card.options?.[i] || '') && (card.options?.[i]?.length || 0) > 0;
                                return (
                                  <div key={label} className="flex items-center gap-3 group/choice">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all border ${
                                      isCorrectOption 
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                                        : 'bg-white text-gray-400 border-border-subtle group-focus-within/choice:border-accent-indigo group-focus-within/choice:text-accent-indigo'
                                    }`}>
                                      {label}
                                    </div>
                                    <div className="relative flex-1">
                                      <input
                                        type="text"
                                        value={card.options?.[i] || ''}
                                        onChange={(e) => {
                                          const newOptions = [...(card.options || ['', '', '', ''])];
                                          // Pad if less than 4
                                          while(newOptions.length < 4) newOptions.push('');
                                          const oldVal = newOptions[i];
                                          newOptions[i] = e.target.value;
                                          
                                          const updates: Partial<Flashcard> = { options: newOptions };
                                          // If this was the correct answer, update the answer field too
                                          if (card.answer === oldVal && oldVal !== '') {
                                            updates.answer = e.target.value;
                                          }
                                          updateCard(index, updates);
                                          if (saveError) setSaveError(null);
                                        }}
                                        placeholder={`Enter choice ${label}...`}
                                        className={`w-full bg-white border rounded-2xl px-5 py-4 text-sm font-medium outline-none transition-all ${
                                          isCorrectOption 
                                            ? 'border-emerald-500 ring-1 ring-emerald-500/20 shadow-sm' 
                                            : 'border-border-subtle focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo'
                                        }`}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const val = card.options?.[i] || '';
                                        if (val.trim()) {
                                          updateCard(index, { answer: val });
                                          if (saveError) setSaveError(null);
                                        }
                                      }}
                                      className={`px-4 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                                        isCorrectOption
                                          ? 'bg-emerald-50 text-emerald-500 border-emerald-200'
                                          : 'bg-gray-50 text-gray-400 border-border-subtle hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed'
                                      }`}
                                      disabled={!(card.options?.[i]?.trim())}
                                    >
                                      {isCorrectOption ? 'Correct' : 'Set Correct'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest ml-1">Correct Answer / Keys</label>
                          <input
                            type="text"
                            value={card.answer}
                            onChange={(e) => {
                              updateCard(index, { answer: e.target.value });
                              if (saveError) setSaveError(null);
                            }}
                            placeholder={card.type === 'enumeration' ? "Answer 1, Answer 2, Answer 3..." : "The correct solution..."}
                            className="w-full bg-white border border-border-subtle rounded-2xl px-4 py-3 text-gray-900 font-medium outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                          />
                          {card.type === 'enumeration' && (
                            <p className="text-[10px] text-gray-400 italic ml-1">Separate answers with commas for enumeration mode.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={addCard}
                className="w-full border-2 border-dashed border-border-subtle hover:border-accent-indigo/50 rounded-3xl py-8 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-accent-indigo transition-all group bg-bg-card/50 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-border-subtle flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs uppercase tracking-[0.2em]">Add Another Fact</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-12 border-t border-border-subtle space-y-6">
            <AnimatePresence>
              {saveError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl text-sm font-semibold flex items-center gap-3"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                  {saveError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-8 py-3 text-gray-500 font-bold text-xs tracking-widest uppercase hover:text-gray-900 transition-all cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-12 py-3 bg-accent-indigo text-white font-bold text-xs tracking-widest uppercase rounded-xl shadow-xl shadow-accent-indigo/20 hover:bg-accent-indigo-dark transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 cursor-pointer disabled:cursor-not-allowed group transition-all"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                {isSaving ? 'Saving...' : 'Save Collection'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>


  );
}
