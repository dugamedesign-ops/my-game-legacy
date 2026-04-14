"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  disabled = false,
  className = "",
  menuClassName = "",
}: CustomSelectProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const listboxId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const enabledOptions = useMemo(
    () => options.filter((option) => !option.disabled),
    [options],
  );

  function closeMenu() {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function openMenu() {
    if (disabled) return;
    setIsOpen(true);
    const currentIndex = options.findIndex((option) => option.value === value);
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : options.findIndex((option) => !option.disabled));
  }

  function updateMenuPosition() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = rect.width;
    const top = rect.bottom + 8;
    const left = rect.left;
    const maxHeight = Math.max(220, window.innerHeight - top - 12);
    setMenuStyle({
      position: "fixed",
      top,
      left,
      width,
      maxHeight,
      zIndex: 9999,
    });
  }

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleWindowChange() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen]);

  function selectValue(nextValue: string) {
    onChange(nextValue);
    closeMenu();
    buttonRef.current?.focus();
  }

  function moveHighlight(direction: 1 | -1) {
    if (enabledOptions.length === 0) return;
    let index = highlightedIndex;
    for (let i = 0; i < options.length; i += 1) {
      index = (index + direction + options.length) % options.length;
      if (!options[index]?.disabled) {
        setHighlightedIndex(index);
        break;
      }
    }
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
      } else {
        moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
      } else if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
        selectValue(options[highlightedIndex].value);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
        selectValue(options[highlightedIndex].value);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      buttonRef.current?.focus();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
        className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-white outline-none transition focus-visible:border-cyan-300/60 focus-visible:ring-2 focus-visible:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className={selected ? "text-white" : "text-white/55"}>
          {selected?.label ?? placeholder}
        </span>
        <span className={`ml-3 text-xs text-white/70 transition ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              onKeyDown={handleListKeyDown}
              className={`overflow-auto rounded-2xl border border-white/10 bg-[#0d1326] p-1 shadow-2xl transition-all duration-150 ease-out ${menuClassName}`}
              style={menuStyle}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => !option.disabled && selectValue(option.value)}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                      option.disabled
                        ? "cursor-not-allowed text-white/35"
                        : isHighlighted
                          ? "bg-white/10 text-white"
                          : isSelected
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "text-white/85 hover:bg-white/5"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
