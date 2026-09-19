import { loginAction } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form action={loginAction} className="bg-white shadow rounded-lg p-8 w-full max-w-sm space-y-4">
        <h1 className="text-lg font-semibold">Iraq Restaurant Platform — Staff Login</h1>
        {searchParams?.error && (
          <p className="text-sm text-red-600">Invalid email or password.</p>
        )}
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input name="email" type="email" required className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input name="password" type="password" required className="w-full border rounded px-3 py-2" />
        </div>
        <button className="w-full bg-brand-600 text-white rounded py-2 font-medium">Sign in</button>
        <p className="text-xs text-gray-500">
          Seeded demo accounts (password <code>ChangeMe123!</code>): admin@example.com,
          owner@example.com, sales.manager@example.com, sales.agent@example.com, finance@example.com
        </p>
      </form>
    </div>
  );
}
