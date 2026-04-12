import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { supabase } from "../config/supabase";
import { config }   from "../config";
import { logger }   from "../utils/logger";

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.cors.origins, credentials: true },
  });

  // Authenticate every socket connection using the Supabase JWT
  io.use(async (socket: Socket & { userId?: string }, next) => {
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Authentication required"));

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return next(new Error("Invalid token"));

    (socket as any).userId = user.id;
    next();
  });

  io.on("connection", (socket: Socket & { userId?: string }) => {
    const userId = (socket as any).userId!;
    socket.join(`user:${userId}`);
    logger.debug(`Socket connected: ${userId}`);

    socket.on("join_conversation",  (cid: string) => socket.join(`conv:${cid}`));
    socket.on("leave_conversation", (cid: string) => socket.leave(`conv:${cid}`));

    socket.on("send_message", ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      socket.to(`conv:${conversationId}`).emit("new_message", { conversationId, messageId });
    });

    socket.on("typing", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("user_typing", { userId, conversationId });
    });

    socket.on("disconnect", () => logger.debug(`Socket disconnected: ${userId}`));
  });

  return io;
}
