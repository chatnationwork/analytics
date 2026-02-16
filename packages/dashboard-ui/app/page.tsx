"use client";

import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Eye,
  Users,
  MessageCircle,
  BarChart3,
  Target,
  Clock,
  Globe,
} from "lucide-react";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function LandingPage() {
  const [signupAvailable, setSignupAvailable] = useState(false);

  useEffect(() => {
    api.checkSignupAvailability().then((data) => {
      setSignupAvailable(data.available);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <nav className="relative max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">
              A
            </div>
            <span className="font-semibold text-xl">Shuru Connect</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/showcase"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Preview
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </nav>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm mb-8 border border-white/10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Built for Shuru Connect · Web + WhatsApp in one place
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            Connect
            <br />Your Teams
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12">
            See how users move through tax services and WhatsApp, where they
            drop off, and how campaigns perform.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="group px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-lg font-medium flex items-center gap-2"
            >
              Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {signupAvailable && (
              <Link
                href="/signup"
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all text-lg font-medium"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              S
            </div>
            <span>Shuru Connect · Built by ChatNation</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-white transition-colors">
              Documentation
            </Link>
            <Link
              href="/docs/api"
              className="hover:text-white transition-colors"
            >
              API
            </Link>
            <Link
              href="/docs/sdk"
              className="hover:text-white transition-colors"
            >
              SDK
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
