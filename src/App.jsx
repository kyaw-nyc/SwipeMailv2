import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, useCallback } from "react";
import "./App.css";
import { supabase } from "../supabaseClient";
import SignInPage from "./pages/SignIn";
import {
  archiveEmail,
  fetchRecentEmails,
  fetchEmailsByLabel,
  fetchLabels,
  markAsRead,
  starEmail,
  GmailApiError,
  formatBodyForDisplay,
} from "./lib/gmail";

const CARD_EXIT_DURATION = 180;

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

const HINT_COPY = {
  left: { label: "Mark as read", sub: "Swipe left" },
  right: { label: "Archive", sub: "Swipe right" },
  up: { label: "Star", sub: "Swipe up" },
};

const SummarySection = ({ className = "" }) => (
  <div className={`sidebar__summary${className ? ` ${className}` : ""}`}>
    <h2>Inbox Flow</h2>
    <p>
      Swipe through your latest emails. Archive with a flick right, mark read with a flick left,
      star important threads by swiping up.
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
    <p className="sidebar__keyboard-note">Tip: Arrow keys work too.</p>
  </div>
);

const LabelsPanel = ({
  className = "",
  labelOptions,
  selectedLabelId,
  onSelect,
  isLoadingLabels,
  labelsError,
  isLoadingEmails,
}) => (
  <div className={`sidebar__labels${className ? ` ${className}` : ""}`}>
    <div className="sidebar__labels-header">
      <h3>Labels</h3>
      {isLoadingLabels ? <span className="sidebar__labels-status">Loading…</span> : null}
    </div>
    {labelsError ? (
      <div className="sidebar__labels-error">{labelsError}</div>
    ) : labelOptions.length ? (
      <ul className="sidebar__labels-list">
        {labelOptions.map((label) => {
          const isActive = selectedLabelId === label.id || (!selectedLabelId && label.id === null);
          const dotType = label.type ?? (label.id ? "system" : "virtual");
          return (
            <li key={label.id ?? "__unread"}>
              <button
                type="button"
                className={`sidebar__label${isActive ? " sidebar__label--active" : ""}`.trim()}
                onClick={() => onSelect(label.id)}
                disabled={isLoadingEmails && isActive}
              >
                <span
                  className={`sidebar__label-dot sidebar__label-dot--${dotType}`}
                  aria-hidden="true"
                />
                <span>{label.displayName}</span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : (
      !isLoadingLabels && <div className="sidebar__labels-empty">No labels found.</div>
    )}
  </div>
);

const SwipeCard = forwardRef(({ email, onSwipe, disabled }, ref) => {
  const [hint, setHint] = useState(null);
  const cardRef = useRef(null);
  const startPositionRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0, rotation: 0 });
  const rafRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isAnimatingOutRef = useRef(false);
  const onSwipeRef = useRef(onSwipe);
  const disabledRef = useRef(disabled);
  const pointerIdRef = useRef(null);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    disabledRef.current = disabled;
    const card = cardRef.current;
    if (card) {
      card.style.cursor = disabled ? "default" : "grab";
    }
  }, [disabled]);

  useEffect(
    () => () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    []
  );

  const applyTransform = (nextOffset = offsetRef.current) => {
    const card = cardRef.current;
    if (!card) return;
    const { x, y, rotation } = nextOffset;
    card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
  };

  const scheduleTransform = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyTransform();
    });
  };

  const resetCard = ({ animate = true } = {}) => {
    const card = cardRef.current;
    if (!card) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    isDraggingRef.current = false;

    if (!animate) {
      card.style.transition = "none";
    } else {
      card.style.transition = "";
    }

    offsetRef.current = { x: 0, y: 0, rotation: 0 };
    applyTransform({ x: 0, y: 0, rotation: 0 });
    card.style.opacity = "1";
    card.style.willChange = "";

    if (!animate) {
      requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = "";
        }
      });
    }

    setHint(null);
  };

  const animateOut = useCallback(async (direction) => {
    const card = cardRef.current;
    if (!card || isAnimatingOutRef.current) return;

    isAnimatingOutRef.current = true;
    const exit = CARD_EXIT_TRANSLATIONS[direction];
    offsetRef.current = exit;
    setHint((prev) => (prev === direction ? prev : direction));

    card.style.transition = "";
    card.style.willChange = "transform, opacity";
    card.style.transform = `translate3d(${exit.x}px, ${exit.y}px, 0) rotate(${exit.rotation}deg)`;
    card.style.opacity = "0";

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, CARD_EXIT_DURATION));

    try {
      const handler = onSwipeRef.current;
      if (handler) {
        await handler(direction);
      }
    } catch (error) {
      console.error(error);
      isAnimatingOutRef.current = false;
      resetCard({ animate: true });
      return;
    }

    card.style.willChange = "";
    isAnimatingOutRef.current = false;
  }, []);

  useImperativeHandle(ref, () => ({
    triggerSwipe: animateOut,
  }));

  const handlePointerDown = useCallback((event) => {
    if (disabledRef.current || isAnimatingOutRef.current) return;
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = event.pointerId;
    isDraggingRef.current = true;
    startPositionRef.current = { x: event.clientX, y: event.clientY };
    const card = cardRef.current;
    if (card) {
      card.style.transition = "none";
      card.style.willChange = "transform";
      card.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!isDraggingRef.current || disabledRef.current) return;
    if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
    event.preventDefault();

    const deltaX = event.clientX - startPositionRef.current.x;
    const deltaY = event.clientY - startPositionRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 6 && absY < 6) {
      return;
    }

    offsetRef.current = {
      x: deltaX,
      y: deltaY,
      rotation: deltaX * 0.05,
    };
    scheduleTransform();

    let nextHint = null;
    if (absX > absY && absX > 32) {
      nextHint = deltaX > 0 ? "right" : "left";
    } else if (deltaY < -48) {
      nextHint = "up";
    }
    setHint((prev) => (prev === nextHint ? prev : nextHint));
  }, []);

  const handlePointerUp = useCallback(async (event) => {
    if (!isDraggingRef.current || disabledRef.current) return;
    if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
    isDraggingRef.current = false;
    const card = cardRef.current;
    if (card?.hasPointerCapture?.(event.pointerId)) {
      card.releasePointerCapture?.(event.pointerId);
    }

    if (card) {
      card.style.transition = "";
      card.style.willChange = "";
    }

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
      resetCard({ animate: true });
      pointerIdRef.current = null;
      return;
    }

    await animateOut(direction);
    pointerIdRef.current = null;
  }, [animateOut]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    const listenerOptions = { passive: false };

    card.addEventListener("pointerdown", handlePointerDown, listenerOptions);
    card.addEventListener("pointermove", handlePointerMove, listenerOptions);
    card.addEventListener("pointerup", handlePointerUp, listenerOptions);
    card.addEventListener("pointercancel", handlePointerUp, listenerOptions);
    card.addEventListener("pointerleave", handlePointerUp, listenerOptions);

    return () => {
      card.removeEventListener("pointerdown", handlePointerDown, listenerOptions);
      card.removeEventListener("pointermove", handlePointerMove, listenerOptions);
      card.removeEventListener("pointerup", handlePointerUp, listenerOptions);
      card.removeEventListener("pointercancel", handlePointerUp, listenerOptions);
      card.removeEventListener("pointerleave", handlePointerUp, listenerOptions);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    isAnimatingOutRef.current = false;
    resetCard({ animate: false });
  }, [email.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeHint = hint ? HINT_COPY[hint] : null;

  const cardClassName = `mail-card${hint ? ` mail-card--${hint}` : ""}`;
  const formattedBody = useMemo(() => {
    const { html } = formatBodyForDisplay(email.rawBody, email.snippet);
    return html || "<p>No preview available.</p>";
  }, [email.id, email.rawBody, email.snippet]);

  return (
    <article
      ref={cardRef}
      className={cardClassName}
      style={{
        cursor: disabled ? "default" : "grab",
      }}
      role="button"
      aria-label={`Email from ${email.from} with subject ${email.subject}`}
    >
      <div className={`mail-card__hint ${hint ? `mail-card__hint--${hint}` : ""}`}>
        {activeHint ? (
          <>
            <span>{activeHint.label}</span>
            <small>{activeHint.sub}</small>
          </>
        ) : (
          <span className="mail-card__hint-placeholder">Drag to act</span>
        )}
      </div>

      <header className="mail-card__header">
        <div className="mail-card__from">{email.from}</div>
        <time className="mail-card__date">{new Date(email.internalDate).toLocaleString()}</time>
      </header>
      <h3 className="mail-card__subject">{email.subject}</h3>
      <div
        className="mail-card__body"
        dangerouslySetInnerHTML={{ __html: formattedBody }}
      />
    </article>
  );
});

