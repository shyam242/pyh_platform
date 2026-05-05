export default function StatsCard({ label, value, color = "from-blue-500 to-cyan-500" }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-lg p-4 text-white shadow-md`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
