export default function Badge({ children, variant = "primary" }) {
  const variants = {
    primary: "bg-blue-100 text-blue-800 border-blue-300",
    green: "bg-green-100 text-green-800 border-green-300",
    red: "bg-red-100 text-red-800 border-red-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    purple: "bg-purple-100 text-purple-800 border-purple-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}
