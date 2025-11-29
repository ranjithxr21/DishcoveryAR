import React from 'react';
import { ViewMode } from '../types';
import { ScanLine, Box, Globe, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: ViewMode) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-[#0f0f0f] text-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 right-0 w-96 h-96 bg-brand-600/20 rounded-full blur-[128px]"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[96px]"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold mb-6 animate-fade-in-up">
            <Zap size={12} className="fill-brand-300" /> NEW: No-Code AR Editor
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Bring Your Menu to Life with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-500">Augmented Reality</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Transform static food photos into interactive 3D experiences. Boost engagement, reduce uncertainty, and increase sales with Dishcovery's no-code AR platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
                onClick={() => onNavigate(ViewMode.SIGNUP)}
                className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-brand-900/30 flex items-center justify-center gap-2"
            >
                Start for Free <ArrowRight size={20} />
            </button>
            <button 
                onClick={() => onNavigate(ViewMode.MENU)}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
                View Demo Menu
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#141414] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Everything you need to go 3D</h2>
                <p className="text-gray-400">Powerful tools designed for restaurants, cafes, and food brands.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/5 hover:border-brand-500/30 transition-colors group">
                    <div className="w-12 h-12 bg-brand-900/30 rounded-xl flex items-center justify-center text-brand-400 mb-6 group-hover:scale-110 transition-transform">
                        <ScanLine size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Instant Marker Tracking</h3>
                    <p className="text-gray-400 leading-relaxed">
                        No app download required. Customers simply scan your existing paper menu with their phone camera to reveal 3D dishes instantly.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                    <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                        <Box size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Real-time 3D Preview</h3>
                    <p className="text-gray-400 leading-relaxed">
                        Upload your GLB models and position them perfectly on your menu using our visual editor. What you see is what your customers get.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/5 hover:border-green-500/30 transition-colors group">
                    <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
                        <Globe size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">One-Click Export</h3>
                    <p className="text-gray-400 leading-relaxed">
                        Generate a complete, standalone website package ready for hosting. Includes watermarking for free tiers and custom branding for pros.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-brand-900 to-purple-900 rounded-3xl p-12 text-center relative overflow-hidden border border-white/10 shadow-2xl">
              <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to upgrade your menu?</h2>
                  <div className="flex flex-col md:flex-row justify-center gap-8 mb-8 text-left max-w-2xl mx-auto">
                      <div className="flex items-center gap-3">
                          <CheckCircle2 className="text-green-400 flex-shrink-0" />
                          <span>Free forever plan available</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <CheckCircle2 className="text-green-400 flex-shrink-0" />
                          <span>No credit card required</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <CheckCircle2 className="text-green-400 flex-shrink-0" />
                          <span>Cancel anytime</span>
                      </div>
                  </div>
                  <button 
                    onClick={() => onNavigate(ViewMode.SIGNUP)}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white -brand-00 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl"
                  >
                      Get Started Now
                  </button>
              </div>
              
              {/* Background decorative circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Dishcovery. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;