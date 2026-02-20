import { Link } from 'react-router-dom';
import { Activity, Shield, BarChart3, Smartphone, Heart, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans antialiased">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-primary">AnimalDot</span>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 rounded-lg px-2 py-1">Features</a>
            <Link to="/app" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 rounded-lg px-2 py-1">Log in</Link>
            <Link
              to="/app"
              className="rounded-xl bg-primary px-5 py-2.5 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/30 hover:bg-primary/95 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" aria-hidden />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto text-center">
          <p className="text-primary font-semibold mb-4 tracking-widest uppercase text-xs">Smart pet monitoring</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] max-w-4xl mx-auto mb-6 tracking-tight">
            Peace of mind for every pet.{' '}
            <span className="text-primary">Real-time vitals</span>
            {' '}from their bed.
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            AnimalDot monitors heart rate, respiration, temperature, and weight through a smart bed sensor—so you can catch changes early and keep them healthy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/app"
              className="rounded-2xl bg-primary px-8 py-4 text-white font-semibold shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:bg-primary/95 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Smartphone className="w-5 h-5 shrink-0" aria-hidden />
              Open the app
            </Link>
            <a
              href="#features"
              className="rounded-2xl bg-white border-2 border-slate-200 px-8 py-4 text-slate-800 font-semibold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-4 tracking-tight">Built for pet health</h2>
          <p className="text-center text-slate-600 max-w-xl mx-auto mb-16 text-lg leading-relaxed">
            One sensor under the bed. Continuous vitals, alerts, and trends in the palm of your hand.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Heart, title: 'Live vitals', desc: 'Heart rate, respiration, temperature, and weight at a glance.' },
              { icon: BarChart3, title: 'Trends & history', desc: 'Spot patterns and share data with your vet.' },
              { icon: Shield, title: 'Early alerts', desc: 'Get notified when something looks off.' },
              { icon: Activity, title: 'Rest & activity', desc: 'Sleep quality and movement from the bed.' },
              { icon: Zap, title: 'Simple setup', desc: 'Place the sensor, connect in the app, done.' },
              { icon: Smartphone, title: 'App & web', desc: 'Use the mobile app or the website—same account.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-6 h-6 text-primary" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Ready to try AnimalDot?</h2>
          <p className="text-slate-600 mb-10 text-lg leading-relaxed">
            Open the app in your browser or download the mobile app. No hardware required to explore.
          </p>
          <Link
            to="/app"
            className="inline-flex rounded-2xl bg-primary px-8 py-4 text-white font-semibold shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:bg-primary/95 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Open the app
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-slate-500 text-sm">© AnimalDot. Smart animal bed monitoring.</span>
          <div className="flex gap-6 text-sm">
            <Link to="/app" className="text-slate-500 hover:text-primary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 rounded">App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
