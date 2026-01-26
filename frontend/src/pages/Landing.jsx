import { Link } from "react-router-dom"

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-emerald-400">NoCodeAPI</h1>
        <div className="flex gap-4">
          <Link to="/login" className="px-4 py-2 rounded hover:bg-slate-800">
            Login
          </Link>
          <Link to="/signup" className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700">
            Signup
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6">Visual Express API Builder</h2>
        <p className="text-xl text-slate-300 mb-8">Design APIs visually. Deploy instantly. No coding required.</p>
        <div className="flex justify-center gap-4">
          <Link to="/signup" className="px-8 py-3 rounded bg-emerald-600 hover:bg-emerald-700 font-semibold">
            Start Building
          </Link>
          <button className="px-8 py-3 rounded border border-emerald-600 text-emerald-400 hover:bg-emerald-950">
            Learn More
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <h3 className="text-3xl font-bold mb-12 text-center">Powerful Features</h3>
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: "⚡", title: "Drag & Drop Builder", desc: "Visual node-based API designer" },
            { icon: "🚀", title: "Auto Deploy", desc: "Instant live endpoints" },
            { icon: "🗄️", title: "MongoDB Ready", desc: "Built-in database integration" },
            { icon: "📊", title: "Live Logs", desc: "Monitor all API calls" },
            { icon: "🔐", title: "API Keys", desc: "Secure API access" },
            { icon: "📚", title: "Auto Docs", desc: "Generated documentation" },
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-lg border border-slate-800 bg-slate-900">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h4 className="font-bold mb-2">{feature.title}</h4>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing placeholder */}
      <section className="bg-slate-900 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Simple Pricing</h3>
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-6 px-8">
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-950">
            <h4 className="font-bold text-lg mb-4">Free</h4>
            <p className="text-2xl font-bold mb-6">$0/mo</p>
            <ul className="space-y-2 text-slate-300 mb-6">
              <li>✓ 5 Projects</li>
              <li>✓ 1000 API calls/month</li>
              <li>✓ 7 days logs</li>
            </ul>
            <button className="w-full px-4 py-2 rounded border border-emerald-600 text-emerald-400">Start Free</button>
          </div>
          <div className="p-6 rounded-lg border border-emerald-600 bg-emerald-950">
            <h4 className="font-bold text-lg mb-4">Pro</h4>
            <p className="text-2xl font-bold mb-6">$29/mo</p>
            <ul className="space-y-2 text-slate-300 mb-6">
              <li>✓ Unlimited Projects</li>
              <li>✓ 1M API calls/month</li>
              <li>✓ 90 days logs</li>
            </ul>
            <button className="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700">Get Started</button>
          </div>
        </div>
      </section>
    </div>
  )
}
