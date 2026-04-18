import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
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

const Notificacoes = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold glow-gold">Notificações</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">Você ainda não tem notificações.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={cn(
                  'group p-4 cursor-pointer hover:border-primary/50 transition-mystical',
                  !n.read && 'border-primary/40 bg-primary/5'
                )}
                onClick={() => handleClick(n)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'h-2.5 w-2.5 mt-2 rounded-full shrink-0',
                      !n.read ? 'bg-primary' : 'bg-transparent border border-muted'
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
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="font-medium">{n.title}</p>
                    {n.message && (
                      <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notificacoes;
