"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

export function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ScrollAreaPrimitive.Root className={className}>
      <ScrollAreaPrimitive.Viewport className="w-full h-full">{children}</ScrollAreaPrimitive.Viewport>
    </ScrollAreaPrimitive.Root>
  );
}

export default ScrollArea;
