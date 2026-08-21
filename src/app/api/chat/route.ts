import {
  createChatPostHandler,
  getRuntimeChatRateLimiter,
  getRuntimeGroundedChatService,
} from "@/server/chat";

export const runtime = "nodejs";

export const POST = createChatPostHandler({
  getService: getRuntimeGroundedChatService,
  getRateLimiter: getRuntimeChatRateLimiter,
});
