"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("Sidebar components must be used within a SidebarProvider.");
  }

  return context;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  className,
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div
        data-slot="sidebar-provider"
        data-state={open ? "open" : "closed"}
        className={cn("group/sidebar-wrapper flex min-h-full w-full", className)}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();

  return (
    <aside
      data-slot="sidebar"
      data-state={open ? "open" : "closed"}
      className={cn(
        "hidden shrink-0 border-r border-[var(--border)] bg-[rgba(255,255,255,0.02)] transition-[width] duration-200 xl:flex",
        open ? "w-[264px]" : "w-[86px]",
        className
      )}
    >
      <div className="flex min-h-full w-full flex-col">{children}</div>
    </aside>
  );
}

export function SidebarHeader({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("border-b border-[var(--border)] px-4 py-4", className)}
    >
      {children}
    </div>
  );
}

export function SidebarContent({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex-1 overflow-y-auto px-3 py-4", className)}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("border-t border-[var(--border)] px-4 py-4", className)}
    >
      {children}
    </div>
  );
}

export function SidebarGroup({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section data-slot="sidebar-group" className={cn("space-y-3", className)}>
      {children}
    </section>
  );
}

export function SidebarGroupLabel({
  children,
  className,
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { open } = useSidebar();

  return (
    <p
      data-slot="sidebar-group-label"
      className={cn(
        "px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition-opacity",
        !open && "opacity-0",
        className
      )}
    >
      {children}
    </p>
  );
}

export function SidebarGroupContent({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="sidebar-group-content" className={cn("space-y-1", className)}>
      {children}
    </div>
  );
}

export function SidebarMenu({
  children,
  className,
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul data-slot="sidebar-menu" className={cn("space-y-1", className)}>
      {children}
    </ul>
  );
}

export function SidebarMenuItem({
  children,
  className,
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li data-slot="sidebar-menu-item" className={cn("", className)}>
      {children}
    </li>
  );
}

export function SidebarMenuButton({
  children,
  className,
  isActive = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }) {
  const { open } = useSidebar();

  return (
    <button
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-3 rounded-[1rem] border px-3 py-3 text-left text-sm font-medium transition-all",
        isActive
          ? "border-white/12 bg-white text-[#091018] shadow-[0_10px_24px_rgba(255,255,255,0.12)]"
          : "border-transparent bg-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]",
        !open && "justify-center px-2",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSidebar();

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--foreground)] transition-colors hover:bg-[rgba(255,255,255,0.08)]",
        className
      )}
      onClick={() => setOpen((value) => !value)}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">{open ? "Recolher menu" : "Expandir menu"}</span>
    </button>
  );
}

export function SidebarInset({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="sidebar-inset" className={cn("min-w-0 flex-1", className)}>
      {children}
    </div>
  );
}
