"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RiDatabase2Line, RiGithubLine } from "@remixicon/react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { ChevronDownSmall } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";

const GITHUB_URL = "https://github.com/martin-cousseau/extraction-arena";
const HF_DATASET_URL = "https://huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet";

const USER = {
  name: "Martin",
  email: "martin@seuil.io",
  avatarSrc: "/martin.jpg",
};

function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-48 opacity-100 blur-0",
      )}
    >
      {children}
    </span>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onSelect,
}: {
  href: string;
  icon: typeof RiGithubLine;
  label: string;
  onSelect: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 rounded-2lg p-2 outline-none transition-colors hover:bg-background-primary-hover focus-visible:bg-background-primary-hover"
    >
      <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
      <span className="truncate text-body-medium text-text-primary">{label}</span>
    </a>
  );
}

export function DashboardUserMenu({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        aria-label={`${USER.name} (${USER.email})`}
        className={cx(
          "flex cursor-pointer items-center overflow-hidden outline-none",
          "border-2 border-transparent hover:border-border-button-hover",
          "transition-[width,background-color,border-color,padding] duration-300 ease-in-out",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
          collapsed
            ? "size-9 justify-start rounded-full bg-transparent p-0"
            : "w-full justify-between rounded-xl bg-background-tertiary-default py-2 pr-4 pl-2.5",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Avatar size="md" color="neutral" src={USER.avatarSrc} alt={USER.name} initials="M" />
          <Collapsible collapsed={collapsed}>
            <span className="flex min-w-0 flex-col items-start justify-center">
              <span className="text-body-medium whitespace-nowrap text-text-primary">{USER.name}</span>
              <span className="text-body-regular whitespace-nowrap text-text-secondary">{USER.email}</span>
            </span>
          </Collapsible>
        </span>
        <Collapsible collapsed={collapsed}>
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-background-tertiary-hover">
            <ChevronDownSmall
              className={cx("size-4 text-text-secondary transition-transform duration-200 ease", isOpen && "rotate-180")}
            />
          </span>
        </Collapsible>
      </AriaButton>

      <AriaPopover
        placement={isMobile ? "bottom start" : "right bottom"}
        offset={8}
        className={cx(
          "z-[70] w-[265px] max-w-[calc(100vw-32px)] origin-bottom-left overflow-y-auto",
          "rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown",
          "transition duration-150 ease-out",
          "data-[entering]:opacity-0 data-[entering]:scale-95 data-[entering]:blur-[2px]",
          "data-[exiting]:opacity-0 data-[exiting]:scale-95 data-[exiting]:blur-[2px]",
        )}
      >
        <AriaDialog aria-label="User menu" className="flex flex-col gap-[7px] outline-none">
          <div className="flex w-full items-center gap-2 px-2 pt-1">
            <Avatar size="md" color="neutral" src={USER.avatarSrc} alt={USER.name} initials="M" />
            <div className="flex min-w-0 flex-col items-start justify-center">
              <span className="text-body-medium whitespace-nowrap text-text-primary">{USER.name}</span>
              <span className="text-body-regular whitespace-nowrap text-text-secondary">{USER.email}</span>
            </div>
          </div>

          <div className="-mx-2.5 my-1 h-px bg-border-button-default" />

          <div className="flex w-full flex-col gap-1">
            <MenuLink
              href={GITHUB_URL}
              icon={RiGithubLine}
              label="GitHub"
              onSelect={() => setIsOpen(false)}
            />
            <MenuLink
              href={HF_DATASET_URL}
              icon={RiDatabase2Line}
              label="HF dataset"
              onSelect={() => setIsOpen(false)}
            />
          </div>
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  );
}
