"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { getWebhookLogs, PlainWebhookLog } from "@/app/actions/webhook-logs";

export function WebhookLogsView() {
  const [logs, setLogs] = useState<PlainWebhookLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const result = await getWebhookLogs(page, limit);
    if (result.success && result.data) {
      setLogs(result.data);
      setTotal(result.total || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Webhook Logs</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum log encontrado.</div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className={log.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                        }
                      >
                        {log.status}
                      </Badge>
                      <span className="text-sm font-medium text-zinc-300 truncate">
                        {log.provider}
                      </span>
                      {log.event && (
                        <span className="text-xs text-zinc-500 truncate">
                          {log.event}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  {log.error && (
                    <p className="mt-1 text-xs text-red-400 truncate">{log.error}</p>
                  )}

                  {expandedId === log.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      {(() => {
                        try {
                          const parsed = JSON.parse(log.payload);

                          // Novo formato estruturado (received + processed)
                          if (parsed.received && parsed.processed) {
                            return (
                              <>
                                {/* Ação Executada */}
                                <div className="mb-3">
                                  <p className="text-xs text-emerald-400 mb-1 font-medium">Ação Executada:</p>
                                  <div className="bg-emerald-900/20 rounded p-2 text-xs">
                                    <div className="grid grid-cols-2 gap-1">
                                      {parsed.processed.action && (
                                        <div><span className="text-zinc-500">Ação:</span> <span className="text-emerald-300">{parsed.processed.action}</span></div>
                                      )}
                                      {parsed.processed.leadId && (
                                        <div><span className="text-zinc-500">Lead ID:</span> <span className="text-zinc-300">{parsed.processed.leadId}</span></div>
                                      )}
                                      {parsed.processed.contractId && (
                                        <div><span className="text-zinc-500">Contrato ID:</span> <span className="text-zinc-300">{parsed.processed.contractId}</span></div>
                                      )}
                                      {parsed.processed.leadName && (
                                        <div><span className="text-zinc-500">Nome:</span> <span className="text-zinc-300">{parsed.processed.leadName}</span></div>
                                      )}
                                      {parsed.processed.clientName && (
                                        <div><span className="text-zinc-500">Cliente:</span> <span className="text-zinc-300">{parsed.processed.clientName}</span></div>
                                      )}
                                      {parsed.processed.leadPhone && (
                                        <div><span className="text-zinc-500">Telefone:</span> <span className="text-zinc-300">{parsed.processed.leadPhone}</span></div>
                                      )}
                                      {parsed.processed.clientPhone && (
                                        <div><span className="text-zinc-500">Telefone:</span> <span className="text-zinc-300">{parsed.processed.clientPhone}</span></div>
                                      )}
                                      {parsed.processed.leadSource && (
                                        <div><span className="text-zinc-500">Fonte:</span> <span className="text-zinc-300">{parsed.processed.leadSource}</span></div>
                                      )}
                                      {parsed.processed.leadStage && (
                                        <div><span className="text-zinc-500">Stage:</span> <span className="text-zinc-300">{parsed.processed.leadStage}</span></div>
                                      )}
                                      {parsed.processed.packageLabel && (
                                        <div><span className="text-zinc-500">Pacote:</span> <span className="text-zinc-300">{parsed.processed.packageLabel}</span></div>
                                      )}
                                      {parsed.processed.totalValue !== undefined && (
                                        <div><span className="text-zinc-500">Valor:</span> <span className="text-emerald-300">R$ {Number(parsed.processed.totalValue).toFixed(2)}</span></div>
                                      )}
                                      {parsed.processed.leadUpdated !== undefined && (
                                        <div><span className="text-zinc-500">Lead Atualizado:</span> <span className={parsed.processed.leadUpdated ? "text-emerald-300" : "text-amber-300"}>{parsed.processed.leadUpdated ? "Sim" : "Não encontrado"}</span></div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Dados Recebidos */}
                                <div>
                                  <p className="text-xs text-zinc-500 mb-1">Dados Recebidos do Webhook:</p>
                                  <pre className="text-xs text-zinc-400 bg-zinc-900/50 rounded p-2 overflow-x-auto max-h-[150px] overflow-y-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(parsed.received, null, 2)}
                                  </pre>
                                </div>
                              </>
                            );
                          }

                          // Formato antigo - apenas payload
                          return (
                            <>
                              <p className="text-xs text-zinc-500 mb-1">Payload:</p>
                              <pre className="text-xs text-zinc-400 bg-zinc-900/50 rounded p-2 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(parsed, null, 2)}
                              </pre>
                            </>
                          );
                        } catch {
                          return (
                            <>
                              <p className="text-xs text-zinc-500 mb-1">Payload (raw):</p>
                              <pre className="text-xs text-zinc-400 bg-zinc-900/50 rounded p-2 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
                                {log.payload}
                              </pre>
                            </>
                          );
                        }
                      })()}
                      {log.error && (
                        <>
                          <p className="text-xs text-zinc-500 mt-2 mb-1">Erro:</p>
                          <pre className="text-xs text-red-400 bg-zinc-900/50 rounded p-2 overflow-x-auto">
                            {log.error}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-zinc-500">
                {total} registros
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-zinc-400">
                  {page}/{totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
