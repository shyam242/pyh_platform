export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  ...props
}) {
  const baseStyles = "font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-500 hover:to-blue-600",
    secondary: "border-2 border-gray-600 text-gray-100 hover:border-gray-400 hover:bg-gray-800/50",
    danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30",
    success: "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/30",
    ghost: "text-gray-300 hover:text-white hover:bg-gray-700/50",
    outline: "border-2 border-blue-500 text-blue-400 hover:border-blue-400 hover:bg-blue-500/10",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-lg",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
