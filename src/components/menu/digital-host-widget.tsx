"use client";

import { useEffect, useState } from "react";

export function ChefNavBubble({
  text,
  chatOpen,
  onOpen,
}: {
  text: string;
  chatOpen: boolean;
  onOpen: () => void;
}) {
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSpeechBubble(false), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (chatOpen) setShowSpeechBubble(false);
  }, [chatOpen]);

  return (
    <div
      className={`z-50 transition-all duration-500 ease-out ${
        showSpeechBubble
          ? "mb-3 overflow-visible opacity-100"
          : "pointer-events-none mb-0 h-0 overflow-hidden opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-hidden={!showSpeechBubble}
        tabIndex={showSpeechBubble ? 0 : -1}
        className={`relative z-50 min-w-[240px] max-w-[280px] rounded-2xl border border-[#D4AF37]/40 bg-[#FFFDF9] px-3 py-1.5 text-left text-xs font-semibold text-[#5A121A] shadow-md transition-opacity duration-500 ease-out before:absolute before:bottom-[-9px] before:left-10 before:h-0 before:w-0 before:border-t-[8.5px] before:border-r-[8px] before:border-l-[8px] before:border-r-transparent before:border-l-transparent before:border-t-[#D4AF37]/40 before:content-[''] after:absolute after:bottom-[-8px] after:left-10 after:h-0 after:w-0 after:border-t-[8px] after:border-r-[8px] after:border-l-[8px] after:border-r-transparent after:border-l-transparent after:border-t-[#FFFDF9] after:content-[''] ${
          showSpeechBubble
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        {text}
      </button>
    </div>
  );
}
