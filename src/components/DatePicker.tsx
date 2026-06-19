import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDisplayDate, parseDateString, toDateString } from "@/lib/sprint-dates";

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  clearable?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  minDate,
  maxDate,
  clearable = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseDateString(value) : undefined;

  const disabledMatchers = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-left inline-flex items-center justify-between gap-2 outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/30 transition",
            !value && "text-slate-500",
            value && "text-slate-100",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          <span className="inline-flex items-center gap-2 truncate min-w-0">
            <CalendarIcon className="size-3.5 shrink-0 text-fuchsia-400/80" />
            <span className="truncate">{value ? formatDisplayDate(value) : placeholder}</span>
          </span>
          <ChevronDown className={cn("size-3.5 text-slate-500 shrink-0 transition", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-slate-800 bg-slate-900 shadow-xl shadow-black/40"
        align="start"
        sideOffset={6}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(toDateString(date));
              setOpen(false);
            }
          }}
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          defaultMonth={selected}
          captionLayout="dropdown"
          fromYear={new Date().getFullYear() - 1}
          toYear={new Date().getFullYear() + 3}
          className="rounded-md border-0 bg-slate-900 text-slate-100 [--cell-size:2.25rem]"
          classNames={{
            caption_label: "text-slate-200 font-semibold",
            weekday: "text-slate-500",
            outside: "text-slate-600",
            today: "bg-fuchsia-500/15 text-fuchsia-200 rounded-md",
            button_previous: "text-slate-400 hover:text-slate-100 hover:bg-slate-800",
            button_next: "text-slate-400 hover:text-slate-100 hover:bg-slate-800",
            dropdown_root: "border-slate-700 bg-slate-800/80",
          }}
        />
        {clearable && value && (
          <div className="border-t border-slate-800 p-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full h-8 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition"
            >
              <X className="size-3" /> Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
