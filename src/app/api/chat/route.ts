import {
  createChatPostHandler,
  getRuntimeGroundedChatService,
} from "@/server/chat";

export const runtime = "nodejs";

export const POST = createChatPostHandler({
  getService: getRuntimeGroundedChatService,
});
