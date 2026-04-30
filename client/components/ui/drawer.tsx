"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Drawer({ children, open, onOpenChange, ...props }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props}>
      {children}
    </DialogPrimitive.Root>
  );
}

interface DrawerContentProps extends React.ComponentPropsWithoutRef<"div"> {}

export function DrawerContent({ className, children, ...props }: DrawerContentProps) {
  return (
    <>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-screen w-full max-w-md border-l bg-background shadow-lg overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

interface DrawerHeaderProps extends React.ComponentPropsWithoutRef<"div"> {}

export function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return <div className={cn("flex items-center justify-between border-b px-6 py-4", className)} {...props} />;
}

interface DrawerTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {}

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <DialogPrimitive.Title className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  );
}

interface DrawerCloseProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {}

export function DrawerClose({ className, ...props }: DrawerCloseProps) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium text-muted-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}

interface DrawerTriggerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {}

export function DrawerTrigger({ ...props }: DrawerTriggerProps) {
  return <DialogPrimitive.Trigger {...props} />;
}

export default Drawer;
