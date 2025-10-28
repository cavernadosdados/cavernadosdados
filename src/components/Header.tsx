import { Button } from "@/components/ui/button";
import logoText from "@/assets/logo-text.png";
import logoDragon from "@/assets/logo-dragon.png";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logoDragon} alt="Dragon Logo" className="h-12 w-auto animate-float" />
          <img src={logoText} alt="Caverna dos Dados" className="h-8 w-auto hidden sm:block" />
        </div>
        
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
          <Button variant="ghost" size="sm">
            Entrar
          </Button>
          <Button variant="hero" size="sm">
            Cadastrar
          </Button>
        </div>
      </div>
    </header>
  );
};
