import { handleAiWaiterPost } from "@/lib/ai-waiter-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAiWaiterPost(request);
}
