import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  FileArrowUp,
  Globe,
  Intersect,
  ChatCircle,
  ArrowRight,
  ArrowLeft,
} from '@phosphor-icons/react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: FileArrowUp,
    title: 'Capture Everything',
    description: 'Add memories by typing, or import from Google Keep, markdown, PDF, and text files. We summarize and store them for you.',
  },
  {
    icon: Brain,
    title: 'Ask Your Brain',
    description: 'Forgot something? Just ask naturally. Your memories are searchable like a second brain.',
  },
  {
    icon: Intersect,
    title: 'Multiple Search Modes',
    description: 'Search memories, browse the web, combine both, or chat directly with AI. Press Tab to switch.',
    showModes: true,
  },
];

const modes = [
  { icon: Brain, label: 'Memories', color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30' },
  { icon: Globe, label: 'Internet', color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  { icon: Intersect, label: 'Hybrid', color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' },
  { icon: ChatCircle, label: 'AI Only', color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleComplete = () => {
    localStorage.setItem('memlane_onboarding_complete', 'true');
    onClose();
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleComplete}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          style={{
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Content - Fixed height to prevent size changes */}
          <div className="px-6 py-6">
            <div className="h-[280px] flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center flex-1 flex flex-col"
                >
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Icon size={32} weight="regular" className="text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Mode icons - always reserve space */}
                  <div className="flex justify-center gap-3 mt-4 flex-1 items-start">
                    {step.showModes ? (
                      modes.map((mode) => {
                        const ModeIcon = mode.icon;
                        return (
                          <div key={mode.label} className="flex flex-col items-center gap-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode.color}`}>
                              <ModeIcon size={20} weight="regular" />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{mode.label}</span>
                          </div>
                        );
                      })
                    ) : null}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-primary-500 w-4'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${
                  currentStep === 0 ? 'invisible' : ''
                }`}
              >
                <ArrowLeft size={14} weight="bold" />
                Back
              </button>

              <button
                onClick={nextStep}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ArrowRight size={14} weight="bold" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
