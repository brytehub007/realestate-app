import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "../lib/api";

export function useUploadImages(listingId: string) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach(f => form.append("images", f));
      return api.post(`/uploads/images/${listingId}`, form, {
        headers:          { "Content-Type": "multipart/form-data" },
        onUploadProgress: e => setProgress(Math.round((e.loaded / (e.total ?? 1)) * 100)),
      }).then(r => r.data.data);
    },
    onSuccess: () => {
      setProgress(0);
      qc.invalidateQueries({ queryKey: ["listing", listingId] });
    },
    onError: () => setProgress(0),
  });

  return { ...mutation, progress };
}

export function useUploadDocument(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, type, name }: { file: File; type: string; name: string }) => {
      const form = new FormData();
      form.append("document", file);
      form.append("type", type);
      form.append("name", name);
      return api.post(`/uploads/documents/${listingId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then(r => r.data.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listing", listingId] }),
  });
}

export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      api.delete(`/uploads/images/${imageId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function usePresignedUrl() {
  return useMutation({
    mutationFn: (docId: string) =>
      api.get(`/uploads/presigned/${docId}`).then(r => r.data.data.url as string),
  });
}
