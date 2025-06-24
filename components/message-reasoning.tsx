'use client';

import { useState } from 'react';
import { ChevronDownIcon, LoaderIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Markdown } from './markdown';

interface MessageReasoningProps {
  isLoading: boolean;
  reasoning: string;
  duration?: number; // Optional reasoning duration in ms
}

export function MessageReasoning({
  isLoading,
  reasoning,
  duration,
}: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '1rem',
      marginBottom: '0.5rem',
    },
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'a few seconds';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="flex flex-col">
      {isLoading ? (
        <div className="flex flex-row gap-2 items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
          <div className="font-medium text-amber-800">Reasoning...</div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="font-medium text-blue-800">
            Reasoned for {formatDuration(duration)}
          </div>
          <button
            data-testid="message-reasoning-toggle"
            type="button"
            className="cursor-pointer text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            <ChevronDownIcon className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            data-testid="message-reasoning"
            key="content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="pl-4 text-zinc-600 dark:text-zinc-400 border-l-2 border-blue-200 flex flex-col gap-4 bg-blue-25"
          >
            <Markdown>{reasoning}</Markdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
