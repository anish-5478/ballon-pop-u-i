import { useEffect } from 'react';

interface BalloonProps {
  id: number;
  word: string;
  left: number;
  speed: number;
  delay: number;
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

function Balloon({ id, word, left, speed, delay, onComplete }: BalloonProps) {
  const color = colors[id % colors.length];
  const animationDuration = 20 / speed;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(id);
    }, (animationDuration + delay) * 1000);

    return () => clearTimeout(timer);
  }, [id, animationDuration, delay, onComplete]);

  return (
    <div
      className="absolute animate-float"
      style={{
        left: `${left}%`,
        bottom: '-10%',
        animationDuration: `${animationDuration}s`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="relative group">
        <div
          className={`w-24 h-32 bg-gradient-to-br ${color} rounded-full shadow-2xl relative transform transition-transform group-hover:scale-110 overflow-hidden`}
          style={{
            animation: 'sway 3s ease-in-out infinite',
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
      </div>

      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            bottom: -10%;
          }
          100% {
            transform: translateY(-20px) translateX(${Math.random() > 0.5 ? '20px' : '-20px'});
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

        @keyframes burst {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) translateY(-80px);
          }
        }

        .animate-float {
          animation: float linear forwards;
        }
      `}</style>
    </div>
  );
}

export default Balloon;
