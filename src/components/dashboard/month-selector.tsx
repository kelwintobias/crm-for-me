"use client";

import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MonthOption {
  key: string;
  label: string;
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
}

interface MonthSelectorProps {
  selectedMonths: string[];
  onSelectionChange: (months: string[]) => void;
  className?: string;
}

// Gera os ultimos 24 meses como opcoes
function generateMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const date = subMonths(now, i);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const label = format(date, "MMMM yyyy", { locale: ptBR });

    options.push({
      key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      year,
      month,
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
    });
  }

  return options;
}

export function MonthSelector({
  selectedMonths,
  onSelectionChange,
  className,
}: MonthSelectorProps) {
  const [open, setOpen] = useState(false);
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const handleToggleMonth = (monthKey: string) => {
    if (selectedMonths.includes(monthKey)) {
      onSelectionChange(selectedMonths.filter((m) => m !== monthKey));
    } else {
      onSelectionChange([...selectedMonths, monthKey]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(monthOptions.map((m) => m.key));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleSelectCurrentMonth = () => {
    const currentMonth = monthOptions[0];
    if (currentMonth) {
      onSelectionChange([currentMonth.key]);
    }
  };

  const handleSelectLast3Months = () => {
    const last3 = monthOptions.slice(0, 3).map((m) => m.key);
    onSelectionChange(last3);
  };

  const handleSelectLast6Months = () => {
    const last6 = monthOptions.slice(0, 6).map((m) => m.key);
    onSelectionChange(last6);
  };

  // Agrupa meses por ano para exibicao
  const monthsByYear = useMemo(() => {
    const grouped: Record<number, MonthOption[]> = {};
    monthOptions.forEach((option) => {
      if (!grouped[option.year]) {
        grouped[option.year] = [];
      }
      grouped[option.year].push(option);
    });
    return grouped;
  }, [monthOptions]);

  const years = Object.keys(monthsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  // Texto do botao
  const buttonText = useMemo(() => {
    if (selectedMonths.length === 0) {
      return "Todos os periodos";
    }
    if (selectedMonths.length === 1) {
      const selected = monthOptions.find((m) => m.key === selectedMonths[0]);
      return selected?.label || "1 mes selecionado";
    }
    return `${selectedMonths.length} meses selecionados`;
  }, [selectedMonths, monthOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[220px]", className)}
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{buttonText}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Selecionar Periodo</span>
            {selectedMonths.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectCurrentMonth}
              className="h-7 text-xs"
            >
              Mes atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectLast3Months}
              className="h-7 text-xs"
            >
              Ultimos 3 meses
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectLast6Months}
              className="h-7 text-xs"
            >
              Ultimos 6 meses
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 text-xs"
            >
              Todos
            </Button>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {years.map((year) => (
            <div key={year} className="mb-3">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1 sticky top-0 bg-background">
                {year}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {monthsByYear[year].map((option) => {
                  const isSelected = selectedMonths.includes(option.key);
                  const monthName = format(option.startDate, "MMM", { locale: ptBR });

                  return (
                    <div
                      key={option.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleMonth(option.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggleMonth(option.key);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "h-3 w-3 rounded-sm border flex items-center justify-center",
                          isSelected
                            ? "bg-primary-foreground border-primary-foreground"
                            : "border-muted-foreground/50"
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="h-2 w-2 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="capitalize">{monthName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            {selectedMonths.length === 0
              ? "Nenhum filtro aplicado - mostrando todos os dados"
              : `${selectedMonths.length} mes(es) selecionado(s)`}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Funcao helper para converter selecao de meses em filtro de datas
export function getDateRangeFromMonths(selectedMonths: string[]): {
  startDate: Date | null;
  endDate: Date | null;
  monthRanges: Array<{ start: Date; end: Date }>;
} {
  if (selectedMonths.length === 0) {
    return { startDate: null, endDate: null, monthRanges: [] };
  }

  const monthOptions = generateMonthOptions();
  const selectedOptions = monthOptions.filter((m) =>
    selectedMonths.includes(m.key)
  );

  if (selectedOptions.length === 0) {
    return { startDate: null, endDate: null, monthRanges: [] };
  }

  // Ordena por data
  selectedOptions.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const monthRanges = selectedOptions.map((opt) => ({
    start: opt.startDate,
    end: opt.endDate,
  }));

  return {
    startDate: selectedOptions[0].startDate,
    endDate: selectedOptions[selectedOptions.length - 1].endDate,
    monthRanges,
  };
}
