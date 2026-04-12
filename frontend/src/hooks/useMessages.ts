import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import api from "../lib/api";
import { getSocket, connectSocket } from "../lib/socket";

export function useConversations() {
  return useQuery({
    queryKey:        ["conversations"],
    queryFn:         () => api.get("/conversations").then(r => r.data.data),
    refetchInterval: 15_000,
  });
}

export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey:     ["messages", conversationId],
    queryFn:      ({ pageParam = 1 }) =>
      api.get(`/conversations/${conversationId}/messages`, { params: { page: pageParam, limit: 30 } })
        .then(r => r.data),
    getNextPageParam: (last: any) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled:  !!conversationId,
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { recipientId: string; listingId?: string; firstMessage?: string }) =>
      api.post("/conversations", body).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useSendMessage(conversationId: string) {
  const qc     = useQueryClient();
  const socket = getSocket();

  return useMutation({
    mutationFn: (body: { text: string; isOffer?: boolean; offerAmount?: number }) =>
      api.post(`/conversations/${conversationId}/messages`, body).then(r => r.data.data),
    onSuccess: (message) => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      socket.emit("send_message", { conversationId, messageId: message.id });
    },
  });
}

export function useUpdateConversationStatus(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) =>
      api.patch(`/conversations/${conversationId}/status`, { status }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useRealtimeMessages(
  conversationId: string | undefined,
  onNewMessage: (msg: unknown) => void
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    connectSocket();
    const socket = getSocket();
    socket.emit("join_conversation", conversationId);

    function handleNew(msg: unknown) {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      onNewMessage(msg);
    }

    socket.on("new_message",   handleNew);
    socket.on("messages_read", () => qc.invalidateQueries({ queryKey: ["messages", conversationId] }));

    return () => {
      socket.emit("leave_conversation", conversationId);
      socket.off("new_message",   handleNew);
      socket.off("messages_read");
    };
  }, [conversationId]);
}
