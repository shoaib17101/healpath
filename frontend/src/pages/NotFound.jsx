import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl text-center rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-5xl font-bold text-slate-900">404</h1>
        <p className="mt-4 text-slate-600">We couldn't find the page you're looking for.</p>
        <Link to="/" className="inline-flex mt-8 rounded-full bg-teal-600 px-6 py-3 text-white font-semibold hover:bg-teal-700 transition">
          Go back home
        </Link>
      </div>
    </div>
  )
}
