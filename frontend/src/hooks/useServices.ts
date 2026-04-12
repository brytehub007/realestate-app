import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export interface ServiceProvider {
  id:            string;
  type:          string;
  name:          string;
  company?:      string;
  location:      string;
  state:         string;
  rating:        number;
  reviews:       number;
  completedJobs: number;
  responseTime?: string;
  priceFrom:     number;
  priceTo?:      number;
  verified:      boolean;
  featured:      boolean;
  available:     boolean;
  certifications: string[];
  specialties:   string[];
  bio:           string;
  avatar:        string;
  avatarColor?:  string;
  reviewSnippets?: { author: string; rating: number; text: string }[];
  turnaround?:   string;
}

interface ServiceRequest {
  providerId:  string;
  type:        string;
  description: string;
  location:    string;
  budget?:     number;
}

export function useServiceProviders(type?: string) {
  return useQuery({
    queryKey: ["services", type],
    queryFn: async () => {
      const params = type && type !== "all" ? { type } : {};
      const { data } = await api.get("/services/providers", { params });
      return (data.data ?? data) as ServiceProvider[];
    },
    staleTime: 5 * 60 * 1000,
    retry:     false,
  });
}

export function useServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceRequest) =>
      api.post("/services/requests", payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-requests"] }),
  });
}

export function useMyServiceRequests() {
  return useQuery({
    queryKey: ["service-requests"],
    queryFn: async () => {
      const { data } = await api.get("/services/requests/mine");
      return (data.data ?? data) as Record<string, unknown>[];
    },
    staleTime: 60_000,
    retry:     false,
  });
}
