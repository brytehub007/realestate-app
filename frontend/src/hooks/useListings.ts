import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "../lib/api";

export interface ListingFilters {
  category?:      string;
  listingType?:   string;
  state?:         string;
  lga?:           string;
  neighbourhood?: string;
  minPrice?:      number;
  maxPrice?:      number;
  bedrooms?:      number;
  bathrooms?:     number;
  minSize?:       number;
  maxSize?:       number;
  tier?:          string;
  q?:             string;
  sortBy?:        string;
  page?:          number;
  limit?:         number;
}

export function useListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey:        ["listings", filters],
    queryFn:         () => api.get("/listings", { params: filters }).then(r => r.data),
    placeholderData: keepPreviousData,
    staleTime:       30_000,
  });
}

export function useFeaturedListings() {
  return useQuery({
    queryKey: ["listings", "featured"],
    queryFn:  () =>
      api.get("/listings", { params: { tier: "premium,verified", limit: 8, sortBy: "newest" } })
        .then(r => r.data.data),
    staleTime: 60_000,
  });
}

export function useListing(slug: string | undefined) {
  return useQuery({
    queryKey:  ["listing", slug],
    queryFn:   () => api.get(`/listings/${slug}`).then(r => r.data.data),
    enabled:   !!slug,
    staleTime: 30_000,
  });
}

export function useUserListings(userId: string | undefined) {
  return useQuery({
    queryKey: ["listings", "user", userId],
    queryFn:  () => api.get(`/listings/user/${userId}`).then(r => r.data.data),
    enabled:  !!userId,
  });
}

export function useSavedListings() {
  return useQuery({
    queryKey: ["listings", "saved"],
    queryFn:  () => api.get("/listings/saved").then(r => r.data.data),
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post("/listings", body).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useUpdateListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch(`/listings/${id}`, body).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["listing", id] });
    },
  });
}

export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/listings/${id}/save`).then(r => r.data.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["listing", id] });
      qc.invalidateQueries({ queryKey: ["listings", "saved"] });
    },
  });
}

export function usePublishListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/listings/${id}/publish`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}
