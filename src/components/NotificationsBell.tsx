import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const typeColor: Record<string, string> = {
  new_application: 'bg-primary/20 text-primary',
  application_accepted: 'bg-green-500/20 text-green-400',
  application_rejected: 'bg-destructive/20 text-destructive',
  new_session: 'bg-blue-500/20 text-blue-400',
  new_report: 'bg-purple-500/20 text-purple-400',
  new_feedback: 'bg-yellow-500/20 text-yellow-400',
};

export const NotificationsBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação ainda.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'group p-3 hover:bg-accent/50 transition-colors cursor-pointer relative',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-2 w-2 mt-2 rounded-full shrink-0',
                        !n.read ? 'bg-primary' : 'bg-transparent'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            'text-[10px] uppercase font-bold px-1.5 py-0.5 rounded',
                            typeColor[n.type] || 'bg-muted text-muted-foreground'
                          )}
                        >
                          {n.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      aria-label="Apagar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate('/dashboard/notificacoes')}
          >
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
