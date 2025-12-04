import { Link, useNavigate } from "react-router-dom";
import Squares from "../components/Squares";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function LearnMore() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative bg-gray-950 text-white overflow-hidden">
      <Squares
        speed={0.5}
        squareSize={40}
        direction='diagonal'
        borderColor='rgba(255, 255, 255, 0.1)'
        hoverFillColor='rgba(255, 255, 255, 0.05)'
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">SwipeMail</span>
          </Link>
          <nav>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => navigate('/')}
            >
              Login
            </Button>
          </nav>
        </header>

        <main className="flex-1 px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-center mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              How SwipeMail Works
            </h1>
            <p className="text-xl text-center text-gray-300 mb-16 max-w-3xl mx-auto">
              Triage your email in seconds with simple, intuitive gestures
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-20">
              <Card className="bg-gray-900/50 border-gray-800 p-8 backdrop-blur">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-6 text-white">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Swipe Right to Archive</h3>
                <p className="text-gray-400 leading-relaxed">
                  Quickly archive emails you've triaged and want to clear from view.
                  Archived emails are still searchable and accessible whenever you need them.
                </p>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 p-8 backdrop-blur">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center mb-6 text-white">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8l-5-5-5 5M13 3v9" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Swipe Left to Mark as Read</h3>
                <p className="text-gray-400 leading-relaxed">
                  Mark emails as read without archiving them. Perfect for emails you've triaged
                  but want to keep visible for reference.
                </p>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 p-8 backdrop-blur">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center mb-6 text-white">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Swipe Up to Star</h3>
                <p className="text-gray-400 leading-relaxed">
                  Star important emails for quick access later. Perfect for messages that
                  require follow-up or contain important information you'll need to reference.
                </p>
              </Card>
            </div>

            <div className="mb-20">
              <h2 className="text-4xl font-bold text-center mb-12 text-white">Your Triage Workflow, Simplified</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                    1
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-white">Connect Your Gmail</h4>
                  <p className="text-gray-400">Sign in securely with your Google account and grant Gmail access.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                    2
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-white">Start Swiping</h4>
                  <p className="text-gray-400">Your most recent emails appear as cards. Swipe to take action.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                    3
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-white">Triage in Minutes</h4>
                  <p className="text-gray-400">Process hundreds of emails in the time it used to take for dozens.</p>
                </div>
              </div>
            </div>

            <div className="text-center py-16 bg-gradient-to-b from-transparent via-gray-900/20 to-transparent rounded-3xl">
              <h2 className="text-4xl font-bold mb-8 text-white">Ready to Master Email Triage?</h2>
              <Button
                size="lg"
                className="bg-gray-700 text-white hover:bg-gray-600 px-8 py-6 text-lg font-semibold border border-gray-600"
                asChild
              >
                <Link to="/">Get Started Now</Link>
              </Button>
            </div>
          </div>
        </main>

        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>SwipeMail © 2025 All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default LearnMore;
