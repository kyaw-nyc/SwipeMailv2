import { useState } from "react";
import { Link } from "react-router-dom";
import "./SignIn.css";
import { supabase } from "../../supabaseClient";
import Squares from "../components/Squares";

function SignInPage() {
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    setFeedback(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        scopes:
          "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setFeedback({
        type: "error",
        text: error.message ?? "Google sign-in is unavailable right now.",
      });
      setIsGoogleSubmitting(false);
    }
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
