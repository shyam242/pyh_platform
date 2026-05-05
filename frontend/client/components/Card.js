export default function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-xl p-8 border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
