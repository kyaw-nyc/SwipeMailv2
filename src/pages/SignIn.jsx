import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Squares from "../components/Squares";
import { redirectToLogin } from "../lib/auth";
import { Button } from "@/components/ui/button";

const AUTH_ERROR_MESSAGES = {
  state_mismatch: "That sign-in attempt expired. Please try again.",
  missing_code: "Google did not return a code. Refresh and try again.",
  oauth_error: "Google refused to issue tokens for this account.",
  callback_failed: "Google sign-in is unavailable right now. Please retry in a moment.",
};

function SignInPage() {
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("authError");
    if (!reason) return null;
    return {
      type: "error",
      text: AUTH_ERROR_MESSAGES[reason] ?? AUTH_ERROR_MESSAGES.callback_failed,
    };
  });

  useEffect(() => {
    if (!window.location.search) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("authError")) {
      url.searchParams.delete("authError");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleGoogleSignIn = () => {
    setIsGoogleSubmitting(true);
    setFeedback(null);
    redirectToLogin();
  };

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
          <div className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">SwipeMail</span>
          </div>
          <nav>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
            >
              {isGoogleSubmitting ? "Redirecting…" : "Login"}
            </Button>
          </nav>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-12 max-w-4xl bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Triage your email<br />with simple swipes
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button
              size="lg"
              className="bg-gray-700 text-white hover:bg-gray-600 px-8 py-6 text-lg font-semibold border border-gray-600"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
            >
              {isGoogleSubmitting ? "Redirecting…" : "Get Started"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="!bg-transparent border-2 border-gray-500 text-white hover:!bg-gray-800/50 hover:border-gray-400 px-8 py-6 text-lg font-semibold transition-all"
              asChild
            >
              <Link to="/learn-more">
                Learn More
              </Link>
            </Button>
          </div>

          {feedback ? (
            <div className="mt-8 px-6 py-3 bg-gray-800/30 border border-gray-700 text-gray-200 rounded-lg max-w-md">
              {feedback.text}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default SignInPage;
