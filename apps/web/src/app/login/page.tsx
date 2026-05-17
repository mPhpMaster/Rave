import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-1">Sign in to Rave</h1>
        <p className="text-sm text-neutral-400 mb-6">Watch in sync with friends.</p>
        <LoginForm next={searchParams.next} initialError={searchParams.error} />
      </div>
    </main>
  );
}
