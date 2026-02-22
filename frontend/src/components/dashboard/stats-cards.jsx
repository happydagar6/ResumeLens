// Gradient scheme cycles per card index
const CARD_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
];

const CARD_GLOW = [
  "shadow-indigo-500/25",
  "shadow-cyan-500/25",
  "shadow-emerald-500/25",
  "shadow-amber-500/25",
  "shadow-rose-500/25",
  "shadow-violet-500/25",
];

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const grad = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
        const glow = CARD_GLOW[i % CARD_GLOW.length];
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-5 text-white shadow-lg ${glow} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
          >
            {/* decorative circle */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -right-1 -bottom-6 h-28 w-28 rounded-full bg-white/5" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{stat.label}</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight">{stat.value ?? "—"}</p>
              </div>
              {Icon && (
                <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
