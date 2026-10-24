"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

/**
 * A searchable select: a button that opens a filterable list. Works as a
 * react-hook-form control (`value` + `onChange` with the option's value).
 */
export const Combobox = forwardRef<
  HTMLButtonElement,
  {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    id?: string;
    disabled?: boolean;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }
>(function Combobox(
  {
    options,
    value,
    onChange,
    placeholder = "Choose…",
    searchPlaceholder = "Search…",
    emptyText = "No matches.",
    ...props
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 w-full justify-between rounded-lg bg-background/60 px-3.5 text-base font-normal md:text-sm",
            !selected && "text-muted-foreground",
          )}
          {...props}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* Plain substring match: cmdk's fuzzy default would let "12" also match "21st". */}
        <Command filter={(value, search) => (value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // cmdk filters on `value`; search by the label people see.
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("h-4 w-4", option.value === value ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
