import { useRef, useEffect, useState } from 'react';
import { CaretLeft, CaretRight, Globe, Coffee, FilmSlate, Book, Lightning, MapPin, ShoppingBag, Users, Trophy, ChatCircle, Folder } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { MemoryCategory, MemoryStats } from '../types';

// Category icons mapping
const CATEGORY_ICONS: Record<string, Icon> = {
  Websites: Globe,
  Food: Coffee,
  Movies: FilmSlate,
  Books: Book,
  Ideas: Lightning,
  Places: MapPin,
  Products: ShoppingBag,
  People: Users,
  Learnings: Trophy,
  Quotes: ChatCircle,
  Uncategorized: Folder,
};

interface CategoryFilterProps {
  categories: MemoryCategory[];
  stats: MemoryStats | null;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategoryFilter({
  categories,
  stats,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Check scroll position to show/hide arrows
  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const getCategoryIcon = (categoryName: string): Icon => {
    return CATEGORY_ICONS[categoryName] || Folder;
  };

  // Filter categories that have items
  const activeCategories = categories.filter(
    (c) => stats?.by_category[c.name] && stats.by_category[c.name] > 0
  );

  // Don't render if no categories with items
  if (activeCategories.length === 0) {
    return null;
  }

  return (
    <div className="relative px-4 sm:px-6 lg:px-12 xl:px-16 2xl:px-20">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 sm:left-2 lg:left-8 xl:left-12 2xl:left-16 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Scroll left"
        >
          <CaretLeft size={16} weight="bold" className="text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* All button */}
        <button
          onClick={() => onCategoryChange(null)}
          className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
            selectedCategory === null
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>

        {/* Category chips */}
        {activeCategories.map((category) => {
          const CategoryIcon = getCategoryIcon(category.name);
          const count = stats?.by_category[category.name] || 0;
          const isSelected = selectedCategory === category.name;

          return (
            <button
              key={category.id}
              onClick={() =>
                onCategoryChange(isSelected ? null : category.name)
              }
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                isSelected
                  ? 'text-white shadow-sm'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: isSelected
                  ? category.color_code
                  : `${category.color_code}20`,
                color: isSelected ? 'white' : category.color_code,
              }}
            >
              <CategoryIcon size={14} weight="regular" />
              <span>{category.name}</span>
              <span
                className={`ml-0.5 ${
                  isSelected ? 'opacity-80' : 'opacity-60'
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 sm:right-2 lg:right-8 xl:right-12 2xl:right-16 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Scroll right"
        >
          <CaretRight size={16} weight="bold" className="text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}
