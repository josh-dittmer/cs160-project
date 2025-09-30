export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-green-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
        {/* Logo */}
        <img
        // TODO: Replace the logo
          src="/logo.png"
          alt="OFS Logo"
          className="h-16 w-auto mb-6"
        />

        {/* Content (login form) */}
        {children}
      </div>
    </div>
  );
}

