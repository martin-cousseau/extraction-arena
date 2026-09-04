"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { RiCloseLine, RiSettings4Line, RiSideBarFill } from "@remixicon/react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { Badge } from "@/components/base/badges/badge";
import { cx } from "@/utils/cx";
import { DashboardUserMenu } from "./dashboard-user-menu";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

function Collapsible({ collapsed, children, className }: { collapsed: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-full opacity-100 blur-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

function NavItem({
  icon: Icon,
  label,
  badge,
  isSelected = false,
  collapsed = false,
  href = "#",
  onClick,
}: {
  icon: IconComponent;
  label: string;
  badge?: ReactNode;
  isSelected?: boolean;
  collapsed?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = cx(
    "flex items-center justify-between overflow-hidden rounded-2lg p-2",
    "transition-[width,background-color] duration-300 ease-in-out",
    collapsed ? "w-9" : "w-full",
    isSelected
      ? "bg-linear-to-b from-accent-500 to-accent-600 shadow-nav-selected"
      : "hover:bg-background-secondary-hover",
  );
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          className={cx("size-5 shrink-0", isSelected ? "text-white" : "text-foreground-icon-secondary")}
          aria-hidden
        />
        <Collapsible collapsed={collapsed}>
          <span
            className={cx(
              "text-body-medium whitespace-nowrap",
              isSelected ? "text-white" : "text-text-secondary",
            )}
          >
            {label}
          </span>
        </Collapsible>
      </span>
      {badge && <Collapsible collapsed={collapsed}>{badge}</Collapsible>}
    </>
  );

  const shared = {
    "aria-current": isSelected ? ("page" as const) : undefined,
    "aria-label": label,
    title: collapsed ? label : undefined,
    className,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...shared}>
        {body}
      </button>
    );
  }

  if (href && href !== "#") {
    return (
      <Link to={href} {...shared}>
        {body}
      </Link>
    );
  }

  return <span {...shared}>{body}</span>;
}

export interface DashboardNavItem {
  key: string;
  label: string;
  icon: IconComponent;
  href?: string;
  badge?: string | number;
}

export type DashboardNavKey = string;

export function DashboardSidebar({
  mobile = false,
  onClose,
  showThemeToggle = true,
  selected = "dashboard",
  items = [],
  className,
}: {
  mobile?: boolean;
  onClose?: () => void;
  showThemeToggle?: boolean;
  selected?: DashboardNavKey;
  items?: DashboardNavItem[];
  className?: string;
} = {}) {
  const [collapsedState, setCollapsed] = useState(false);
  const collapsed = mobile ? false : collapsedState;

  return (
    <aside
      className={cx(
        "flex h-full min-h-0 shrink-0 flex-col justify-between overflow-hidden",
        "rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[60px] px-[11px] py-3" : "w-[260px] p-3",
        className,
      )}
    >
      <div className="-m-2 flex min-h-0 w-[calc(100%+16px)] flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]">
        <div
          className={cx(
            "flex w-full transition-[gap] duration-300 ease-in-out",
            collapsed
              ? "flex-col-reverse items-start justify-center gap-2.5"
              : "flex-row items-center justify-between",
          )}
        >
          <div className="-m-2 min-w-0 overflow-hidden p-2">
            <Link
              to="/"
              aria-label="Extraction Arena"
              className={cx(
                "relative flex min-w-0 items-center gap-2 rounded-full outline-none",
                "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
                collapsed && "w-9 justify-center gap-0",
              )}
            >
              <img src="/favicon.svg" alt="" className="size-8 shrink-0 rounded-lg" />
              <Collapsible collapsed={collapsed}>
                <span className="text-body-medium whitespace-nowrap text-text-primary">Extraction Arena</span>
              </Collapsible>
            </Link>
          </div>
          {mobile ? (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onClose}
              className="cursor-pointer text-foreground-icon-secondary"
            >
              <RiCloseLine className="size-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsedState)}
              className={cx(
                "cursor-pointer text-foreground-icon-secondary transition-transform duration-300 ease-in-out",
                collapsed && "flex w-9 items-center justify-center",
              )}
            >
              <RiSideBarFill
                className={cx("size-5 transition-transform duration-300 ease-in-out", !collapsed && "-scale-x-100")}
                aria-hidden
              />
            </button>
          )}
        </div>

        <nav className={cx("flex w-full flex-col gap-1", !collapsed && "px-0.5")}>
          {items.map((item) => {
            const isSelected = selected === item.key;
            return (
              <NavItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isSelected={isSelected}
                collapsed={collapsed}
                badge={
                  item.badge !== undefined ? (
                    <Badge color={isSelected ? "primary" : "neutral"}>{item.badge}</Badge>
                  ) : undefined
                }
              />
            );
          })}
        </nav>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3">
        {showThemeToggle &&
          (collapsed ? (
            <ThemeToggle collapsed />
          ) : (
            <ThemeToggle appearance="sidebar-segmented" />
          ))}
        <nav className="flex w-full flex-col gap-1">
          <NavItem
            icon={RiSettings4Line}
            label="Settings"
            href="/settings"
            isSelected={selected === "settings"}
            collapsed={collapsed}
          />
        </nav>
        <DashboardUserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
