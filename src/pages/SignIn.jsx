import { useState } from "react";
import "./SignIn.css";
import { supabase } from "../../supabaseClient";

const SwipeIllustration = () => (
  <div className="swipe-demo" aria-hidden="true">
    <div className="swipe-demo__cards">
      <div className="swipe-card swipe-card--left">
        <div className="swipe-card__accent swipe-card__accent--left" />
        <span className="swipe-card__label">Later</span>
      </div>
      <div className="swipe-card swipe-card--center">
        <div className="swipe-card__accent swipe-card__accent--center" />
        <span className="swipe-card__label swipe-card__label--primary">Keep</span>
      </div>
      <div className="swipe-card swipe-card--right">
        <div className="swipe-card__accent swipe-card__accent--right" />
        <span className="swipe-card__label">Archive</span>
      </div>
    </div>
    <div className="swipe-demo__handle">
      <div className="swipe-demo__handle-dot" />
    </div>
  </div>
);

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
    <div className="sign-in-page">
      <div className="sign-in-wrapper">
        <section className="sign-in-column--form">
          <header className="sign-in-brand">
            <span className="sign-in-brand__mark" aria-hidden="true" />
            <div className="sign-in-brand__copy">
              <span className="sign-in-brand__name">SwipeMail</span>
              <span className="sign-in-brand__tagline">Inbox triage in one motion</span>
            </div>
            <span className="sign-in-brand__badge">Beta</span>
          </header>

          <div className="sign-in-content">
            <div className="sign-in-card">
              <div className="sign-in-card__intro">
                <h1>Sign in</h1>
                <p>Organize your inbox in seconds—just swipe.</p>
              </div>

              <button
                type="button"
                className="sign-in-button sign-in-button--google"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting}
              >
                <img
                  src="/Google__G__logo.svg.png"
                  alt=""
                  className="sign-in-button__logo"
                  width="18"
                  height="18"
                />
                <span>{isGoogleSubmitting ? "Redirecting…" : "Sign in with Google"}</span>
              </button>

              <div className="sign-in-trust">
                <span className="sign-in-trust__stat">
                  4,200+ daily swipe sessions
                </span>
                <span className="sign-in-trust__divider" aria-hidden="true" />
                <span className="sign-in-trust__meta">Built for fast-moving teams</span>
              </div>

              {feedback ? (
                <div
                  className={`sign-in-status${
                    feedback.type === "error" ? " sign-in-status--error" : ""
                  }`}
                >
                  {feedback.text}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="sign-in-column--aside">
          <h2>Bring order to every inbox in under a minute.</h2>
          <SwipeIllustration />
        </aside>
      </div>

      <footer className="sign-in-bottom-bar">
        <span>
          <strong>SwipeMail</strong> © 2025 All rights reserved.
        </span>
      </footer>
    </div>
  );
}

export default SignInPage;
