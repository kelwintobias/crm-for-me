"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, User, Phone, X, Loader2 } from "lucide-react";
import { PlainLead, SOURCE_LABELS, STAGE_LABELS } from "@/types";
import { formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: PlainLead[];
  onSelectLead: (lead: PlainLead) => void;
}

export function SearchDialog({
  open,
  onOpenChange,
  leads,
  onSelectLead,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlainLead[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Função de busca flexível
  const searchLeads = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);

      // Normaliza a query (remove espaços, converte para minúsculo)
      const normalizedQuery = searchQuery.toLowerCase().trim();

      // Remove caracteres não numéricos para busca por telefone
      const numericQuery = searchQuery.replace(/\D/g, "");

      const filtered = leads.filter((lead) => {
        // Busca por nome (case insensitive, parcial)
        const nameMatch = lead.name.toLowerCase().includes(normalizedQuery);

        // Busca por telefone (parcial, ignora formatação)
        const phoneDigits = lead.phone.replace(/\D/g, "");
        const phoneMatch = numericQuery.length >= 3 && phoneDigits.includes(numericQuery);

        return nameMatch || phoneMatch;
      });

      // Ordena por relevância (matches exatos primeiro)
      filtered.sort((a, b) => {
        const aNameExact = a.name.toLowerCase().startsWith(normalizedQuery);
        const bNameExact = b.name.toLowerCase().startsWith(normalizedQuery);

        if (aNameExact && !bNameExact) return -1;
        if (!aNameExact && bNameExact) return 1;

        return a.name.localeCompare(b.name);
      });

      setResults(filtered.slice(0, 10)); // Limita a 10 resultados
      setSelectedIndex(0);
      setIsSearching(false);
    },
    [leads]
  );

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLeads(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, searchLeads]);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelectLead(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const handleSelectLead = (lead: PlainLead) => {
    onSelectLead(lead);
    onOpenChange(false);
  };

  // Atalho de teclado global (⌘K ou Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 bg-brand-card border-white/[0.08] overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-white/[0.08]">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por nome ou telefone..."
            className="h-14 border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-white/[0.05] rounded transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : query && results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum lead encontrado para &quot;{query}&quot;</p>
              <p className="text-sm mt-1">Tente buscar por nome ou parte do telefone</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <p className="px-4 py-2 text-xs text-muted-foreground">
                {results.length} resultado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((lead, index) => (
                <button
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-4 transition-colors text-left",
                    index === selectedIndex
                      ? "bg-brand-accent/10"
                      : "hover:bg-white/[0.03]"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span className="font-mono">{formatPhone(lead.phone)}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 text-xs rounded bg-white/[0.05] text-muted-foreground">
                      {STAGE_LABELS[lead.stage]}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-white/[0.05] text-muted-foreground">
                      {SOURCE_LABELS[lead.source]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Digite para buscar leads</p>
              <p className="text-sm mt-1">Busque por nome ou numero de telefone</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.1]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.1]">↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.1]">Enter</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.1]">Esc</kbd>
              fechar
            </span>
          </div>
          <span>{leads.length} leads no total</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
