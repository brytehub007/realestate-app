import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey:  ["user", userId],
    queryFn:   () => api.get(`/users/${userId}`).then(r => r.data.data),
    enabled:   !!userId,
    staleTime: 60_000,
  });
}

export function useUserReviews(userId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", userId],
    queryFn:  () => api.get(`/users/${userId}/reviews`).then(r => r.data.data),
    enabled:  !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch("/users/me", body).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subjectId: string; listingId?: string; rating: number; text: string; type: string }) =>
      api.post("/users/reviews", body).then(r => r.data.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["reviews", vars.subjectId] });
      qc.invalidateQueries({ queryKey: ["user",    vars.subjectId] });
    },
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey:        ["notifications", { unreadOnly }],
    queryFn:         () =>
      api.get("/users/me/notifications", { params: { unread: unreadOnly } })
        .then(r => r.data.data),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/users/me/notifications/read-all").then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSavedSearches() {
  return useQuery({
    queryKey: ["savedSearches"],
    queryFn:  () => api.get("/users/me/saved-searches").then(r => r.data.data),
  });
}

export function useCreateSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post("/users/me/saved-searches", body).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedSearches"] }),
  });
}

export function useUpdateSavedSearch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch(`/users/me/saved-searches/${id}`, body).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedSearches"] }),
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/saved-searches/${id}`).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["savedSearches"] }),
  });
}
