import { motion, AnimatePresence, Variants } from "framer-motion";
import { useEffect, useState } from "react";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 4500); // 4.5s splash
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Staggered text animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 1 },
    },
  };

  const letterVariants: Variants = {
    hidden: { opacity: 0, y: 20, rotateX: 90 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { type: "spring", stiffness: 100, damping: 10 },
    },
  };

  const fullForm = "Empowering Remote Users, Knowledge & Ambition".split("");

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background perspective-1000"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-primary/30 blur-[120px] mix-blend-multiply"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.3, 0.8, 0.3],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/30 blur-[120px] mix-blend-multiply"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.3, 0.8, 0.3],
                  rotate: [360, 180, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <motion.div
              initial={{ scale: 0, opacity: 0, rotateZ: -180 }}
              animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
              transition={{ duration: 1.5, type: "spring", bounce: 0.5 }}
              className="relative z-10 flex flex-col items-center preserve-3d"
            >
              {/* Logo / Icon */}
              <motion.div
                animate={{
                  rotateY: [0, 360, 720, 1080],
                  rotateX: [0, 180, 360, 180],
                  scale: [1, 1.2, 1, 1.3],
                }}
                transition={{ duration: 4, ease: "easeInOut" }}
                className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-primary via-blue-500 to-purple-600 p-1 shadow-[0_0_80px_rgba(37,99,235,0.6)] mb-8 flex items-center justify-center transform-gpu"
              >
                <div className="w-full h-full bg-background/90 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-purple-600">
                    E
                  </span>
                </div>
              </motion.div>

              {/* Text */}
              <motion.h1
                initial={{ y: 50, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 1, type: "spring" }}
                className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-purple-500 drop-shadow-sm mb-4"
              >
                ERUKA
              </motion.h1>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="text-sm md:text-lg font-bold tracking-wider text-muted-foreground uppercase text-center flex flex-wrap justify-center max-w-2xl px-4"
              >
                {fullForm.map((char, index) => (
                  <motion.span
                    key={index}
                    variants={letterVariants}
                    className={char === " " ? "mx-1" : ""}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.div>

              {/* Crazy Loading Ring */}
              <div className="relative mt-12 w-24 h-24">
                <motion.div
                  className="absolute inset-0 border-4 border-t-primary border-r-purple-500 border-b-transparent border-l-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-2 border-4 border-b-primary border-l-purple-500 border-t-transparent border-r-transparent rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex flex-col flex-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
