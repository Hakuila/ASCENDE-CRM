"use client";

import { useState, useTransition } from "react";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/notifications/actions";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-50"
        aria-label="Notificações"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
              <span className="text-sm font-semibold text-gray-700">Notificações</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => markAllNotificationsReadAction())}
                  className="text-xs text-brand hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  Nenhuma notificação ainda.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.read_at && startTransition(() => markNotificationReadAction(n.id))}
                    className={`block w-full border-b border-gray-50 px-4 py-3 text-left last:border-0 hover:bg-gray-50 ${
                      n.read_at ? "" : "bg-brand/5"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-gray-400">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
