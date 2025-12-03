import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./SignIn.css";
import Squares from "../components/Squares";
import { redirectToLogin } from "../lib/auth";

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
    <div className="landing-page">
      <Squares
        speed={0.5}
        squareSize={40}
        direction='diagonal'
        borderColor='rgba(255, 255, 255, 0.1)'
        hoverFillColor='rgba(255, 255, 255, 0.05)'
      />

      <div className="landing-content">
        <header className="landing-header">
          <div className="landing-logo">
            <span className="landing-logo__text">SwipeMail</span>
          </div>
          <nav className="landing-nav">
            <button
              type="button"
              className="landing-nav__button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
            >
              {isGoogleSubmitting ? "Redirecting…" : "Login"}
            </button>
          </nav>
        </header>

        <main className="landing-main">
          <h1 className="landing-title">
            Organize your inbox<br />with simple swipes
          </h1>

          <div className="landing-actions">
            <button
              type="button"
              className="landing-button landing-button--primary"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
            >
              {isGoogleSubmitting ? "Redirecting…" : "Get Started"}
            </button>
            <Link
              to="/learn-more"
              className="landing-button landing-button--secondary"
            >
              Learn More
            </Link>
          </div>

          {feedback ? (
            <div className="landing-feedback">
              {feedback.text}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default SignInPage;
