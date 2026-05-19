import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoText from "@/assets/logo-text.png";
import logoDragon from "@/assets/logo-dragon.png";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "#como-funciona", label: "Como Funciona" },
    { href: "#mesas", label: "Mesas" },
    { href: "#mestres", label: "Mestres" },
  ];

  const closeMenu = () => setOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-screen-xl mx-auto w-full px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 sm:gap-4 min-w-0" onClick={closeMenu}>
          <img src={logoDragon} alt="Dragon Logo" className="h-10 sm:h-12 w-auto animate-float shrink-0" />
          <img src={logoText} alt="Glimer" className="h-7 sm:h-8 w-auto hidden sm:block" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium hover:text-primary transition-mystical">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden lg:inline truncate max-w-[180px]">
                Olá, {user.user_metadata?.display_name || user.email?.split('@')[0]}
              </span>
              <Button variant="ghost" size="sm" className="min-h-10" onClick={signOut}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex min-h-10" onClick={() => navigate('/auth')}>
                Entrar
              </Button>
              <Button variant="hero" size="sm" className="hidden sm:inline-flex min-h-10" onClick={() => navigate('/auth')}>
                Cadastrar
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 shrink-0"
            aria-label="Abrir menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md animate-fade-in">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={closeMenu}
                className="px-3 py-3 rounded-md text-sm font-medium hover:bg-muted/50 hover:text-primary transition-mystical"
              >
                {l.label}
              </a>
            ))}
            {!user && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border mt-2">
                <Button variant="ghost" size="sm" className="w-full min-h-11" onClick={() => { closeMenu(); navigate('/auth'); }}>
                  Entrar
                </Button>
                <Button variant="hero" size="sm" className="w-full min-h-11" onClick={() => { closeMenu(); navigate('/auth'); }}>
                  Cadastrar
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
