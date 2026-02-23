'use client';

import { useCallback, useState } from 'react';

interface MetaDropZoneProps {
  onUploadSuccess: () => void;
  lastUploadedAt: string | null;
}

export function MetaDropZone({ onUploadSuccess, lastUploadedAt }: MetaDropZoneProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setErrorMsg('Please upload an Excel (.xlsx) file.');
        setStatus('error');
        return;
      }

      setStatus('uploading');
      setErrorMsg('');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/admin/meta-export', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setStatus('success');
        onUploadSuccess();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
        setStatus('error');
      }
    },
    [onUploadSuccess]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      e.target.value = '';
    },
    [uploadFile]
  );

  return (
    <div
      className="rounded-lg border-2 border-dashed border-[#c8c2d8] bg-[#f5f3f9] p-6 text-center transition-colors hover:border-[#7c0667]"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6b6480]">
        Upload Meta Ads Export
      </p>
      <p className="mb-3 text-xs text-[#6b6480]">
        Drop your Meta Ads Manager .xlsx export here. Export from Meta for the same date range as
        selected above for accurate comparison.
      </p>
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleChange}
          disabled={status === 'uploading'}
        />
        <span
          className={`inline-block rounded-md px-4 py-2 text-sm font-semibold ${
            status === 'uploading'
              ? 'cursor-not-allowed bg-[#c8c2d8] text-[#6b6480]'
              : 'bg-[#1753a0] text-white hover:opacity-90'
          }`}
        >
          {status === 'uploading' ? 'Uploading…' : 'Choose file'}
        </span>
      </label>
      {lastUploadedAt && status !== 'uploading' && (
        <p className="mt-3 text-xs text-[#6b6480]">
          Last export: {new Date(lastUploadedAt).toLocaleString()}
        </p>
      )}
      {status === 'success' && (
        <p className="mt-3 text-sm font-medium text-[#1a7f5a]">Upload successful. Dashboard updated.</p>
      )}
      {status === 'error' && errorMsg && (
        <p className="mt-3 text-sm font-medium text-[#b8003c]">{errorMsg}</p>
      )}
    </div>
  );
}
