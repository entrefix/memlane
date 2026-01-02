import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Paperclip, CircleNotch, CheckCircle } from '@phosphor-icons/react';
import { memoryApi } from '../api';
import type { Memory, UploadJobStatusResponse } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (memories: Memory[]) => void;
}

export default function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [jobStatus, setJobStatus] = useState<UploadJobStatusResponse | null>(null);
  const [importedMemories, setImportedMemories] = useState<Memory[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount or when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Reset state when modal closes
      setJobStatus(null);
      setImportedMemories([]);
      setUploadProgress('');
    }
  }, [isOpen]);

  const pollJobStatus = async (jobId: string) => {
    try {
      const status = await memoryApi.getUploadJobStatus(jobId);
      setJobStatus(status);

      // Update imported memories progressively
      if (status.memories.length > importedMemories.length) {
        const newMemories = status.memories.slice(importedMemories.length);
        setImportedMemories(status.memories);
        // Notify parent of new memories progressively
        onImportComplete(status.memories);
      }

      // Update progress message
      if (status.status === 'processing') {
        setUploadProgress(
          `Processing ${status.processed_items}/${status.total_items} items... (${status.progress}%)`
        );
      } else if (status.status === 'completed') {
        setUploadProgress(`Completed! Imported ${status.memories.length} memories.`);
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Close modal after a brief delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (status.status === 'failed') {
        setUploadProgress(`Failed: ${status.error_message || 'Unknown error'}`);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Failed to poll job status:', error);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsUploading(false);
      alert('Failed to check upload status');
    }
  };

  const handleFileUpload = async (file: File) => {
    // Get file extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    // Client-side validation - size limits
    const maxSize = ext === '.pdf' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is ${ext === '.pdf' ? '20' : '10'} MB.`);
      return;
    }

    const validTypes = ['.txt', '.md', '.pdf', '.json'];
    if (!validTypes.includes(ext)) {
      alert('Invalid file type. Supported: .txt, .md, .pdf, .json');
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);
    setImportedMemories([]);

    try {
      // Start the upload job
      const result = await memoryApi.startUploadJob(file);
      
      setUploadProgress(`Processing file...`);
      
      // Start polling for job status
      pollingIntervalRef.current = setInterval(() => {
        pollJobStatus(result.job_id);
      }, 1000); // Poll every second

      // Also poll immediately
      pollJobStatus(result.job_id);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to upload file';
      alert(errorMsg);
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Memories</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} weight="regular" className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <Paperclip
                size={48}
                weight="regular"
                className={`mx-auto mb-4 ${
                  dragActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Supported formats: .txt, .md, .pdf, .json
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.json"
                  onChange={handleFileInput}
                  disabled={isUploading}
                  className="hidden"
                />
                <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {isUploading ? (
                    <>
                      <CircleNotch size={16} weight="regular" className="animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    'Choose File'
                  )}
                </span>
              </label>
            </div>

            {uploadProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>{uploadProgress}</span>
                  {jobStatus && jobStatus.status !== 'failed' && (
                    <span className="font-medium">{jobStatus.progress}%</span>
                  )}
                </div>
                {jobStatus && jobStatus.status !== 'failed' && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        jobStatus.status === 'completed' ? 'bg-green-600' : 'bg-primary-600'
                      }`}
                      style={{ width: `${jobStatus.progress}%` }}
                    />
                  </div>
                )}

                {/* Show imported memories list */}
                {importedMemories.length > 0 && (
                  <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Imported Memories:
                    </p>
                    {importedMemories.map((memory) => (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <CheckCircle
                          size={16}
                          weight="fill"
                          className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {memory.summary || memory.content.substring(0, 50)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {memory.category}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

