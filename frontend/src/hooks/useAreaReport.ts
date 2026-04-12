import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useAreaReports() {
  return useQuery({
    queryKey:  ["areaReports"],
    queryFn:   () => api.get("/area-reports").then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
}

export function useAreaReport(state: string | undefined, lga: string | undefined, neighbourhood?: string) {
  return useQuery({
    queryKey:  ["areaReport", state, lga, neighbourhood],
    queryFn:   () =>
      api.get(`/area-reports/${encodeURIComponent(state!)}/${encodeURIComponent(lga!)}`, {
        params: neighbourhood ? { neighbourhood } : {},
      }).then(r => r.data.data),
    enabled:   !!state && !!lga,
    staleTime: 5 * 60_000,
  });
}

export function useCreateAreaReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post("/area-reports", body).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["areaReports"] }),
  });
}

export function useUpvoteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/area-reports/${id}/upvote`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["areaReports"] }),
  });
}
