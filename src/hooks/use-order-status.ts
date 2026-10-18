"use client";

import { useState } from "react";
import type { OrderStatus } from "@/types/database";

export function useOrderStatus(initialStatus: OrderStatus = "pending") {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  return { status, setStatus };
}
