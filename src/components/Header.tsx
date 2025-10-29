import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import logoText from "@/assets/logo-text.png";
import logoDragon from "@/assets/logo-dragon.png";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4">
          <img src={logoDragon} alt="Dragon Logo" className="h-12 w-auto animate-float" />
          <img src={logoText} alt="Caverna dos Dados" className="h-8 w-auto hidden sm:block" />
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#como-funciona" className="text-sm font-medium hover:text-primary transition-mystical">
            Como Funciona
          </a>
          <a href="#mesas" className="text-sm font-medium hover:text-primary transition-mystical">
            Mesas
          </a>
          <a href="#mestres" className="text-sm font-medium hover:text-primary transition-mystical">
            Mestres
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Olá, {user.user_metadata?.display_name || user.email?.split('@')[0]}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                Entrar
              </Button>
              <Button variant="hero" size="sm" onClick={() => navigate('/auth')}>
                Cadastrar
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
