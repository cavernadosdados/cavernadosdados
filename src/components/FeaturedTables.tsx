import { useNavigate } from "react-router-dom";

type Table = {
  title: string;
  system: string;
  cover: string;
  vacancy: string;
  vacancyTone: "open" | "last" | "full";
  schedule: string;
  systemColor: string;
};

const tables: Table[] = [
  {
    title: "O Herdeiro das Sombras",
    system: "D&D 5E",
    cover: "/assets/adventure-covers/dark-fantasy.jpg",
    vacancy: "3/5 Vagas",
    vacancyTone: "open",
    schedule: "Quintas-feiras, 20h",
    systemColor: "#24AEFF",
  },
  {
    title: "Sinfonia de Innsmouth",
    system: "Call of Cthulhu",
    cover: "/assets/adventure-covers/cosmic-horror.jpg",
    vacancy: "1 Vaga Restante",
    vacancyTone: "last",
    schedule: "Sábados, 15h",
    systemColor: "#C04AFF",
  },
  {
    title: "Sinais do Outro Lado",
    system: "Ordem Paranormal",
    cover: "/assets/adventure-covers/cyberpunk.jpg",
    vacancy: "Completa",
    vacancyTone: "full",
    schedule: "Domingos, 19h",
    systemColor: "#7E3DFF",
  },
  {
    title: "A Torre Sem Fim",
    system: "Tormenta 20",
    cover: "/assets/adventure-covers/arcane-tower.jpg",
    vacancy: "2/6 Vagas",
    vacancyTone: "open",
    schedule: "Terças, 20h",
    systemColor: "#2323FF",
  },
  {
    title: "Corações da Floresta",
    system: "Vampiro: A Máscara",
    cover: "/assets/adventure-covers/enchanted-forest.jpg",
    vacancy: "4/5 Vagas",
    vacancyTone: "open",
    schedule: "Sextas, 19h30",
    systemColor: "#24AEFF",
  },
  {
    title: "As Profundezas de Khaz",
    system: "Old Dragon 2",
    cover: "/assets/adventure-covers/dungeon.jpg",
    vacancy: "1 Vaga Restante",
    vacancyTone: "last",
    schedule: "Quartas, 21h",
    systemColor: "#E8B84A",
  },
];

const vacancyClass = {
  open: "text-zinc-200",
  last: "text-green-400 font-medium",
  full: "text-zinc-500",
} as const;

export const FeaturedTables = () => {
  const navigate = useNavigate();

  return (
    <section id="mesas" className="bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-wrap gap-6 justify-between items-end mb-12 border-b border-zinc-800 pb-6">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl text-zinc-50">Mesas em Aberto</h2>
            <p className="text-zinc-500 text-sm mt-2">Sessões prontas para novos jogadores</p>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="text-xs uppercase tracking-widest font-bold text-zinc-300 hover:text-[#E8B84A] transition-colors"
          >
            Ver catálogo completo →
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tables.map((t) => (
            <button
              key={t.title}
              onClick={() => navigate("/auth")}
              className="group text-left"
            >
              <div className="aspect-video bg-zinc-900 overflow-hidden mb-4 relative">
                <img
                  src={t.cover}
                  alt={t.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className="absolute top-3 left-3 bg-[#0a0a0f]/80 px-2 py-1 text-[10px] uppercase font-bold tracking-widest border"
                  style={{ borderColor: `${t.systemColor}55`, color: t.systemColor }}
                >
                  {t.system}
                </div>
              </div>
              <h3 className="font-display italic text-xl sm:text-2xl text-zinc-50 mb-2 group-hover:text-[#E8B84A] transition-colors">
                {t.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className={vacancyClass[t.vacancyTone]}>{t.vacancy}</span>
                <span>•</span>
                <span>{t.schedule}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};