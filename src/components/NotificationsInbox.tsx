import { getUser } from '../lib/auth';
import { Bell, Check } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from "../services/db";

export default function NotificationsInbox() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await getUser();
        if (!user) return setNotifications([]);
        const notes = await getUserNotifications(user.id);
        setNotifications(notes);

        if (mounted) setNotifications(notes as any);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const handleMarkRead = async (id: string) => {
    try {
      const user = await getUser();
      if (!user) return;
      await markNotificationRead(id, user.id);
      setNotifications(n => n.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x));
    } catch (err) { console.error(err); }
  };

  const handleMarkAll = async () => {
    try {
      const user = await getUser();
      if (!user) return;
      await markAllNotificationsRead(user.id);
      setNotifications(n => n.map(x => ({ ...x, read_at: new Date().toISOString() })));
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Bell /> Notificações</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600">Não lidas: <strong>{unreadCount}</strong></div>
          <button onClick={handleMarkAll} className="px-3 py-1 border rounded text-sm">Marcar todas</button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : notifications.length === 0 ? (
        <div className="text-gray-600">Nenhuma notificação</div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`p-3 border rounded ${n.read_at ? 'bg-gray-50' : 'bg-white'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-sm text-gray-600">{n.body}</div>}
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {!n.read_at && (
                    <button onClick={() => handleMarkRead(n.id)} className="px-2 py-1 bg-green-100 rounded text-sm flex items-center gap-2">
                      <Check size={14} /> Lida
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
