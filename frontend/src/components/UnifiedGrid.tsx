import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, UploadSimple, CircleNotch, CheckCircle, XCircle } from '@phosphor-icons/react';
import UnifiedCard from './UnifiedCard';
import type { Memory, Todo, RAGSearchResult, UploadJobStatusResponse } from '../types';

interface UnifiedGridProps {
  items: (Memory | Todo | { document: RAGSearchResult['document']; isCitation?: boolean })[];
  type: 'memory' | 'todo';
  onCreateClick: () => void;
  onImportClick: () => void;
  onItemClick: (item: Memory | Todo | { document: RAGSearchResult['document']; isCitation?: boolean }) => void;
  onItemUpdate?: (todoId: string, currentStatus: 'pending' | 'completed') => void;
  onReorder?: (reorderedItems: Todo[]) => void;
  uploadStatus?: UploadJobStatusResponse | null;
}

export default function UnifiedGrid({ items, type, onCreateClick, onImportClick, onItemClick, onItemUpdate, onReorder, uploadStatus }: UnifiedGridProps) {
  const isUploading = uploadStatus && uploadStatus.status !== 'completed' && uploadStatus.status !== 'failed';
  const isCompleted = uploadStatus?.status === 'completed';
  const isFailed = uploadStatus?.status === 'failed';
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Only enable drag for todos
  const isTodoType = type === 'todo';

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!onReorder) return;
    const item = items[index];
    if (!('id' in item) || 'document' in item) return; // Skip citations
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Create a custom drag image
    if (e.currentTarget instanceof HTMLElement) {
      const dragImage = e.currentTarget.closest('.break-inside-avoid') as HTMLElement;
      if (dragImage) {
        e.dataTransfer.setDragImage(dragImage, e.clientX - dragImage.getBoundingClientRect().left, e.clientY - dragImage.getBoundingClientRect().top);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!onReorder || draggedIndex === null || draggedIndex === index) return;
    const item = items[index];
    if (!('id' in item) || 'document' in item) return; // Skip citations
    
    // For todos: Check if we're trying to move a completed item above a pending item
    if (isTodoType) {
      const draggedItem = items[draggedIndex];
      if ('id' in draggedItem && !('document' in draggedItem)) {
        const draggedTodo = draggedItem as Todo;
        const dropTodo = item as Todo;
        
        if (draggedTodo.status === 'completed' && dropTodo.status === 'pending') {
          e.dataTransfer.dropEffect = 'none';
          return;
        }
      }
    }
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!onReorder || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedItem = items[draggedIndex];
    const dropItem = items[dropIndex];
    
    // Skip if either is a citation
    if (!('id' in draggedItem) || 'document' in draggedItem || !('id' in dropItem) || 'document' in dropItem) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // For todos: Prevent completed items from moving above pending items
    if (isTodoType) {
      const draggedTodo = draggedItem as Todo;
      const dropTodo = dropItem as Todo;
      
      if (draggedTodo.status === 'completed' && dropTodo.status === 'pending') {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }
    }

    // Filter to get only items (not citations)
    const filteredItems = items.filter(item => 'id' in item && !('document' in item));
    
    // Find indices in the filteredItems array
    const draggedItemIndex = filteredItems.findIndex(item => 'id' in item && item.id === (draggedItem as any).id);
    const dropItemIndex = filteredItems.findIndex(item => 'id' in item && item.id === (dropItem as any).id);
    
    if (draggedItemIndex === -1 || dropItemIndex === -1) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create new array with reordered items
    const newItems = [...filteredItems];
    const [removed] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(dropItemIndex, 0, removed);

    // Call reorder handler with reordered items
    if (onReorder) {
      onReorder(newItems as any);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="px-6 sm:px-16 lg:px-24 xl:px-32 2xl:px-40">
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
            onClick={isUploading ? undefined : onImportClick}
            className={`break-inside-avoid mb-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed p-3 transition-all flex flex-col items-center justify-center min-h-[60px] ${
              isUploading
                ? 'border-primary-400 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/20 cursor-default'
                : isCompleted
                ? 'border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/20 cursor-default'
                : isFailed
                ? 'border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-900/20 cursor-default'
                : 'border-gray-300 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer'
            }`}
          >
            {isUploading ? (
              <>
                <div className="relative">
                  <CircleNotch size={20} weight="bold" className="text-primary-500 dark:text-primary-400 animate-spin" />
                </div>
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400 text-center whitespace-nowrap mt-1">
                  {uploadStatus?.progress || 0}%
                </p>
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle size={20} weight="bold" className="text-green-500 dark:text-green-400 mb-1" />
                <p className="text-sm font-medium text-green-600 dark:text-green-400 text-center whitespace-nowrap">
                  Done!
                </p>
              </>
            ) : isFailed ? (
              <>
                <XCircle size={20} weight="bold" className="text-red-500 dark:text-red-400 mb-1" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center whitespace-nowrap">
                  Failed
                </p>
              </>
            ) : (
              <>
                <UploadSimple size={20} weight="bold" className="text-gray-400 dark:text-gray-500 mb-1" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center whitespace-nowrap">
                  Import
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* Items Grid - Masonry layout */}
        {items.map((item, index) => {
          const itemId = 'id' in item ? item.id : ('document' in item ? item.document.id : `citation-${index}`);
          const isTodo = isTodoType && 'id' in item && !('document' in item);
          const isMemory = !isTodoType && 'id' in item && !('document' in item);
          const todoItem = isTodo ? (item as Todo) : null;
          const isTodoCompleted = todoItem?.status === 'completed' || false;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          
          // Enable drag for pending todos or memories
          const dragHandleProps = ((isTodo && onReorder && !isTodoCompleted) || (isMemory && onReorder)) ? {
            draggable: true,
            onDragStart: (e: React.DragEvent) => {
              e.stopPropagation();
              handleDragStart(e, index);
            },
            onDragEnd: (e: React.DragEvent) => {
              e.stopPropagation();
              handleDragEnd();
            },
          } : undefined;

          return (
            <div
              key={itemId}
              className={`break-inside-avoid mb-4 ${
                isDragOver ? 'ring-2 ring-primary-500 rounded-lg' : ''
              }`}
              onDragOver={(dragHandleProps || isMemory) ? (e) => handleDragOver(e, index) : undefined}
              onDragLeave={(dragHandleProps || isMemory) ? handleDragLeave : undefined}
              onDrop={(dragHandleProps || isMemory) ? (e) => handleDrop(e, index) : undefined}
            >
              <UnifiedCard
                item={item}
                type={type}
                onClick={() => onItemClick(item)}
                onStatusToggle={onItemUpdate}
                isDragging={isDragging}
                dragHandleProps={dragHandleProps}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

