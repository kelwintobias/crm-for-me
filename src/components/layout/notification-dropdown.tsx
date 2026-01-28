"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Calendar, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getUpcomingAppointments, NotificationAppointment } from "@/app/actions/notifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getWhatsAppLink, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useRealtimeAppointments } from "@/hooks/use-realtime-appointments";

function NotificationItem({ notification }: { notification: NotificationAppointment }) {
  const scheduledDate = new Date(notification.scheduledAt);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        notification.isOwner
          ? "bg-brand-accent/5 border-brand-accent/20"
          : "bg-white/[0.02] border-white/[0.06]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary truncate text-sm">
            {notification.leadName}
          </p>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            {formatPhone(notification.leadPhone)}
          </p>
        </div>
        <a
          href={getWhatsAppLink(notification.leadPhone)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs">
        <div className="flex items-center gap-1 text-text-tertiary">
          <Calendar className="w-3 h-3" />
          <span>
            {notification.isToday
              ? "Hoje"
              : notification.isTomorrow
                ? "Amanhã"
                : format(scheduledDate, "dd/MM")}
          </span>
        </div>
        <div className="flex items-center gap-1 text-text-tertiary">
          <Clock className="w-3 h-3" />
          <span>{format(scheduledDate, "HH:mm", { locale: ptBR })}</span>
        </div>
        {notification.isOwner && (
          <span className="text-brand-accent text-[10px] font-medium">MEU</span>
        )}
      </div>
    </div>
  );
}

function NotificationList({
  notifications,
  isLoading,
}: {
  notifications: NotificationAppointment[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-brand-accent" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm">
        Nenhum agendamento para hoje ou amanhã
      </div>
    );
  }

  const todayNotifications = notifications.filter((n) => n.isToday);
  const tomorrowNotifications = notifications.filter((n) => n.isTomorrow);

  return (
    <div className="space-y-4">
      {todayNotifications.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-tertiary uppercase mb-2">
            Hoje ({todayNotifications.length})
          </p>
          <div className="space-y-2">
            {todayNotifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        </div>
      )}

      {tomorrowNotifications.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-tertiary uppercase mb-2">
            Amanhã ({tomorrowNotifications.length})
          </p>
          <div className="space-y-2">
            {tomorrowNotifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUpcomingAppointments();
      if (result.success && result.data) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega ao abrir
  useEffect(() => {
    if (isOpen || isMobileOpen) {
      loadNotifications();
    }
  }, [isOpen, isMobileOpen, loadNotifications]);

  // Carrega inicialmente para mostrar badge
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Atualiza com realtime
  useRealtimeAppointments(loadNotifications);

  const todayCount = notifications.filter((n) => n.isToday).length;
  const totalCount = notifications.length;

  return (
    <>
      {/* Desktop: Dropdown */}
      <div className="hidden md:block">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              <Bell className="w-5 h-5" />
              {totalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalCount > 99 ? "99+" : totalCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Agendamentos Próximos</span>
              {todayCount > 0 && (
                <span className="text-xs text-brand-accent font-normal">
                  {todayCount} hoje
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2">
              <NotificationList notifications={notifications} isLoading={isLoading} />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              <Bell className="w-5 h-5" />
              {totalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalCount > 99 ? "99+" : totalCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <SheetHeader className="pb-4 border-b border-white/[0.08]">
              <SheetTitle className="flex items-center justify-between">
                <span>Agendamentos Próximos</span>
                {todayCount > 0 && (
                  <span className="text-sm text-brand-accent font-normal">
                    {todayCount} hoje
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 overflow-y-auto max-h-[calc(70vh-80px)]">
              <NotificationList notifications={notifications} isLoading={isLoading} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
