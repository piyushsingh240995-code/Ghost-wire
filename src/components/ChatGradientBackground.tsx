import { motion } from 'motion/react';
import { Theme } from '../lib/themes';

interface ChatGradientBackgroundProps {
  theme?: Theme;
}

export default function ChatGradientBackground({ theme }: ChatGradientBackgroundProps) {
  const themeId = theme?.id || 'ghostwire';

  // Customize subtle accent colors harmonized with each app theme
  const getThemeColors = () => {
    switch (themeId) {
      case 'ghostwire':
        return {
          blob1: 'rgba(244, 63, 94, 0.12)', // rose
          blob2: 'rgba(99, 102, 241, 0.10)', // indigo
          blob3: 'rgba(168, 85, 247, 0.08)', // purple
          gridStroke: 'rgba(255, 255, 255, 0.025)'
        };
      case 'override':
        return {
          blob1: 'rgba(239, 68, 68, 0.12)', // red
          blob2: 'rgba(249, 115, 22, 0.09)', // orange
          blob3: 'rgba(185, 28, 28, 0.08)', // dark red
          gridStroke: 'rgba(255, 255, 255, 0.03)'
        };
      case 'spectre':
        return {
          blob1: 'rgba(16, 185, 129, 0.12)', // emerald
          blob2: 'rgba(14, 165, 233, 0.10)', // sky
          blob3: 'rgba(20, 184, 166, 0.08)', // teal
          gridStroke: 'rgba(16, 185, 129, 0.03)'
        };
      case 'monochrome':
        return {
          blob1: 'rgba(255, 255, 255, 0.06)',
          blob2: 'rgba(161, 161, 170, 0.05)',
          blob3: 'rgba(255, 255, 255, 0.04)',
          gridStroke: 'rgba(255, 255, 255, 0.02)'
        };
      case 'phantom':
      default:
        return {
          blob1: 'rgba(168, 85, 247, 0.12)', // purple
          blob2: 'rgba(59, 130, 246, 0.10)', // blue
          blob3: 'rgba(236, 72, 153, 0.08)', // pink
          gridStroke: 'rgba(255, 255, 255, 0.025)'
        };
    }
  };

  const colors = getThemeColors();

  return (
    <div 
      aria-hidden="true" 
      className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none"
    >
      {/* Dynamic Animated Organic Gradient SVG */}
      <svg 
        className="w-full h-full object-cover" 
        viewBox="0 0 800 1200" 
        preserveAspectRatio="xMidYMid slice" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radial blur filters for liquid soft gradients */}
          <filter id="chatGlowBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="90" result="blur" />
          </filter>

          {/* Micro Geometric Dot/Grid pattern overlay for depth */}
          <pattern id="chatMicroGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="0.75" fill={colors.gridStroke} />
          </pattern>
        </defs>

        {/* Subtle dot matrix texture across chat canvas */}
        <rect width="100%" height="100%" fill="url(#chatMicroGrid)" />

        {/* Liquid moving gradient blobs */}
        <g filter="url(#chatGlowBlur)">
          {/* Primary top-left ambient orb */}
          <motion.circle
            cx="240"
            cy="280"
            r="220"
            fill={colors.blob1}
            animate={{
              cx: [240, 360, 200, 240],
              cy: [280, 200, 380, 280],
              r: [220, 260, 200, 220],
              scale: [1, 1.08, 0.95, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Secondary bottom-right ambient orb */}
          <motion.circle
            cx="580"
            cy="820"
            r="260"
            fill={colors.blob2}
            animate={{
              cx: [580, 480, 620, 580],
              cy: [820, 920, 750, 820],
              r: [260, 220, 280, 260],
              scale: [1, 0.92, 1.06, 1],
            }}
            transition={{
              duration: 26,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5
            }}
          />

          {/* Tertiary central floating pulse */}
          <motion.circle
            cx="400"
            cy="550"
            r="190"
            fill={colors.blob3}
            animate={{
              cx: [400, 320, 480, 400],
              cy: [550, 630, 490, 550],
              r: [190, 230, 180, 190],
              opacity: [0.7, 1, 0.8, 0.7]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3
            }}
          />
        </g>
      </svg>
    </div>
  );
}
