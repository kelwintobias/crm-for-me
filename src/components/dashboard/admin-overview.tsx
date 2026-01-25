"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminTeamMetrics } from "@/app/actions/dashboard";
import { Users, TrendingUp, Target } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  leadsMonth: number;
  conversions: number;
  taxaConversao: number;
}

export function AdminOverview() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getAdminTeamMetrics();
      if (result.success && result.data) {
        setTeam(result.data.team);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6"><div className="h-48 bg-zinc-800 rounded" /></CardContent>
        </Card>
      </div>
    );
  }

  const totalLeads = team.reduce((sum, m) => sum + m.leadsMonth, 0);
  const totalConversions = team.reduce((sum, m) => sum + m.conversions, 0);
  const avgTaxa = team.length > 0
    ? Math.round(team.reduce((sum, m) => sum + m.taxaConversao, 0) / team.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Team KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leads Trabalhados (Mês)</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversões do Time</p>
                <p className="text-2xl font-bold">{totalConversions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Média de Conversão</p>
                <p className="text-2xl font-bold">{avgTaxa}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance do Time (Mês Atual)</CardTitle>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Nenhum vendedor cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {team
                .sort((a, b) => b.conversions - a.conversions)
                .map((member, index) => {
                  const maxLeads = Math.max(...team.map((m) => m.leadsMonth), 1);
                  const barPct = (member.leadsMonth / maxLeads) * 100;

                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-300 w-6">
                        {index + 1}.
                      </span>
                      <span className="text-sm text-zinc-300 w-32 truncate">
                        {member.name}
                      </span>
                      <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-accent/70 transition-all"
                          style={{ width: `${Math.max(barPct, 3)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-zinc-400 w-16 text-right">
                          {member.leadsMonth} leads
                        </span>
                        <span className="text-emerald-400 w-12 text-right font-medium">
                          {member.conversions} conv.
                        </span>
                        <span className="text-amber-400 w-10 text-right">
                          {member.taxaConversao}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
