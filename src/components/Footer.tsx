import logoText from "@/assets/logo-text.png";
import logoDragon from "@/assets/logo-dragon.png";
import { Github, Twitter, Instagram, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="relative border-t border-border bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoDragon} alt="Dragon" className="h-10 w-auto" />
              <img src={logoText} alt="Glimer" className="h-6 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A plataforma que conecta mestres e jogadores para aventuras inesquecíveis.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="font-bold text-foreground">Plataforma</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Para Mestres
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Para Jogadores
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Plano PRO
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h4 className="font-bold text-foreground">Comunidade</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Mestres Certificados
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Eventos
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-bold text-foreground">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <Link to="/termos" className="text-muted-foreground hover:text-primary transition-mystical">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-muted-foreground hover:text-primary transition-mystical">
                  Privacidade
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-mystical">
                  Contato
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2025 Glimer. Todos os direitos reservados.</p>
          <p className="mt-2 text-xs">
            "Na escuridão da Caverna, dados rolam e destinos se cruzam."
          </p>
        </div>
      </div>
    </footer>
  );
};
