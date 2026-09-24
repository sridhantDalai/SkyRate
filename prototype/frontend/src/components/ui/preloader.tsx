'use client';

import React, { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';

export function Preloader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Total animation time is 4.5 seconds
    const timer = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <>
      <style>{`
        .preloader-wrapper {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
        }

        .curtain {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50vw;
          background-color: #000000;
          z-index: 10000;
        }

        .curtain-left {
          left: 0;
          animation: slideLeft 1s cubic-bezier(0.7, 0, 0.3, 1) 3.5s forwards;
        }

        .curtain-right {
          right: 0;
          animation: slideRight 1s cubic-bezier(0.7, 0, 0.3, 1) 3.5s forwards;
        }

        .preloader-content {
          position: absolute;
          inset: 0;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          animation: fadeOut 0.5s ease-out 3.4s forwards;
        }

        .plane-wrapper {
          position: absolute;
          animation: flySequence 2.5s ease-in-out forwards;
        }

        .text-wrapper {
          opacity: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: textReveal 2s ease-out 1.5s forwards;
        }

        @keyframes slideLeft {
          to { transform: translateX(-100%); }
        }

        @keyframes slideRight {
          to { transform: translateX(100%); }
        }

        @keyframes flySequence {
          0% {
            transform: translateY(100vh) scale(0.8);
            opacity: 0;
          }
          15% {
            transform: translateY(0) scale(1.2);
            opacity: 1;
          }
          45% {
            transform: translateY(0) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes textReveal {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          15% {
            opacity: 1;
            transform: scale(1);
          }
          85% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.05);
          }
        }

        @keyframes fadeOut {
          to {
            opacity: 0;
            visibility: hidden;
          }
        }
      `}</style>

      <div className="preloader-wrapper">
        <div className="curtain curtain-left" />
        <div className="curtain curtain-right" />
        
        <div className="preloader-content">
          <div className="plane-wrapper">
            <Plane
              className="w-24 h-24 text-[#0A58FF] -rotate-45"
              strokeWidth={3}
              fill="none"
            />
          </div>
          
          <div className="text-wrapper">
            <h1 className="text-5xl sm:text-7xl font-black tracking-widest text-white">
              SKYRATE
            </h1>
            <p className="text-lg sm:text-xl font-bold text-neutral-400 mt-4 tracking-widest">
              by O(1)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
