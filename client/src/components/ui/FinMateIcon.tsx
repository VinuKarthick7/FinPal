/**
 * FinMate Official Icon Component
 * 
 * The official mascot/icon for FinMate - FinPal's AI-powered financial assistant.
 * This cute robot chatbot icon should be used consistently across the entire app.
 * 
 * Features:
 * - Cute robot design with friendly face
 * - Cyan/teal color scheme matching FinPal brand
 * - Crisp, sharp SVG rendering at any size
 * - Customizable size prop
 */

import React from 'react';

interface FinMateIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
  triggerAnimation?: boolean;
}

export const FinMateIcon: React.FC<FinMateIconProps> = ({ 
  size = 32, 
  className = "",
  animate = false,
  triggerAnimation = false 
}) => {
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Trigger animation when triggerAnimation prop changes
  React.useEffect(() => {
    if (triggerAnimation) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000); // 2 second animation
      return () => clearTimeout(timer);
    }
  }, [triggerAnimation]);

  // Auto-animate on mount if animate prop is true (for login)
  React.useEffect(() => {
    if (animate) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 3000); // 3 second welcome animation
      return () => clearTimeout(timer);
    }
  }, [animate]);

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      width={size} 
      height={size} 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* Antenna ball */}
      <circle cx="50" cy="8" r="8" fill="#38BDF8"/>
      
      {/* Antenna stick */}
      <rect x="46" y="14" width="8" height="10" rx="4" fill="#38BDF8"/>
      
      {/* Main head - rounded square shape */}
      <rect x="12" y="24" width="76" height="68" rx="20" fill="#38BDF8"/>
      
      {/* Head shine/highlight */}
      <rect x="18" y="30" width="28" height="10" rx="5" fill="white" opacity="0.35"/>
      
      {/* Face screen - dark rounded rectangle */}
      <rect x="20" y="36" width="60" height="48" rx="14" fill="#1E293B"/>
      
      {/* Left eye - white oval (this one blinks) */}
      <ellipse 
        cx="38" 
        cy="56" 
        rx="9" 
        ry="11" 
        fill="white"
        className={isAnimating ? 'finmate-blink' : ''}
        style={{ transformOrigin: '38px 56px' }}
      />
      
      {/* Right eye - white oval (stays normal) */}
      <ellipse cx="62" cy="56" rx="9" ry="11" fill="white"/>
      
      {/* Smile - curved line */}
      <path 
        d="M36 74 Q50 86 64 74" 
        stroke="white" 
        strokeWidth="4" 
        strokeLinecap="round" 
        fill="none"
        className={isAnimating ? 'finmate-smile' : ''}
        style={{ transformOrigin: '50px 78px' }}
      />
    </svg>
  );
};

export default FinMateIcon;
