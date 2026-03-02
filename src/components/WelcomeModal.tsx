import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Показывать только при первом заходе (или при каждой перезагрузке для MVP)
  useEffect(() => {
    const hasSeen = sessionStorage.getItem('algo-welcome');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  function handleClose() {
    setIsOpen(false);
    sessionStorage.setItem('algo-welcome', 'true');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1117]/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[#161b22] border border-white/10 p-8 rounded-2xl max-w-lg w-full shadow-[0_0_40px_rgba(0,255,136,0.1)] relative overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Неоновый акцент сверху */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-[#00ff88] to-violet-500" />
            
            <h2 className="text-2xl font-bold tracking-widest text-white uppercase mb-2">
              Welcome to Algo<span className="text-[#00ff88]">-Crafter</span>
            </h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              Visual algorithmic trading engine. No code required. Build autonomous trading bots by connecting logical nodes.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold shrink-0 border border-violet-500/30">1</div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Spawn a Condition</h4>
                  <p className="text-xs text-white/50">Create a trigger based on live market price (e.g. Price &lt; 64000).</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded bg-[#ff4d4d]/20 text-[#ff4d4d] flex items-center justify-center font-bold shrink-0 border border-[#ff4d4d]/30">2</div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Spawn an Action</h4>
                  <p className="text-xs text-white/50">Define what the bot should do (e.g. BUY $1000 or SELL 50%).</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded bg-[#00ff88]/20 text-[#00ff88] flex items-center justify-center font-bold shrink-0 border border-[#00ff88]/30">3</div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Connect & Automate</h4>
                  <p className="text-xs text-white/50">Drag a wire from Condition to Action. Turn on the simulation and watch the sparks fly!</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/40 text-[#00ff88] text-sm font-bold tracking-widest uppercase hover:bg-[#00ff88]/20 hover:border-[#00ff88] transition-all shadow-[0_0_15px_rgba(0,255,136,0.2)]"
            >
              Initialize Engine
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}