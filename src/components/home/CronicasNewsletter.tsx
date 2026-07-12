import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const articles = [
  {
    tag: "Narrativa",
    title: "Como criar vilões memoráveis para sua campanha",
    excerpt:
      "Um guia prático sobre motivações, arquétipos e o uso do cenário para dar profundidade aos antagonistas das suas sessões.",
    cover: "/assets/adventure-covers/dark-fantasy.jpg",
  },
  {
    tag: "Recursos",
    title: "Os melhores geradores de mapas para mestres",
    excerpt:
      "Ferramentas gratuitas e premium para transformar seus esboços em mapas profissionais em segundos.",
    cover: "/assets/adventure-covers/arcane-tower.jpg",
  },
];

export const CronicasNewsletter = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast({ title: "Inscrição recebida", description: "Seu corvo mensageiro está a caminho." });
    setEmail("");
  };

  return (
    <section className="bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <h3 className="font-display italic text-2xl sm:text-3xl border-b border-zinc-800 pb-4 mb-10 text-zinc-50">
            Crônicas & Dicas
          </h3>
          <div className="space-y-10">
            {articles.map((a) => (
              <article
                key={a.title}
                className="group flex flex-col md:flex-row gap-8 items-center cursor-pointer"
              >
                <div className="md:w-1/3 aspect-[4/3] w-full bg-zinc-900 overflow-hidden">
                  <img
                    src={a.cover}
                    alt={a.title}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                </div>
                <div className="md:w-2/3">
                  <span className="text-[10px] text-[#E8B84A] font-bold uppercase tracking-widest">
                    {a.tag}
                  </span>
                  <h4 className="font-display text-2xl mt-2 mb-3 text-zinc-50 group-hover:text-[#E8B84A] transition-colors">
                    {a.title}
                  </h4>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-4">{a.excerpt}</p>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-300 underline decoration-zinc-700 group-hover:decoration-[#E8B84A] underline-offset-4">
                    Ler mais
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-8">
            <h3 className="text-sm font-bold uppercase tracking-widest border-b border-zinc-800 pb-4 mb-6 text-zinc-200">
              Newsletter do Aventureiro
            </h3>
            <form
              onSubmit={onSubmit}
              className="p-6 bg-zinc-900/30 border border-zinc-800"
            >
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Receba dicas de mestragem, novos sistemas e convites para mesas exclusivas
                diretamente no seu corvo.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#0a0a0f] border border-zinc-700 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#E8B84A] mb-4 transition-colors"
              />
              <button
                type="submit"
                className="w-full py-3 bg-zinc-800 hover:bg-[#E8B84A] hover:text-zinc-950 text-zinc-100 text-sm font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                Inscrever-se
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
};