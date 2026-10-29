'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api/endpoints';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['.csv', '.json', '.pcap', '.log'];
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileTypeError(file: File): string | null {
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!ACCEPTED_TYPES.includes(ext)) {
    return `Unsupported file type "${ext}". Accepted: ${ACCEPTED_TYPES.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${formatBytes(file.size)}). Maximum: ${formatBytes(MAX_FILE_SIZE)}`;
  }
  return null;
}

export function DatasetUploadZone() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { mutate, isPending, isSuccess, reset } = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      // Simulate incremental progress
      let prog = 0;
      const iv = setInterval(() => {
        prog = Math.min(prog + Math.random() * 18, 92);
        setUploadProgress(Math.round(prog));
      }, 200);
      return api.uploadDataset(fd).finally(() => {
        clearInterval(iv);
        setUploadProgress(100);
      });
    },
    onSuccess: (data) => {
      toast.success(`Dataset "${data.filename}" queued for ingestion`, { description: data.message });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      setTimeout(() => {
        reset();
        setSelectedFile(null);
        setUploadProgress(0);
      }, 2000);
    },
    onError: (err) => {
      toast.error('Upload failed', { description: err instanceof Error ? err.message : 'Unknown error' });
      setUploadProgress(0);
    },
  });

  const handleFile = useCallback((file: File) => {
    const err = getFileTypeError(file);
    setFileError(err);
    setSelectedFile(err ? null : file);
    reset();
  }, [reset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload security dataset — drag and drop or click to browse"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isPending && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !isPending && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-12 text-center cursor-pointer transition-all duration-200 select-none',
          dragOver
            ? 'border-cyan-500 bg-cyan-950/20 scale-[1.01]'
            : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60',
          isPending && 'pointer-events-none opacity-70'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          onChange={handleInputChange}
          aria-hidden="true"
        />

        <div className={cn(
          'flex h-14 w-14 items-center justify-center rounded-xl border transition-colors mb-4',
          dragOver ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-400' : 'border-slate-700 bg-slate-800 text-slate-400'
        )}>
          <Upload className="h-6 w-6" />
        </div>

        <p className="text-sm font-medium text-slate-200 mb-1">
          {dragOver ? 'Drop to upload dataset' : 'Drag & drop dataset file'}
        </p>
        <p className="text-xs text-slate-400 mb-3">
          or click to browse — supports <span className="font-mono text-cyan-400">.csv .json .pcap .log</span>
        </p>
        <p className="text-[11px] text-slate-500 font-mono">Max size: 2 GB</p>
      </div>

      {/* File Error */}
      {fileError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !fileError && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
          <File className="h-5 w-5 shrink-0 text-indigo-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</p>
            <p className="text-xs text-slate-400 font-mono">{formatBytes(selectedFile.size)}</p>
          </div>
          {!isPending && !isSuccess && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        </div>
      )}

      {/* Upload Progress */}
      {isPending && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              Uploading &amp; queuing for ingestion…
            </span>
            <span className="font-mono text-cyan-400">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5 bg-slate-800" />
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !fileError && !isSuccess && (
        <Button
          onClick={() => mutate(selectedFile)}
          disabled={isPending}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold h-10"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading…</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Upload &amp; Process Dataset</>
          )}
        </Button>
      )}
    </div>
  );
}
