import { Link, useNavigate } from "react-router-dom";
import Squares from "../components/Squares";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function LearnMore() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative bg-white text-[#1a1a1a] overflow-hidden">
      <Squares
        speed={0.5}
        squareSize={40}
        direction='diagonal'
        borderColor='rgba(0, 0, 0, 0.05)'
        hoverFillColor='rgba(0, 0, 0, 0.02)'
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span>SwipeMail</span>
          </Link>
          <nav>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
            >
              Login
            </Button>
          </nav>
        </header>

        <main className="flex-1 px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-center mb-6 text-[#1a1a1a]">
              How SwipeMail Works
            </h1>
            <p className="text-xl text-center text-[#666666] mb-16 max-w-3xl mx-auto">
              Triage your email in seconds with simple, intuitive gestures
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-20">
              <Card className="bg-white border-[#e5e5e5] p-8">
                <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-6 text-[#1a1a1a]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#1a1a1a]">Swipe Right to Archive</h3>
                <p className="text-[#666666] leading-relaxed">
                  Quickly archive emails you've triaged and want to clear from view.
                  Archived emails are still searchable and accessible whenever you need them.
                </p>
              </Card>

              <Card className="bg-white border-[#e5e5e5] p-8">
                <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-6 text-[#1a1a1a]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8l-5-5-5 5M13 3v9" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#1a1a1a]">Swipe Left to Mark as Read</h3>
                <p className="text-[#666666] leading-relaxed">
                  Mark emails as read without archiving them. Perfect for emails you've triaged
                  but want to keep visible for reference.
                </p>
              </Card>

              <Card className="bg-white border-[#e5e5e5] p-8">
                <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-6 text-[#1a1a1a]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#1a1a1a]">Swipe Up to Star</h3>
                <p className="text-[#666666] leading-relaxed">
                  Star important emails for quick access later. Perfect for messages that
                  require follow-up or contain important information you'll need to reference.
                </p>
              </Card>
            </div>

            <div className="mb-20">
              <h2 className="text-4xl font-bold text-center mb-12 text-[#1a1a1a]">Your Triage Workflow, Simplified</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                    1
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-[#1a1a1a]">Connect Your Gmail</h4>
                  <p className="text-[#666666]">Sign in securely with your Google account and grant Gmail access.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                    2
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-[#1a1a1a]">Start Swiping</h4>
                  <p className="text-[#666666]">Your most recent emails appear as cards. Swipe to take action.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                    3
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-[#1a1a1a]">Triage in Minutes</h4>
                  <p className="text-[#666666]">Process hundreds of emails in the time it used to take for dozens.</p>
                </div>
              </div>
            </div>

            <div className="text-center py-16 bg-[#fafafa] rounded-3xl">
              <h2 className="text-4xl font-bold mb-8 text-[#1a1a1a]">Ready to Master Email Triage?</h2>
              <Button
                size="lg"
                className="px-8 py-6 text-lg font-semibold"
                asChild
              >
                <Link to="/">Get Started Now</Link>
              </Button>
            </div>
          </div>
        </main>

        <footer className="text-center py-8 text-[#999999] text-sm">
          <p>SwipeMail © 2025 All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default LearnMore;