SwipeCard.displayName = "SwipeCard";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [emails, setEmails] = useState([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [error, setError] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [needsGoogleReauth, setNeedsGoogleReauth] = useState(false);
  const [labels, setLabels] = useState([]);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [labelsError, setLabelsError] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const swipeCardRef = useRef(null);

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

  const labelOptions = useMemo(
    () => [{ id: null, displayName: "Unread Inbox", type: "virtual" }, ...labels],
    [labels]
  );

  useEffect(() => {
    if (!providerToken) {
      setLabels([]);
      setSelectedLabelId(null);
      setIsLoadingLabels(false);
      setLabelsError(null);
      return;
    }

    setIsLoadingLabels(true);
    setLabelsError(null);

    fetchLabels(providerToken)
      .then((fetchedLabels) => {
        setLabels(fetchedLabels);
      })
      .catch((err) => {
        console.error(err);
        setLabelsError("We couldn’t load your Gmail labels.");
      })
      .finally(() => {
        setIsLoadingLabels(false);
      });
  }, [providerToken]);

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

  const loadEmails = useCallback(
    async (labelId = null) => {
      if (!providerToken) {
        setNeedsGoogleReauth(true);
        return;
      }

      const effectiveLabelId = labelId ?? null;
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
        const data = effectiveLabelId
          ? await fetchEmailsByLabel(providerToken, effectiveLabelId, 50)
          : await fetchRecentEmails(providerToken, 50);
        setEmails(data);
        setSelectedLabelId((current) =>
          current === effectiveLabelId ? current : effectiveLabelId
        );
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
    [providerToken, profile?.avatarUrl, session]
  );

  useEffect(() => {
    if (!providerToken) return;
    loadEmails();
  }, [providerToken, loadEmails]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmails([]);
    setNeedsGoogleReauth(false);
    setLabels([]);
    setSelectedLabelId(null);
    setLabelsError(null);
  };

  const handleLabelSelect = useCallback(
    (labelId) => {
      loadEmails(labelId ?? null);
    },
    [loadEmails]
  );

  const handleSwipe = async (direction) => {
    if (!providerToken) {
      setNeedsGoogleReauth(true);
      return;
    }
    if (emails.length === 0) return;

    const currentEmail = emails[0];
    if (!currentEmail) return;

    setActiveAction(direction);

    const feedbackKey = `${currentEmail.id}-${direction}`;

    setEmails((prev) => {
      if (!prev.length) return prev;
      if (prev[0]?.id === currentEmail.id) {
        return prev.slice(1);
      }
      return prev.filter((email) => email.id !== currentEmail.id);
    });

    setActionFeedback({
      key: feedbackKey,
      ...ACTION_COPY[direction],
      email: currentEmail,
    });

    setActiveAction(null);

    (async () => {
      try {
        if (direction === "left") {
          await markAsRead(providerToken, currentEmail.id);
        } else if (direction === "right") {
          await archiveEmail(providerToken, currentEmail.id);
        } else if (direction === "up") {
          await starEmail(providerToken, currentEmail.id);
        }
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
          setError("We couldn’t update Gmail. Please refresh and try again.");
        }

        setActionFeedback((prev) => (prev?.key === feedbackKey ? null : prev));
        setEmails((prev) => {
          if (prev.some((email) => email.id === currentEmail.id)) {
            return prev;
          }
          return [currentEmail, ...prev];
        });
      }
    })();
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (activeAction || !emails.length || !swipeCardRef.current) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        swipeCardRef.current.triggerSwipe("left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        swipeCardRef.current.triggerSwipe("right");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        swipeCardRef.current.triggerSwipe("up");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [emails, activeAction]);

  if (!session) {
    return <SignInPage />;
  }

  return (
    <div className="dashboard">
      <aside className="dashboard__sidebar">
        <div className="sidebar__logo">
          <div>
            <strong>SwipeMail</strong>
            <span className="sidebar__tag">Beta</span>
          </div>
        </div>

        <SummarySection />
        <LabelsPanel
          labelOptions={labelOptions}
          selectedLabelId={selectedLabelId}
          onSelect={handleLabelSelect}
          isLoadingLabels={isLoadingLabels}
          labelsError={labelsError}
          isLoadingEmails={isLoadingEmails}
        />

        <div className="sidebar__footer">
          <button
            className="sidebar__reload"
            type="button"
            onClick={() => loadEmails(selectedLabelId ?? null)}
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
        <div className="stage__mobile-info">
          <SummarySection className="stage__mobile-summary" />
          <LabelsPanel
            className="stage__mobile-labels"
            labelOptions={labelOptions}
            selectedLabelId={selectedLabelId}
            onSelect={handleLabelSelect}
            isLoadingLabels={isLoadingLabels}
            labelsError={labelsError}
            isLoadingEmails={isLoadingEmails}
          />
        </div>
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
              <button
                type="button"
                onClick={() => loadEmails(selectedLabelId ?? null)}
                disabled={isLoadingEmails}
              >
                Try again
              </button>
            )}
          </div>
        ) : null}

        <section className="stage__deck">
          <div className="stage__deck-surface">
            {isLoadingEmails && emails.length === 0 ? (
              <div className="mail-card mail-card--placeholder">
                <div className="mail-card__skeleton mail-card__skeleton--from" />
                <div className="mail-card__skeleton mail-card__skeleton--subject" />
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

            {emails[0] ? (
              <SwipeCard ref={swipeCardRef} email={emails[0]} onSwipe={handleSwipe} disabled={!!activeAction} />
            ) : null}
          </div>

          <aside className="stage__deck-queue">
            <span className="stage__queue-label">Up next</span>
            {emails.slice(1, 4).map((email) => (
              <article key={email.id} className="queue-card">
                <div className="queue-card__meta">
                  <span>{new Date(email.internalDate).toLocaleDateString()}</span>
                </div>
                <h4>{email.subject}</h4>
                <p>{email.from}</p>
              </article>
            ))}

            {emails.length <= 1 && !needsGoogleReauth ? (
              <div className="queue-card queue-card--placeholder">Inbox will refill here</div>
            ) : null}
          </aside>
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
