// SPDX-License-Identifier: MIT
import { useCallback, useState } from "react";

export interface UseAvatarUploadOptions {
  uploadFn: (id: string, file: File) => Promise<string>;
  deleteFn: (id: string) => Promise<void>;
  onSuccess?: () => Promise<void>;
}

export function useAvatarUpload({ uploadFn, deleteFn, onSuccess }: UseAvatarUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = useCallback(
    async (id: string, file: File): Promise<string> => {
      setIsUploading(true);
      setError(null);
      try {
        const url = await uploadFn(id, file);
        if (onSuccess) await onSuccess();
        return url;
      } catch (err: any) {
        const msg = err.message || "Failed to upload avatar";
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFn, onSuccess],
  );

  const deleteAvatar = useCallback(
    async (id: string): Promise<void> => {
      setIsUploading(true);
      setError(null);
      try {
        await deleteFn(id);
        if (onSuccess) await onSuccess();
      } catch (err: any) {
        const msg = err.message || "Failed to delete avatar";
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [deleteFn, onSuccess],
  );

  return {
    uploadAvatar,
    deleteAvatar,
    isUploading,
    error,
  };
}
