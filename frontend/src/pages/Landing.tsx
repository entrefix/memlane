import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';

function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-20 bg-gradient-to-br from-primary-400/10 via-primary-500/5 to-secondary-500/10 dark:from-primary-900/20 dark:via-primary-800/10 dark:to-secondary-900/20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading text-gray-900 dark:text-white mb-6 leading-tight">
            I've been forgetting important things for years
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Movie suggestions from friends. Personal improvement notes. That solution I thought of in the shower. 
          </p>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            So I built Mr.Brain. It's my second brain – everything I capture gets organized, indexed, and searchable. 
            I can ask it questions. It remembers what I forget.
          </p>

          {/* Imposition text */}
          <div className="mb-12 space-y-1 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-2xl md:text-3xl font-heading text-gray-800 dark:text-gray-200"
            >
              Starting 2026, I will remember everything that matters
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-xl md:text-2xl font-heading text-gray-700 dark:text-gray-300"
            >
              Starting 2026, I will remember everything that matters
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-lg md:text-xl font-heading text-gray-600 dark:text-gray-400"
            >
              Starting 2026, I will remember everything that matters
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-base md:text-lg font-heading text-gray-500 dark:text-gray-500"
            >
              Starting 2026, I will remember everything that matters
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-sm md:text-base font-heading text-gray-400 dark:text-gray-600"
            >
              Starting 2026, I will remember everything that matters
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-xs md:text-sm font-heading text-gray-400 dark:text-gray-600"
            >
              Starting 2026, I will remember everything that matters
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              to="/register"
              className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
            >
              <span>Start Remembering</span>
              <ArrowRight size={24} weight="regular" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Sign in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section className="py-20 px-6 bg-surface-light dark:bg-surface-dark">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xl md:text-2xl text-gray-900 dark:text-white mb-12 font-medium text-center">
            If I don't write it down, it's gone forever.
          </p>

          <h2 className="text-3xl md:text-4xl font-heading text-gray-900 dark:text-white mb-6">
            How it works
          </h2>
          
          <div className="space-y-8 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              You capture things. Ideas, notes, links, movie suggestions – whatever. Just type it in. 
              No forms, no categories to pick from. Just capture.
            </p>
            
            <p>
              AI automatically organizes everything. It categorizes your memories – movies, books, ideas, 
              personal goals. It extracts the important bits from URLs. It even detects when you're asking 
              a question and fetches answers for you.
            </p>
            
            <p>
              Everything is searchable. Not just keyword search – semantic search. Ask "what movies did 
              I want to watch?" and it finds them, even if you never used the word "movie" when you saved it.
            </p>
            
            <p>
              You can chat with it. Ask questions about your notes and memories. It uses everything you've 
              saved to give you answers. It's like having a conversation with your past self.
            </p>
            
            <p className="pt-4 border-t border-gray-200 dark:border-gray-800">
              That's it. No complicated setup. No integrations. Just capture, organize, search, and ask. 
              2026 is the year I stop forgetting important shit.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12"
          >
            <Link
              to="/register"
              className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
            >
              <span>Try it</span>
              <ArrowRight size={24} weight="regular" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Main content */}
      <main>
        <Hero />
        <SolutionSection />
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 bg-surface-light dark:bg-surface-dark border-t border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="text-lg font-heading text-gray-900 dark:text-white">Mr.Brain</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your second brain for 2026. Never forget another idea.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            © 2026 Mr.Brain. Built to help you remember what matters.
          </p>
        </div>
      </footer>
    </div>
  );
}

