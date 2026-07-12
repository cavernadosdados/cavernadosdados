const mestres = [
  { name: "Mestre Alaric", specialty: "High Fantasy", tone: "#E8B84A", featured: true },
  { name: "Narradora Elena", specialty: "Terror Psicológico", tone: "#C04AFF", featured: false },
  { name: "Grimm O Sábio", specialty: "Sci-Fi / Cyberpunk", tone: "#24AEFF", featured: false },
  { name: "Mestra Sofia", specialty: "Capa & Espada", tone: "#7E3DFF", featured: false },
];

export const MestresDestaque = () => {
  return (
    <section className="bg-zinc-900/40 border-y border-zinc-800 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="uppercase tracking-[0.28em] text-xs font-semibold text-[#E8B84A]">
            Nossos Narradores
          </span>
          <h2 className="font-display italic text-3xl sm:text-4xl mt-3 text-zinc-50">
            Lendas da Comunidade
          </h2>
          <p className="text-zinc-500 mt-2 text-sm">
            Mestres que elevam a narrativa a outro patamar
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {mestres.map((m) => (
            <div key={m.name} className="text-center group cursor-pointer">
              <div
                className="w-28 h-28 md:w-32 md:h-32 mx-auto rounded-full overflow-hidden mb-6 border-2 p-1 bg-[#0a0a0f] transition-colors"
                style={{ borderColor: m.featured ? m.tone : "hsl(0 0% 20%)" }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${m.tone}55, transparent 70%), linear-gradient(135deg, #1a1a24, #0a0a0f)`,
                  }}
                >
                  <div className="w-full h-full rounded-full flex items-center justify-center font-display text-3xl text-zinc-100">
                    {m.name.split(" ").slice(-1)[0][0]}
                  </div>
                </div>
              </div>
              <h4 className="font-editorial font-bold text-zinc-50 mb-1">{m.name}</h4>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                {m.specialty}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};