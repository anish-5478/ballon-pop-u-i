import { useEffect, useMemo, CSSProperties } from 'react';

interface BalloonProps {
  id: number;
  word: string;
  left: number;
  speed: number;
  delay: number;
  isPopping?: boolean;
  onComplete: (id: number) => void;
}

const colors = [
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
  'from-violet-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-pink-400 to-rose-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-emerald-500',
];

const colorHex = [
  '#34d399',
  '#22d3ee',
  '#a78bfa',
  '#f59e0b',
  '#fb7185',
  '#f472b6',
  '#d946ef',
  '#84cc16',
];

function Balloon({ id, word, left, speed, delay, isPopping = false, onComplete }: BalloonProps) {
  const color = colors[id % colors.length];
  const popColor = colorHex[id % colorHex.length];
  const animationDuration = 20 / speed;
  const animationName = useMemo(
    () => `float-${id}-${Math.random().toString(36).slice(2, 9)}`,
    [id]
  );
  const driftOffsets = useMemo(() => {
    const amplitude = 15 + Math.random() * 40;
    let direction = Math.random() > 0.5 ? 1 : -1;
    return Array.from({ length: 4 }, () => {
      const offset = direction * (Math.random() * amplitude);
      if (Math.random() > 0.3) {
        direction *= -1;
      }
      return Number(offset.toFixed(2));
    });
  }, [id]);

  const particleStyles = useMemo(() => {
    const angles = [0, 60, 120, 180, 240, 300];
    return angles.map(angle => {
      const distance = 40 + Math.random() * 25;
      const rad = (angle * Math.PI) / 180;
      return {
        '--particle-x': `${Math.cos(rad) * distance}px`,
        '--particle-y': `${Math.sin(rad) * distance}px`,
        animationDelay: `${(Math.random() * 0.04).toFixed(2)}s`,
      } as CSSProperties;
    });
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(id);
    }, (animationDuration + delay) * 1000);

    return () => clearTimeout(timer);
  }, [id, animationDuration, delay, onComplete]);

  const [offset25, offset50, offset75, offset100] = driftOffsets;

  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        bottom: '-10%',
        animation: `${animationName} ${animationDuration}s linear forwards`,
        animationDelay: `${delay}s`,
        animationPlayState: isPopping ? 'paused' : 'running',
      }}
    >
      <div
        className="relative group"
        style={
          isPopping
            ? {
                animation: 'pop-expand 0.35s cubic-bezier(0.5, 0, 0.3, 1) forwards',
                pointerEvents: 'none',
                transformOrigin: 'center',
              }
            : undefined
        }
      >
        <div
          className={`w-24 h-32 bg-gradient-to-br ${color} rounded-full shadow-2xl relative transform transition-transform group-hover:scale-110 overflow-hidden`}
          style={{
            animation: isPopping ? 'none' : 'sway 3s ease-in-out infinite',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset -2px -2px 8px rgba(255,255,255,0.2)',
          }}
        >
          <div className="absolute inset-3 bg-white/30 rounded-full blur-lg" />
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 50%)',
          }} />

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-xl drop-shadow-xl text-center px-2 leading-tight">
              {word}
            </span>
          </div>

          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-1 h-10 bg-gradient-to-b from-slate-600 to-slate-800 rounded-full" style={{
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }} />
            <div className="w-4 h-2.5 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full -mt-1 -ml-1.5" style={{
              boxShadow: 'inset 0 2px 2px rgba(0,0,0,0.3)',
            }} />
          </div>
        </div>

        <div className="absolute top-6 left-5 w-7 h-7 bg-white/50 rounded-full blur-md" style={{
          boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.1)',
        }} />

        {isPopping && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {particleStyles.map((style, index) => (
              <span
                key={index}
                className="absolute block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: popColor,
                  animation: 'particle-burst 0.35s 0.18s ease-out forwards',
                  ...style,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ${animationName} {
          0% {
            transform: translateY(0) translateX(0);
            bottom: -10%;
          }
          25% {
            transform: translateY(-5px) translateX(${offset25}px);
            bottom: 20%;
          }
          50% {
            transform: translateY(-10px) translateX(${offset50}px);
            bottom: 50%;
          }
          75% {
            transform: translateY(-15px) translateX(${offset75}px);
            bottom: 80%;
          }
          100% {
            transform: translateY(-20px) translateX(${offset100}px);
            bottom: 110%;
          }
        }

        @keyframes sway {
          0%, 100% {
            transform: rotate(-4deg);
          }
          50% {
            transform: rotate(4deg);
          }
        }

        @keyframes pop-expand {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          55% {
            opacity: 0.95;
            transform: scale(1.32);
          }
          70% {
            opacity: 0.92;
            transform: scale(1.18);
          }
          85% {
            opacity: 0.9;
            transform: scale(1.55);
          }
          92% {
            opacity: 0.85;
            transform: scale(1.35);
          }
          100% {
            opacity: 0;
            transform: scale(0.2);
          }
        }

        @keyframes particle-burst {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(0.6);
          }
          100% {
            opacity: 0;
            transform: translate(var(--particle-x, 0), var(--particle-y, -30px)) scale(0.2);
          }
        }
      `}</style>
    </div>
  );
}

export default Balloon;
