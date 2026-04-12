import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useMyEscrows() {
  return useQuery({
    queryKey: ["escrows", "me"],
    queryFn:  () => api.get("/escrow/me").then(r => r.data.data),
  });
}

export function useEscrow(id: string | undefined) {
  return useQuery({
    queryKey:        ["escrow", id],
    queryFn:         () => api.get(`/escrow/${id}`).then(r => r.data.data),
    enabled:         !!id,
    refetchInterval: 10_000,
  });
}

export function useInitiateEscrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, amount }: { listingId: string; amount: number }) =>
      api.post("/escrow", { listingId, amount }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escrows"] }),
  });
}

export function useFundEscrow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentReference, gateway }: { paymentReference: string; gateway: string }) =>
      api.patch(`/escrow/${id}/fund`, { paymentReference, gateway }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escrow", id] }),
  });
}

export function useConfirmAgreement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/escrow/${id}/agree`).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["escrow", id] }),
  });
}

export function useCompleteEscrow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/escrow/${id}/complete`).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["escrow", id] }),
  });
}

export function useDisputeEscrow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      api.patch(`/escrow/${id}/dispute`, { reason }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escrow", id] }),
  });
}
