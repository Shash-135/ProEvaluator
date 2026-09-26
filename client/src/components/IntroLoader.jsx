import React from 'react';

export const IntroLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090d16]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        className="w-48 h-48 drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="gitToGrade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Container Box */}
        <rect x="20" y="20" width="160" height="160" rx="40" fill="#0f172a" />

        {/* Animated Path */}
        <path
          d="M 50 115 C 50 85, 70 65, 80 80 L 95 100 L 115 130 L 155 70"
          fill="none"
          stroke="url(#gitToGrade)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw"
        />

        {/* Start Node */}
        <circle cx="50" cy="115" r="9" fill="#3b82f6" stroke="#ffffff" strokeWidth="3" />

        {/* End Checkmark Success Node */}
        <circle cx="155" cy="70" r="7" fill="#10b981" className="animate-pulse" />
      </svg>

      <style>{`
        @keyframes drawCheck {
          0% {
            stroke-dasharray: 220;
            stroke-dashoffset: 220;
          }
          50% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 220;
            stroke-dashoffset: 220;
          }
        }
        .animate-draw {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: drawCheck 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};
