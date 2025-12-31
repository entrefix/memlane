import { motion } from 'framer-motion';
import type { Memory, Todo, RAGSearchResult } from '../types';

interface UnifiedCardProps {
  item: Memory | Todo | { document: RAGSearchResult['document']; isCitation?: boolean };
  type: 'memory' | 'todo';
  onClick: () => void;
}

export default function UnifiedCard({ item, type, onClick }: UnifiedCardProps) {
  const getTitle = () => {
    if ('document' in item) {
      // Citation from RAG
      return item.document.title || item.document.content.substring(0, 50);
    }
    if (type === 'memory') {
      const memory = item as Memory;
      // For memories, use summary or first part of content as title
      return memory.summary || memory.content.substring(0, 50);
    } else {
      const todo = item as Todo;
      return todo.title;
    }
  };

  const getSummary = () => {
    if ('document' in item) {
      // Citation from RAG
      return item.document.content.substring(0, 150);
    }
    if (type === 'memory') {
      const memory = item as Memory;
      return memory.content.length > 150 ? memory.content.substring(0, 150) + '...' : memory.content;
    } else {
      const todo = item as Todo;
      return todo.description || '';
    }
  };

  const title = getTitle();
  const summary = getSummary();
  const isCitation = 'document' in item && (item as any).isCitation;
  const isProcessing = 'isProcessing' in item && (item as any).isProcessing;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all cursor-pointer relative ${
        isCitation ? 'ring-2 ring-primary-500/50' : ''
      } ${isProcessing ? 'opacity-70' : ''}`}
    >
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 rounded-lg backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Processing...</span>
          </div>
        </div>
      )}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-3 mb-1">
          {title}
        </h3>
        {summary && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-6">
            {summary}
          </p>
        )}
      </div>
      {isCitation && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
            From Ask AI
          </span>
        </div>
      )}
    </motion.div>
  );
}

