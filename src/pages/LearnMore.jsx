import { Link, useNavigate } from "react-router-dom";
import "./LearnMore.css";
import Squares from "../components/Squares";

function LearnMore() {
  const navigate = useNavigate();
  return (
    <div className="learn-more-page">
      <Squares
        speed={0.5}
        squareSize={40}
        direction='diagonal'
        borderColor='rgba(255, 255, 255, 0.1)'
        hoverFillColor='rgba(255, 255, 255, 0.05)'
      />

      <div className="learn-more-content">
        <header className="learn-more-header">
          <Link to="/" className="learn-more-logo">
            <span className="learn-more-logo__text">SwipeMail</span>
          </Link>
          <nav className="learn-more-nav">
            <button
              type="button"
              className="learn-more-nav__button"
              onClick={() => navigate('/')}
            >
              Login
            </button>
          </nav>
        </header>

        <main className="learn-more-main">
          <div className="learn-more-container">
            <h1 className="learn-more-hero-title">How SwipeMail Works</h1>
            <p className="learn-more-hero-subtitle">
              Organize your inbox in seconds with simple, intuitive gestures
            </p>

            <div className="learn-more-features">
              <div className="feature-card">
                <div className="feature-icon feature-icon--swipe">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </div>
                <h3>Swipe Right to Archive</h3>
                <p>
                  Quickly archive emails you've read and want to remove from your inbox.
                  Archived emails are still searchable and accessible whenever you need them.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon feature-icon--left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8l-5-5-5 5M13 3v9" />
                  </svg>
                </div>
                <h3>Swipe Left to Mark as Read</h3>
                <p>
                  Mark emails as read without archiving them. Perfect for emails you want to
                  keep in your inbox but don't need the unread indicator anymore.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon feature-icon--star">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <h3>Swipe Up to Star</h3>
                <p>
                  Star important emails for quick access later. Perfect for messages that
                  require follow-up or contain important information you'll need to reference.
                </p>
              </div>
            </div>

            <div className="learn-more-workflow">
              <h2>Your Inbox Workflow, Simplified</h2>
              <div className="workflow-steps">
                <div className="workflow-step">
                  <div className="step-number">1</div>
                  <h4>Connect Your Gmail</h4>
                  <p>Sign in securely with your Google account and grant Gmail access.</p>
                </div>
                <div className="workflow-step">
                  <div className="step-number">2</div>
                  <h4>Start Swiping</h4>
                  <p>Your most recent emails appear as cards. Swipe to take action.</p>
                </div>
                <div className="workflow-step">
                  <div className="step-number">3</div>
                  <h4>Inbox Zero in Minutes</h4>
                  <p>Process hundreds of emails in the time it used to take for dozens.</p>
                </div>
              </div>
            </div>

            <div className="learn-more-cta">
              <h2>Ready to Transform Your Inbox?</h2>
              <Link to="/" className="cta-button">Get Started Now</Link>
            </div>
          </div>
        </main>

        <footer className="learn-more-footer">
          <p>SwipeMail © 2025 All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default LearnMore;
