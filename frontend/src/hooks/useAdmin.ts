import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useAdminDashboard() {
  return useQuery({
    queryKey:        ["admin", "dashboard"],
    queryFn:         () => api.get("/admin/dashboard").then(r => r.data.data),
    refetchInterval: 30_000,
  });
}

export function useAdminEscrows(status?: string) {
  return useQuery({
    queryKey: ["admin", "escrows", status],
    queryFn:  () => api.get("/admin/escrows", { params: { status } }).then(r => r.data.data),
  });
}

export function useApproveListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/listings/${id}/approve`).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useRejectListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/listings/${id}/reject`).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/suspend`).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useVerifyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/documents/${id}/verify`).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/reports/${id}/resolve`).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}
