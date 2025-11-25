import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, Play, ChevronDown, ChevronUp } from 'lucide-react';
import Balloon from './components/Balloon';
import { words } from './data/words';

type BalloonState = {
  id: number;
  word: string;
  left: number;
  delay: number;
  isPopping?: boolean;
};

const POP_ANIMATION_DURATION_MS = 250;

const shuffleWordList = () => {
  const pool = [...words];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
};

const isSimilarWord = (spoken: string, target: string): boolean => {
  const s = spoken.toLowerCase();
  const t = target.toLowerCase();

  if (s === t) return true;

  const distance = levenshteinDistance(s, t);
  const maxLength = Math.max(s.length, t.length);
  const similarity = 1 - distance / maxLength;

  return similarity >= 0.75;
};

function App() {
  const [balloons, setBalloons] = useState<BalloonState[]>([]);
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(0.7);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recognizedWord, setRecognizedWord] = useState('');
  const [typedWord, setTypedWord] = useState('');
  const [score, setScore] = useState(0);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const balloonIdCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wordIndexRef = useRef(0);
  const balloonSpawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordPoolRef = useRef<string[]>(shuffleWordList());
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsCollapsed(false);
    }
  }, [isPlaying]);

  const triggerBalloonPop = useCallback((shouldPop: (balloon: BalloonState) => boolean) => {
    let idsToPop: number[] = [];

    setBalloons(prev => {
      idsToPop = prev.filter(balloon => shouldPop(balloon) && !balloon.isPopping).map(balloon => balloon.id);

      if (!idsToPop.length) {
        return prev;
      }

      const idSet = new Set(idsToPop);

      return prev.map(balloon =>
        idSet.has(balloon.id) ? { ...balloon, isPopping: true } : balloon
      );
    });

    if (!idsToPop.length) {
      return 0;
    }

    const idSet = new Set(idsToPop);
    setScore(s => s + idsToPop.length);

    setTimeout(() => {
      setBalloons(prev => prev.filter(balloon => !idSet.has(balloon.id)));
    }, POP_ANIMATION_DURATION_MS);

    return idsToPop.length;
  }, []);

  const checkAndPopBalloons = useCallback((spokenText: string) => {
    const spokenWords = spokenText.split(/\s+/).filter(w => w);
    triggerBalloonPop(balloon =>
      spokenWords.some(word => isSimilarWord(word, balloon.word))
    );
  }, [triggerBalloonPop]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    if ((recognition as any).processInput) {
      (recognition as any).processInput.audioWorkletOptions = {
        audioWorkletPath: '/audio-worklet.js'
      };
    }

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript?.toLowerCase().trim();
        if (!transcriptSegment || transcriptSegment === lastTranscriptRef.current) {
          continue;
        }

        lastTranscriptRef.current = transcriptSegment;
        setRecognizedWord(transcriptSegment);
        checkAndPopBalloons(transcriptSegment);

        if (event.results[i].isFinal) {
          lastTranscriptRef.current = '';
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'audio-capture' && event.error !== 'network') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Failed to restart speech recognition', error);
        }
      }
    };

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, [checkAndPopBalloons]);

  const getNextWord = useCallback(() => {
    if (!wordPoolRef.current.length) {
      wordPoolRef.current = shuffleWordList();
      wordIndexRef.current = 0;
    }

    if (wordIndexRef.current >= wordPoolRef.current.length) {
      wordPoolRef.current = shuffleWordList();
      wordIndexRef.current = 0;
    }

    const nextWord = wordPoolRef.current[wordIndexRef.current];
    wordIndexRef.current += 1;
    return nextWord;
  }, []);

  const addNewBalloons = useCallback(() => {
    setBalloons(prev => {
      const nextWord = getNextWord();
      if (!nextWord) {
        return prev;
      }

      const position = Math.random() * 85 + 5;

      const newBalloon = {
        id: balloonIdCounter.current++,
        word: nextWord,
        left: position,
        delay: 0,
      };

      return [...prev, newBalloon];
    });
  }, [getNextWord]);

  const scheduleBalloonSpawner = useCallback(() => {
    if (balloonSpawnIntervalRef.current) {
      clearInterval(balloonSpawnIntervalRef.current);
    }

    balloonSpawnIntervalRef.current = setInterval(() => {
      addNewBalloons();
    }, 11000);
  }, [addNewBalloons]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setBalloons([]);
    balloonIdCounter.current = 0;
    wordIndexRef.current = 0;
    wordPoolRef.current = shuffleWordList();

    if (balloonSpawnIntervalRef.current) {
      clearInterval(balloonSpawnIntervalRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition already running', error);
      }
    }

    addNewBalloons();
    scheduleBalloonSpawner();
  };

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    scheduleBalloonSpawner();
  }, [isPlaying, scheduleBalloonSpawner]);

  const resetGame = () => {
    setIsPlaying(false);
    setBalloons([]);
    setScore(0);
    setIsListening(false);
    wordPoolRef.current = shuffleWordList();
    wordIndexRef.current = 0;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (balloonSpawnIntervalRef.current) {
      clearInterval(balloonSpawnIntervalRef.current);
    }
  };

  const toggleListening = () => {
    if (!isPlaying) return;

    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition already running', error);
      }
    }
  };

  const handleTypeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && typedWord.trim()) {
      e.preventDefault();
      const typed = typedWord.toLowerCase().trim();
      triggerBalloonPop(balloon => balloon.word === typed);

      setTypedWord('');
    }
  };

  const handleBalloonComplete = (id: number) => {
    setBalloons(prev => {
      const updated = prev.filter(b => b.id !== id);

      if (updated.length < 3) {
        addNewBalloons();
      }

      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden relative flex flex-col">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animation: 'pulse 4s ease-in-out infinite' }}></div>
        <div className="absolute -bottom-8 right-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animation: 'pulse 5s ease-in-out infinite 1s' }}></div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-20">
        {balloons.map((balloon) => (
          <Balloon
            key={balloon.id}
            id={balloon.id}
            word={balloon.word}
            left={balloon.left}
            speed={speed}
            delay={balloon.delay}
            isPopping={balloon.isPopping}
            onComplete={handleBalloonComplete}
          />
        ))}
      </div>

      <header className="relative z-30 pt-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Balloon Pop
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Master pronunciation with voice recognition</p>
          </div>

          <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/30 shadow-2xl">
            <div className="text-right">
              <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                {score}
              </div>
              <p className="text-slate-400 text-sm mt-1 uppercase tracking-wide">Points</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative z-0"></div>

      <footer className="relative z-30 px-6 md:px-12 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {!isPlaying ? (
            <div className="space-y-6">
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 px-8 rounded-2xl shadow-2xl transition-all transform hover:scale-105 duration-200 flex items-center justify-center gap-3 text-xl"
              >
                <Play className="w-7 h-7" />
                Start Game
              </button>

              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/30">
                <p className="text-slate-300 text-center leading-relaxed">
                  Click start and speak the words shown on the floating balloons. Your voice will automatically pop them when detected correctly.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={toggleListening}
                className={`flex-1 ${
                  isListening
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
                } text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 duration-200 flex items-center justify-center gap-2 text-sm md:text-base`}
              >
                {isListening ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </button>

              <button
                onClick={resetGame}
                className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <RotateCcw className="w-5 h-5" />
                Reset
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-slate-300 text-xs font-semibold uppercase tracking-[0.2em]">Game Controls</p>
            {isPlaying && (
              <button
                onClick={() => setControlsCollapsed(prev => !prev)}
                className="flex items-center gap-2 text-slate-200 text-xs font-semibold uppercase tracking-wide bg-slate-800/60 hover:bg-slate-800 border border-slate-600/60 rounded-lg px-3 py-2 transition-colors"
                aria-expanded={!controlsCollapsed}
                aria-label={controlsCollapsed ? 'Show controls' : 'Hide controls'}
              >
                {controlsCollapsed ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Hide
                  </>
                )}
              </button>
            )}
          </div>

          {(!controlsCollapsed || !isPlaying) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-xl rounded-xl p-4 border border-slate-600/30">
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Speed: <span className="text-cyan-400 text-sm">{speed.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-xl rounded-xl p-4 border border-slate-600/30">
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Intensity: <span className="text-cyan-400 text-sm">{intensity.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={intensity}
                    onChange={(e) => setIntensity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-xl rounded-xl p-4 border border-slate-600/30">
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Type Word
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={typedWord}
                    onChange={(e) => setTypedWord(e.target.value)}
                    onKeyDown={handleTypeSubmit}
                    placeholder="Type & press Enter..."
                    className={`w-full px-3 py-2 border border-slate-500 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 bg-slate-800 text-white placeholder-slate-500 transition-all text-sm ${
                      !isPlaying ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    autoComplete="off"
                    disabled={!isPlaying}
                  />
                </div>
              </div>

              {isListening && recognizedWord && (
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-cyan-400/50 rounded-xl p-4 animate-pulse">
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">You said:</p>
                  <p className="text-lg font-bold text-cyan-300 truncate">{recognizedWord}</p>
                </div>
              )}
            </>
          )}
        </div>
      </footer>

      {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
        <div className="fixed bottom-24 left-6 right-6 z-40 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/50 text-red-200 px-6 py-4 rounded-xl backdrop-blur-sm">
          <p className="font-semibold">Browser Not Supported</p>
          <p className="text-sm mt-1">Speech recognition requires Chrome, Edge, or Safari.</p>
        </div>
      )}
    </div>
  );
}

export default App;
