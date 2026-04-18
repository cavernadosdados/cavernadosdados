import { Gem, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTokens, reasonLabel } from "@/hooks/useTokens";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TokenBalance = () => {
  const { balance, isLoading, transactions } = useTokens();
  const navigate = useNavigate();
  const isEmpty = !isLoading && balance <= 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-10 px-2 sm:px-3 gap-1.5 relative",
            isEmpty && "text-muted-foreground"
          )}
          aria-label={`Saldo de tokens: ${balance}`}
        >
          <Gem
            className={cn(
              "h-4 w-4 shrink-0",
              isEmpty ? "text-muted-foreground" : "text-primary"
            )}
          />
          <span className="font-semibold tabular-nums text-sm">
            {isLoading ? "—" : balance}
          </span>
          {isEmpty && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center animate-pulse">
              <Plus className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Seu saldo</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Gem className="h-5 w-5 text-primary" />
                {balance}
                <span className="text-sm font-normal text-muted-foreground">
                  {balance === 1 ? "token" : "tokens"}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/dashboard/tokens")}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Comprar
            </Button>
          </div>
          {isEmpty && (
            <p className="text-xs text-muted-foreground mt-2">
              Você precisa de tokens para criar mesas. Cada mesa custa 1 token.
            </p>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground px-4 pt-3 pb-2">
            Últimas transações
          </p>
          {transactions.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              Nenhuma transação ainda.
            </p>
          ) : (
            <ul className="pb-2">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="px-4 py-2 flex items-center justify-between gap-2 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{reasonLabel(t.reason)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums shrink-0",
                      t.delta > 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {t.delta > 0 ? "+" : ""}
                    {t.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
