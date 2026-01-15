"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-text-primary",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          "text-text-primary hover:bg-white/5 rounded-md transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-text-tertiary rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
          "text-text-primary hover:bg-white/10 hover:text-text-primary",
          "rounded-md transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-brand-accent text-text-dark hover:bg-brand-accent hover:text-text-dark focus:bg-brand-accent focus:text-text-dark",
        day_today: "bg-white/5 text-brand-accent font-semibold",
        day_outside:
          "day-outside text-text-tertiary opacity-50 aria-selected:bg-accent/50 aria-selected:text-text-secondary aria-selected:opacity-30",
        day_disabled: "text-text-tertiary opacity-50 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
