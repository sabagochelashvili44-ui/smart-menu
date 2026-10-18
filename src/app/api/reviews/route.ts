import { addReview, listReviews } from "@/lib/data/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const restaurantId = new URL(request.url).searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }
  const reviews = await listReviews(restaurantId);
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    restaurant_id?: string;
    table_id?: string | null;
    rating?: number;
    feedback?: string;
  };
  if (!body.restaurant_id || !body.rating || !body.feedback) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }
  const review = await addReview({
    restaurant_id: body.restaurant_id,
    table_id: body.table_id ?? null,
    rating: body.rating,
    feedback: body.feedback,
    mitigated: body.rating <= 2,
  });
  return NextResponse.json({ review });
}
