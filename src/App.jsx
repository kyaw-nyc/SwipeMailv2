import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { supabase } from "../supabaseClient";
import SignInPage from "./pages/SignIn";
import { archiveEmail, fetchRecentEmails, markAsRead, starEmail, GmailApiError } from "./lib/gmail";

const CARD_EXIT_TRANSLATIONS = {
  right: { x: 640, y: 0, rotation: 12 },
  left: { x: -640, y: 0, rotation: -12 },
  up: { x: 0, y: -640, rotation: 0 },
};

const ACTION_COPY = {
  left: { label: "Marked read", description: "We removed it from your unread pile." },
  right: { label: "Archived", description: "Moved out of your inbox but always searchable." },
  up: { label: "Starred", description: "Pinned to follow up when you're ready." },
};

const SwipeCard = ({ email, onSwipe, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0, rotation: 0 });
  const startPositionRef = useRef({ x: 0, y: 0 });
  const isAnimatingOutRef = useRef(false);

  const resetCard = () => {
    setOffset({ x: 0, y: 0, rotation: 0 });
  };

  const handlePointerDown = (event) => {
    if (disabled) return;
    setIsDragging(true);
    startPositionRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isDragging || disabled) return;

    const deltaX = event.clientX - startPositionRef.current.x;
    const deltaY = event.clientY - startPositionRef.current.y;

    setOffset({
      x: deltaX,
      y: deltaY,
      rotation: deltaX * 0.05,
    });
  };

  const handlePointerUp = async (event) => {
    if (!isDragging || disabled) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);

    const deltaX = event.clientX - startPositionRef.current.x;
    const deltaY = event.clientY - startPositionRef.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    let direction = null;

    if (absX > absY && absX > 120) {
      direction = deltaX > 0 ? "right" : "left";
    } else if (absY > 100 && deltaY < 0) {
      direction = "up";
    }

    if (!direction) {
      resetCard();
      return;
    }

    isAnimatingOutRef.current = true;
    const exit = CARD_EXIT_TRANSLATIONS[direction];
    setOffset(exit);

    try {
      await onSwipe(direction);
    } catch (error) {
      console.error(error);
      isAnimatingOutRef.current = false;
      resetCard();
    }
  };

  useEffect(() => {
    if (!isDragging && !isAnimatingOutRef.current) {
      resetCard();
    }
  }, [email.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <article
      className="mail-card"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${offset.rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.28s ease-in-out, box-shadow 0.28s ease",
        cursor: disabled ? "default" : "grab",
      }}
      role="button"
      aria-label={`Email from ${email.from} with subject ${email.subject}`}
    >
      <header className="mail-card__header">
        <div className="mail-card__from">{email.from}</div>
        <time className="mail-card__date">{new Date(email.internalDate).toLocaleString()}</time>
      </header>
      <h3 className="mail-card__subject">{email.subject}</h3>
      <p className="mail-card__snippet">{email.snippet}</p>
      <div className="mail-card__body">
        {email.body ? email.body.slice(0, 420) : "No preview available."}
      </div>
      <footer className="mail-card__footer">
        <span>Swipe right to archive · left to mark read · up to star</span>
      </footer>
    </article>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [emails, setEmails] = useState([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [error, setError] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [needsGoogleReauth, setNeedsGoogleReauth] = useState(false);

  const providerToken = session?.provider_token;

  const userInitials = useMemo(() => {
    const email = session?.user?.email ?? "";
    if (!email) return "";
    const local = email.split("@")[0] ?? "";
    const letters = local.replace(/[^A-Za-z]/g, "");
    if (letters.length >= 2) {
      return `${letters[0]}${letters[letters.length - 1]}`.toUpperCase();
    }
    if (letters.length === 1) {
      return letters.toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  }, [session?.user?.email]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.provider_token && session?.access_token) {
        setProfile({
          avatarUrl: session.user?.user_metadata?.avatar_url,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.provider_token && session?.access_token) {
        setProfile({
          avatarUrl: session.user?.user_metadata?.avatar_url,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadEmails = useMemo(
    () => async () => {
      if (!providerToken) {
        setNeedsGoogleReauth(true);
        return;
      }
      setIsLoadingEmails(true);
      setError(null);
      setNeedsGoogleReauth(false);
      if (!profile?.avatarUrl && session?.user?.identities?.length) {
        const googleIdentity = session.user.identities.find(
          (identity) => identity.provider === "google"
        );
        if (googleIdentity?.identity_data?.avatar_url) {
          setProfile({ avatarUrl: googleIdentity.identity_data.avatar_url });
        }
      }
      try {
        const data = await fetchRecentEmails(providerToken, 50);
        setEmails(data);
      } catch (err) {
        console.error(err);
        if (err instanceof GmailApiError && err.status === 403) {
          setNeedsGoogleReauth(true);
          setError(
            "Google blocked the request because this account hasn’t granted Gmail access to SwipeMail yet."
          );
        } else if (err instanceof GmailApiError && err.status === 401) {
          setNeedsGoogleReauth(true);
          setError("Your Google session expired. Please reconnect Gmail.");
        } else {
          setError(
            "We couldn’t load your inbox. Make sure you granted Gmail access and try refreshing."
          );
        }
      } finally {
        setIsLoadingEmails(false);
      }
    },
    [providerToken]
  );

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmails([]);
    setNeedsGoogleReauth(false);
  };

  const handleSwipe = async (direction) => {
    if (!providerToken) {
      setNeedsGoogleReauth(true);
      return;
    }
    if (emails.length === 0) return;

    const currentEmail = emails[0];
    if (!currentEmail) return;

    setActiveAction(direction);
    try {
      if (direction === "left") {
        await markAsRead(providerToken, currentEmail.id);
      } else if (direction === "right") {
        await archiveEmail(providerToken, currentEmail.id);
      } else if (direction === "up") {
        await starEmail(providerToken, currentEmail.id);
      }

      setEmails((prev) => prev.slice(1));
      setActionFeedback({
        key: `${currentEmail.id}-${direction}`,
        ...ACTION_COPY[direction],
        email: currentEmail,
      });
    } catch (err) {
      console.error(err);
      setError("We couldn’t update Gmail. Please refresh and try again.");
    } finally {
      setActiveAction(null);
    }
  };

  const reconnectGmail = async () => {
    setNeedsGoogleReauth(false);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        scopes:
          "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  const avatarUrl = profile?.avatarUrl ?? session?.user?.user_metadata?.avatar_url ?? null;

  useEffect(() => {
    if (!actionFeedback) return undefined;
    const timeout = setTimeout(() => {
      setActionFeedback(null);
    }, 3200);
    return () => clearTimeout(timeout);
  }, [actionFeedback]);

  if (!session) {
    return <SignInPage />;
  }

  return (
    <div className="dashboard">
      <aside className="dashboard__sidebar">
        <div className="sidebar__logo">
          <span className="sidebar__mark" aria-hidden="true" />
          <div>
            <strong>SwipeMail</strong>
            <span className="sidebar__tag">Beta</span>
          </div>
        </div>

        <div className="sidebar__summary">
          <h2>Inbox Flow</h2>
          <p>
            Swipe through your latest emails. Archive with a flick right, mark read with a
            flick left, star important threads by swiping up.
          </p>
          <ul>
            <li>
              <span className="sidebar__bullet sidebar__bullet--right" />
              Swipe right → Archive
            </li>
            <li>
              <span className="sidebar__bullet sidebar__bullet--left" />
              Swipe left → Mark read
            </li>
            <li>
              <span className="sidebar__bullet sidebar__bullet--up" />
              Swipe up → Star
            </li>
          </ul>
        </div>

        <div className="sidebar__footer">
          <button
            className="sidebar__reload"
            type="button"
            onClick={loadEmails}
            disabled={isLoadingEmails}
          >
            {isLoadingEmails ? "Refreshing…" : "Refresh inbox"}
          </button>
          <button className="sidebar__signout" type="button" onClick={signOut}>
            Sign out
          </button>
          <div className="sidebar__user">
            {avatarUrl ? (
              <img className="sidebar__avatar sidebar__avatar--image" src={avatarUrl} alt="" />
            ) : (
              <span className="sidebar__avatar">{userInitials}</span>
            )}
            <div>
              <strong>{session.user?.email}</strong>
              <span>Signed in with Google</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard__stage">
        <header className="stage__header">
          <div>
            <h1>Latest mail</h1>
            <p>
              {isLoadingEmails
                ? "Fetching your inbox…"
                : `Showing ${Math.min(emails.length, 50)} of your newest conversations.`}
            </p>
          </div>
        </header>

        {error ? (
          <div className="stage__error">
            <span>{error}</span>
            {needsGoogleReauth ? (
              <button type="button" onClick={reconnectGmail}>
                Grant Gmail access
              </button>
            ) : (
              <button type="button" onClick={loadEmails} disabled={isLoadingEmails}>
                Try again
              </button>
            )}
          </div>
        ) : null}

        <section className="stage__deck">
          {isLoadingEmails && emails.length === 0 ? (
            <div className="mail-card mail-card--placeholder">
              <div className="mail-card__skeleton mail-card__skeleton--from" />
              <div className="mail-card__skeleton mail-card__skeleton--subject" />
              <div className="mail-card__skeleton mail-card__skeleton--snippet" />
              <div className="mail-card__skeleton mail-card__skeleton--body" />
            </div>
          ) : null}

          {!isLoadingEmails && emails.length === 0 && !needsGoogleReauth ? (
            <div className="empty-state">
              <h2>Nothing left to triage 🎉</h2>
              <p>When new emails arrive, swipe through them right here.</p>
            </div>
          ) : null}

          {needsGoogleReauth && (
            <div className="empty-state empty-state--reauth">
              <h2>Connect Gmail to start swiping</h2>
              <p>
                We need permission to read and update your inbox. Google may ask you to confirm the
                Gmail scopes because the app is still in testing.
              </p>
              <button type="button" onClick={reconnectGmail} className="empty-state__cta">
                Grant Gmail access
              </button>
            </div>
          )}

          {emails.slice(0, 3).map((email, index) => (
            <div
              key={email.id}
              className={`deck-layer deck-layer--${index}`}
              style={{ zIndex: 10 - index }}
            >
              {index === 0 ? (
                <SwipeCard email={email} onSwipe={handleSwipe} disabled={!!activeAction} />
              ) : (
                <article className="mail-card mail-card--preview">
                  <header className="mail-card__header">
                    <div className="mail-card__from">{email.from}</div>
                    <time className="mail-card__date">
                      {new Date(email.internalDate).toLocaleDateString()}
                    </time>
                  </header>
                  <h3 className="mail-card__subject">{email.subject}</h3>
                  <p className="mail-card__snippet">{email.snippet}</p>
                </article>
              )}
            </div>
          ))}
        </section>

        {actionFeedback ? (
          <div className="stage__feedback">
            <strong>{actionFeedback.label}</strong>
            <span>{actionFeedback.description}</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
