"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type EditorialSelectOption = {
  value: string;
  label: string;
};

type EditorialSelectProps = {
  label?: string;
  value: string;
  options: EditorialSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: "sm" | "md";
};

export default function EditorialSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  size = "md",
}: EditorialSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const sizeClasses =
    size === "sm"
      ? "min-h-[44px] px-3.5 py-2.5 text-sm rounded-[1rem]"
      : "min-h-[48px] px-4 py-3 text-sm rounded-[1rem]";

  return (
    <div
      ref={rootRef}
      className={`relative ${open ? "z-[90]" : "z-10"} ${className}`}
    >
      {label ? (
        <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-text-secondary">
          {label}
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`form-control flex w-full items-center justify-between gap-3 text-left ${sizeClasses} ${open ? "border-primary ring-2 ring-primary/15" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""} ${buttonClassName}`}
      >
        <span className="truncate">
          {selected?.label || placeholder || ""}
        </span>
        <i
          className={`fas fa-chevron-down text-xs text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled ? (
        <div
          className={`animate-slide-down absolute left-0 right-0 top-[calc(100%+0.55rem)] z-[220] overflow-hidden rounded-[1.15rem] border border-border bg-[rgba(255,248,238,0.98)] shadow-[0_24px_60px_rgba(24,19,16,0.18)] backdrop-blur-md ${menuClassName}`}
        >
          <div role="listbox" className="max-h-72 overflow-y-auto p-2">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value || "__empty__"}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[0.95rem] px-3 py-2.5 text-left text-sm transition-colors ${isSelected ? "bg-primary text-white shadow-sm" : "text-text-primary hover:bg-[rgba(169,75,43,0.08)]"}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <i className="fas fa-check text-xs" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
