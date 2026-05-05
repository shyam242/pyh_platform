export default function Input({ label, error, variant = "default", ...props }) {
  const variants = {
    default: {
      container: "border-gray-600 focus:border-blue-500 bg-gray-800/50 text-white placeholder-gray-500",
      label: "text-gray-300",
      error: "border-red-500 focus:border-red-600 bg-red-900/20",
    },
    light: {
      container: "border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400",
      label: "text-gray-700",
      error: "border-red-300 focus:border-red-500 bg-red-50",
    },
  };

  const variantStyle = variants[variant] || variants.default;

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-semibold mb-2 ${variantStyle.label}`}>
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none transition-all duration-300 ${
          error ? variantStyle.error : variantStyle.container
        }`}
        {...props}
      />
      {error && (
        <p className={`text-sm mt-2 ${variant === "light" ? "text-red-600" : "text-red-400"}`}>
          {error}
        </p>
      )}
    </div>
  );
}
