import { motion } from 'framer-motion';
import { Plus, UploadSimple } from '@phosphor-icons/react';
import UnifiedCard from './UnifiedCard';
import type { Memory, Todo, RAGSearchResult } from '../types';

interface UnifiedGridProps {
  items: (Memory | Todo | { document: RAGSearchResult['document']; isCitation?: boolean })[];
  type: 'memory' | 'todo';
  onCreateClick: () => void;
  onImportClick: () => void;
  onItemClick: (item: Memory | Todo | { document: RAGSearchResult['document']; isCitation?: boolean }) => void;
}

export default function UnifiedGrid({ items, type, onCreateClick, onImportClick, onItemClick }: UnifiedGridProps) {
  return (
    <div className="px-12 sm:px-16 lg:px-24 xl:px-32 2xl:px-40">
      <div className="columns-2 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4">
        {/* Create Card - Always first */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onCreateClick}
          className="break-inside-avoid mb-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[120px]"
        >
          <Plus size={32} weight="bold" className="text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center whitespace-nowrap">
            {type === 'memory' ? 'Create Memory' : 'Create Todo'}
          </p>
        </motion.div>

        {/* Import Card - Half the height of Create Memory, only show for memories */}
        {type === 'memory' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onImportClick}
            className="break-inside-avoid mb-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-3 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[60px]"
          >
            <UploadSimple size={20} weight="bold" className="text-gray-400 dark:text-gray-500 mb-1" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center whitespace-nowrap">
              Import
            </p>
          </motion.div>
        )}

        {/* Items Grid - Masonry layout */}
        {items.map((item, index) => {
          const itemId = 'id' in item ? item.id : ('document' in item ? item.document.id : `citation-${index}`);
          return (
            <div key={itemId} className="break-inside-avoid mb-4">
              <UnifiedCard
                item={item}
                type={type}
                onClick={() => onItemClick(item)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

