"use client";

import { CheckCircle, Calendar, XCircle, UserX, Users } from "lucide-react";

interface DailyStatsCardsProps {
  data: {
    completedToday: number;
    scheduledToday: number;
    canceledToday: number;
    noShowToday: number;
    leadsAtendidosHoje?: number; // Leads com updatedAt hoje
  };
}

const stats = [
  {
    key: "leadsAtendidosHoje" as const,
    label: "Leads Atendidos Hoje",
    icon: Users,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    key: "scheduledToday" as const,
    label: "Agendados Hoje",
    icon: Calendar,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    key: "canceledToday" as const,
    label: "Cancelamentos",
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  {
    key: "noShowToday" as const,
    label: "No-Shows",
    icon: UserX,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
];

export function DailyStatsCards({ data }: DailyStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const value = data[stat.key as keyof typeof data] ?? 0;

        return (
          <div
            key={stat.key}
            className={`relative overflow-hidden rounded-xl border ${stat.borderColor} ${stat.bgColor} p-4 transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-xs text-text-tertiary">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
