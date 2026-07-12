import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative border-b border-zinc-800/80 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="z-10 animate-fade-in">
          <span className="uppercase tracking-[0.28em] text-xs font-semibold text-[#E8B84A] mb-5 block">
            Destaque da Semana
          </span>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl leading-[0.95] mb-6 text-zinc-50">
            A Forja de <br />
            <i className="italic font-normal bg-gradient-to-r from-[#24AEFF] via-[#7E3DFF] to-[#C04AFF] bg-clip-text text-transparent">
              Glimer
            </i>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-md mb-8 leading-relaxed">
            Descubra mesas épicas, conecte-se com mestres lendários e viva aventuras
            inesquecíveis. Gestão, segurança e diversão em um só lugar.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/auth")}
              className="px-8 py-4 bg-zinc-50 text-zinc-950 font-bold hover:bg-[#E8B84A] transition-colors uppercase text-sm tracking-tight cursor-pointer"
            >
              Encontrar Mesa
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="px-8 py-4 border border-zinc-700 text-zinc-100 font-bold hover:bg-zinc-900 transition-colors uppercase text-sm tracking-tight cursor-pointer"
            >
              Seja um Mestre
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-10 text-xs uppercase tracking-widest text-zinc-500">
            <span><b className="text-zinc-200 font-display text-base normal-case tracking-normal">+500</b> mesas ativas</span>
            <span className="h-4 w-px bg-zinc-800" />
            <span><b className="text-zinc-200 font-display text-base normal-case tracking-normal">+2.000</b> jogadores</span>
            <span className="h-4 w-px bg-zinc-800" />
            <span><b className="text-zinc-200 font-display text-base normal-case tracking-normal">+150</b> mestres</span>
          </div>
        </div>

        <div className="relative aspect-[4/5] bg-zinc-900 overflow-hidden shadow-2xl group">
          <img
            src="/assets/adventure-covers/dark-fantasy.jpg"
            alt="Aventureiro em caverna sombria com cristais brilhantes"
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2323FF]/10 via-transparent to-[#C04AFF]/10 mix-blend-screen" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="p-4 border-l-2 border-[#E8B84A] bg-[#0a0a0f]/70 backdrop-blur-md">
              <p className="text-sm italic text-zinc-200 font-editorial">
                "O abismo sussurra segredos que apenas os dados podem revelar."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};