"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

interface CollapsibleProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> {
  children: React.ReactNode;
  open?: boolean;
}

export function Collapsible({ children, open, ...props }: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root {...props} open={open}>
      {children}
    </CollapsiblePrimitive.Root>
  );
}

export default Collapsible;
