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

const ViewToggle = ({ activeView, onChange, className = "" }) => {
  const options = [
    { id: "swipe", label: "Swipe" },
    { id: "inbox", label: "Inbox" },
  ];

  return (
    <div className={`view-toggle${className ? ` ${className}` : ""}`}>
      {options.map((option) => {
        const isActive = activeView === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`view-toggle__button${isActive ? " view-toggle__button--active" : ""}`}
            onClick={() => onChange(option.id)}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

const InboxView = ({
  emails,
  isLoadingEmails,
  needsGoogleReauth,
  onReconnect,
  error,
  onRetry,
  selectedEmailId,
  onSelectEmail,
  onLoadMore,
  canLoadMore,
  isLoadingMore,
  selectedLabelId,
}) => {
  const listRef = useRef(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = 0;
  }, [selectedLabelId]);
  const selectedEmail = selectedEmailId
    ? emails.find((email) => email.id === selectedEmailId) ?? null
    : emails[0] ?? null;

  const formattedBody = useMemo(() => {
    if (!selectedEmail) return null;
    const { html } = formatBodyForDisplay(selectedEmail.rawBody, selectedEmail.snippet);
    return html || "<p>No content available.</p>";
  }, [selectedEmail?.id, selectedEmail?.rawBody, selectedEmail?.snippet]);

  useEffect(() => {
    if (!onLoadMore) return undefined;
    const listElement = listRef.current;
    if (!listElement) return undefined;

    const handleScroll = () => {
      if (!canLoadMore || isLoadingMore) return;
      const { scrollTop, scrollHeight, clientHeight } = listElement;
      if (scrollHeight - scrollTop - clientHeight < 120) {
        onLoadMore();
      }
    };

    listElement.addEventListener("scroll", handleScroll);
    return () => listElement.removeEventListener("scroll", handleScroll);
  }, [onLoadMore, canLoadMore, isLoadingMore]);

  return (
    <section className="inbox-view">
      <aside className="inbox-view__list">
        <div className="inbox-view__list-header">
          <span>Inbox</span>
          <span className="inbox-view__list-count">
            {isLoadingEmails ? "Refreshing…" : `${emails.length} messages`}
          </span>
        </div>
        <ul className="inbox-view__items" ref={listRef}>
          {isLoadingEmails && emails.length === 0 ? (
            <li className="inbox-view__item inbox-view__item--placeholder">Loading messages…</li>
          ) : null}

          {!isLoadingEmails && emails.length === 0 ? (
            <li className="inbox-view__item inbox-view__item--placeholder">
              Nothing in your inbox right now.
            </li>
          ) : null}

          {emails.map((email) => {
            const isActive = (selectedEmail?.id ?? null) === email.id;
            return (
              <li key={email.id}>
                <button
                  type="button"
                  className={`inbox-view__item${isActive ? " inbox-view__item--active" : ""}`}
                  onClick={() => onSelectEmail(email.id)}
                >
                  <header>
                    <strong className="inbox-view__item-from">{email.from}</strong>
                    <time className="inbox-view__item-time">
                      {new Date(email.internalDate).toLocaleString()}
                    </time>
                  </header>
                  <div className="inbox-view__item-subject">{email.subject || "No subject"}</div>
                  {email.snippet ? (
                    <p className="inbox-view__item-snippet">{email.snippet}</p>
                  ) : null}
                </button>
              </li>
            );
          })}

          {isLoadingMore ? (
            <li key="loading-more" className="inbox-view__item inbox-view__item--placeholder">
              Loading more…
            </li>
          ) : null}
          {!isLoadingMore && !canLoadMore && emails.length > 0 ? (
            <li key="inbox-end" className="inbox-view__item inbox-view__item--placeholder">
              No more messages.
            </li>
          ) : null}
        </ul>
      </aside>

      <div className="inbox-view__detail">
        {needsGoogleReauth ? (
          <div className="inbox-view__reauth">
            <h2>Connect Gmail to keep reading</h2>
            <p>
              We need permission to read and update your inbox. Google may ask you to confirm the
              Gmail scopes because the app is still in testing.
            </p>
            <button type="button" onClick={onReconnect} className="empty-state__cta">
              Grant Gmail access
            </button>
          </div>
        ) : error ? (
          <div className="inbox-view__error">
            <p>{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={isLoadingEmails}
                className="inbox-view__retry"
              >
                {isLoadingEmails ? "Refreshing…" : "Try again"}
              </button>
            ) : null}
          </div>
        ) : selectedEmail ? (
          <>
            <header className="inbox-view__detail-header">
              <div>
                <span className="inbox-view__detail-label">Inbox</span>
                <h2>{selectedEmail.subject || "No subject"}</h2>
              </div>
              <time>{new Date(selectedEmail.internalDate).toLocaleString()}</time>
            </header>
            <div className="inbox-view__detail-meta">
              <div className="inbox-view__avatar">
                {selectedEmail.from?.charAt(0)?.toUpperCase() ?? "@"}
              </div>
              <div>
                <strong>{selectedEmail.from}</strong>
                {selectedEmail.to ? <span>To: {selectedEmail.to}</span> : null}
              </div>
            </div>
            <div className="inbox-view__body" dangerouslySetInnerHTML={{ __html: formattedBody }} />
          </>
        ) : (
          <div className="inbox-view__empty">
            {isLoadingEmails ? "Loading…" : "Select a message to read."}
          </div>
        )}
      </div>
    </section>
  );
};

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

    // Check what was clicked
    const target = event.target;
    const isLink = target.tagName === 'A' || target.closest('a');
    const isInBody = target.closest('.mail-card__body');

    // Don't interfere with links at all
    if (isLink) {
      return;
    }

    // Don't allow dragging from the body area at all (for text selection)
    if (isInBody) {
      return;
    }

    // Only start dragging if clicking on draggable areas
    event.preventDefault();
    event.stopPropagation();

    pointerIdRef.current = event.pointerId;
    isDraggingRef.current = true;
    startPositionRef.current = { x: event.clientX, y: event.clientY };
    const card = cardRef.current;
    if (card) {
      card.style.transition = "none";
      card.style.willChange = "transform";
      card.setPointerCapture?.(event.pointerId);
      card.style.cursor = "grabbing";
    }
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
      card.style.cursor = "";
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

    card.addEventListener("pointerdown", handlePointerDown);
    card.addEventListener("pointermove", handlePointerMove);
    card.addEventListener("pointerup", handlePointerUp);
    card.addEventListener("pointercancel", handlePointerUp);
    card.addEventListener("pointerleave", handlePointerUp);

    return () => {
      card.removeEventListener("pointerdown", handlePointerDown);
      card.removeEventListener("pointermove", handlePointerMove);
      card.removeEventListener("pointerup", handlePointerUp);
      card.removeEventListener("pointercancel", handlePointerUp);
      card.removeEventListener("pointerleave", handlePointerUp);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("swipe");
  const [selectedInboxEmailId, setSelectedInboxEmailId] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoadingMoreEmails, setIsLoadingMoreEmails] = useState(false);
  const [isHeaderLabelsOpen, setIsHeaderLabelsOpen] = useState(false);
  const [isUpNextOpen, setIsUpNextOpen] = useState(false);
  const swipeCardRef = useRef(null);
  const headerLabelsRef = useRef(null);

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
    async (labelId = null, { append = false, pageToken = null } = {}) => {
      if (!providerToken) {
        setNeedsGoogleReauth(true);
        return;
      }

      const effectiveLabelId = labelId ?? null;
      if (append && !pageToken) {
        return;
      }

      if (append) {
        setError(null);
        setIsLoadingMoreEmails(true);
      } else {
        setIsLoadingEmails(true);
        setError(null);
        setNeedsGoogleReauth(false);
        setNextPageToken(null);

        if (!profile?.avatarUrl && session?.user?.identities?.length) {
          const googleIdentity = session.user.identities.find(
            (identity) => identity.provider === "google"
          );
          if (googleIdentity?.identity_data?.avatar_url) {
            setProfile({ avatarUrl: googleIdentity.identity_data.avatar_url });
          }
        }
      }

      try {
        const maxResults = append ? 20 : 50;
        const response = effectiveLabelId
          ? await fetchEmailsByLabel(providerToken, effectiveLabelId, maxResults, pageToken)
          : await fetchRecentEmails(providerToken, maxResults, pageToken);

        const fetchedEmails = response?.emails ?? [];
        const fetchedNextPageToken = response?.nextPageToken ?? null;
        setNextPageToken(fetchedNextPageToken);

        if (append) {
          setEmails((currentEmails) => {
            const existingIds = new Set(currentEmails.map((email) => email.id));
            const merged = [...currentEmails];
            fetchedEmails.forEach((email) => {
              if (!existingIds.has(email.id)) {
                merged.push(email);
              }
            });
            return merged;
          });
        } else {
          setEmails(fetchedEmails);
          setSelectedLabelId((current) =>
            current === effectiveLabelId ? current : effectiveLabelId
          );
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
          setError(
            "We couldn’t load your inbox. Make sure you granted Gmail access and try refreshing."
          );
        }
      } finally {
        if (append) {
          setIsLoadingMoreEmails(false);
        } else {
          setIsLoadingEmails(false);
        }
      }
    },
    [providerToken, profile?.avatarUrl, session]
  );

  useEffect(() => {
    if (!providerToken) return;
    loadEmails();
  }, [providerToken, loadEmails]);

  useEffect(() => {
    if (!emails.length) {
      setSelectedInboxEmailId(null);
      return;
    }
    setSelectedInboxEmailId((current) => {
      if (current && emails.some((email) => email.id === current)) {
        return current;
      }
      return emails[0]?.id ?? null;
    });
  }, [emails]);

  useEffect(() => {
    if (!isHeaderLabelsOpen) return;
    const handleClickOutside = (event) => {
      if (headerLabelsRef.current && !headerLabelsRef.current.contains(event.target)) {
        setIsHeaderLabelsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isHeaderLabelsOpen]);


  useEffect(() => {
    setIsHeaderLabelsOpen(false);
  }, [selectedLabelId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsSidebarOpen(false);
    setActiveView("swipe");
    setEmails([]);
    setNeedsGoogleReauth(false);
    setLabels([]);
    setSelectedLabelId(null);
    setLabelsError(null);
    setSelectedInboxEmailId(null);
    setNextPageToken(null);
    setIsLoadingMoreEmails(false);
  };

  const handleLabelSelect = useCallback(
    (labelId) => {
      loadEmails(labelId ?? null);
    },
    [loadEmails]
  );

  const handleLoadMoreInbox = useCallback(() => {
    if (!nextPageToken || isLoadingMoreEmails) return;
    loadEmails(selectedLabelId ?? null, { append: true, pageToken: nextPageToken });
  }, [nextPageToken, isLoadingMoreEmails, selectedLabelId, loadEmails]);

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
      if (activeView !== "swipe" || activeAction || !emails.length || !swipeCardRef.current) {
        return;
      }
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
  }, [emails, activeAction, activeView]);

  if (!session) {
    return <SignInPage />;
  }

  return (
    <>
      <div className="mobile-notice">
        <div className="mobile-notice__panel">
          <div className="mobile-notice__logo">
            <strong>SwipeMail</strong>
            <span className="mobile-notice__chip">Beta</span>
          </div>
          <h1>Desktop Experience Only</h1>
          <p>
            SwipeMail is designed for large screens so you can triage Gmail with full keyboard and
            pointer controls. Please open this app on your laptop or desktop browser to keep
            swiping.
          </p>
          <button
            className="mobile-notice__cta"
            type="button"
            onClick={() => {
              window.location.href = "mailto:?subject=SwipeMail%20link&body=" + encodeURIComponent(window.location.href);
            }}
          >
            Email this link to yourself
          </button>
        </div>
      </div>
      <div className={`dashboard${isSidebarOpen ? " dashboard--with-sidebar" : ""}`}>
        {isSidebarOpen ? (
          <aside className="dashboard__sidebar" id="dashboard-sidebar">
            <div className="sidebar__header">
              <button
                type="button"
                className="rail__menu-button sidebar__menu-button"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Hide sidebar"
                aria-expanded="true"
                aria-controls="dashboard-sidebar"
              >
                <span />
                <span />
                <span />
              </button>
            </div>
            <div className="sidebar__brand">
              <strong>SwipeMail</strong>
              <span className="sidebar__tag">Beta</span>
            </div>

            <SummarySection />
            <ViewToggle
              className="sidebar__view-toggle"
              activeView={activeView}
              onChange={(nextView) => {
                setActiveView(nextView);
                setIsSidebarOpen(false);
              }}
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
        ) : null}

        <main className="dashboard__stage">
          <div className="stage__mobile-info">
            <SummarySection className="stage__mobile-summary" />
            <ViewToggle
              className="stage__view-toggle"
              activeView={activeView}
              onChange={(nextView) => {
                setActiveView(nextView);
                setIsSidebarOpen(false);
              }}
            />
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
            <div className="stage__header-left">
              {!isSidebarOpen ? (
                <button
                  type="button"
                  className="rail__menu-button stage__menu-button"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Show sidebar"
                  aria-controls="dashboard-sidebar"
                  aria-expanded="false"
                >
                  <span />
                  <span />
                  <span />
                </button>
              ) : null}
              <div className="stage__header-titles">
                <h1>{activeView === "swipe" ? "Latest mail" : "Inbox"}</h1>
                <p>
                  {isLoadingEmails
                    ? "Fetching your inbox…"
                    : emails.length === 0
                    ? "No emails to show."
                    : activeView === "swipe"
                    ? emails.length === 1
                      ? "1 conversation to triage."
                      : `${emails.length} conversations to triage.`
                    : emails.length === 1
                    ? "1 conversation available."
                  : `${emails.length} conversations available.`}
                </p>
              </div>
              <div className="stage__header-controls" ref={headerLabelsRef}>
                <button
                  type="button"
                  className="stage__labels-trigger"
                  onClick={() => setIsHeaderLabelsOpen((open) => !open)}
                  aria-haspopup="true"
                  aria-expanded={isHeaderLabelsOpen}
                  disabled={isLoadingLabels}
                >
                  <span
                    className={`sidebar__label-dot sidebar__label-dot--${
                      labelOptions.find((label) => label.id === selectedLabelId)?.type ??
                      (selectedLabelId ? "system" : "virtual")
                    }`}
                    aria-hidden="true"
                  />
                  <span className="stage__labels-trigger-text">
                    {labelOptions.find((label) => label.id === selectedLabelId)?.displayName ??
                      "Unread Inbox"}
                  </span>
                  <span className="stage__labels-trigger-caret" aria-hidden="true">
                    {isHeaderLabelsOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isHeaderLabelsOpen ? (
                  <div className="stage__labels-menu">
                    {labelsError ? (
                      <div className="stage__labels-menu-error">{labelsError}</div>
                    ) : null}
                    {isLoadingLabels ? (
                      <div className="stage__labels-menu-loading">Loading labels…</div>
                    ) : (
                      <ul className="stage__labels-menu-list">
                        {labelOptions.map((label) => {
                          const isActive =
                            selectedLabelId === label.id ||
                            (!selectedLabelId && label.id === null);
                          const dotType =
                            label.type ?? (label.id ? "system" : "virtual");
                          return (
                            <li key={label.id ?? "__unread"} className="stage__labels-menu-item">
                              <button
                                type="button"
                                className={`stage__labels-menu-button${
                                  isActive ? " stage__labels-menu-button--active" : ""
                                }`}
                                onClick={() => {
                                  handleLabelSelect(label.id);
                                  setIsHeaderLabelsOpen(false);
                                }}
                                disabled={isLoadingEmails}
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
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="stage__labels-refresh"
                  onClick={() => loadEmails(selectedLabelId ?? null)}
                  disabled={isLoadingEmails}
                  aria-label="Refresh inbox"
                >
                  <img src="/reload.png" alt="" />
                </button>
              </div>
            </div>
            {activeView === "swipe" && emails.length > 1 && !needsGoogleReauth ? (
              <button
                type="button"
                className={`stage__upnext-toggle${isUpNextOpen ? " stage__upnext-toggle--active" : ""}`}
                onClick={() => setIsUpNextOpen(!isUpNextOpen)}
                aria-label="Toggle up next preview"
                aria-expanded={isUpNextOpen}
              >
                <span>Show next items</span>
              </button>
            ) : (
              <div className="stage__refresh-placeholder" />
            )}
          </header>

          {activeView === "swipe" && error ? (
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

          {activeView === "swipe" ? (
            <>
              <section className={`stage__deck${isUpNextOpen ? " stage__deck--with-queue" : ""}`}>
                <div className="stage__deck-main">
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
                          We need permission to read and update your inbox. Google may ask you to confirm
                          the Gmail scopes because the app is still in testing.
                        </p>
                        <button type="button" onClick={reconnectGmail} className="empty-state__cta">
                          Grant Gmail access
                        </button>
                      </div>
                    )}

                    {emails[0] ? (
                      <SwipeCard
                        ref={swipeCardRef}
                        email={emails[0]}
                        onSwipe={handleSwipe}
                        disabled={!!activeAction}
                      />
                    ) : null}
                  </div>
                </div>

                <aside
                  className={`stage__deck-queue${isUpNextOpen ? " stage__deck-queue--visible" : ""}`}
                >
                  <div className="stage__deck-queue-header">
                    <span className="stage__queue-label">Up next</span>
                    <button
                      type="button"
                      className="stage__deck-queue-close"
                      onClick={() => setIsUpNextOpen(false)}
                      aria-label="Close up next panel"
                    >
                      ×
                    </button>
                  </div>
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
            </>
          ) : (
            <InboxView
              emails={emails}
              isLoadingEmails={isLoadingEmails}
              needsGoogleReauth={needsGoogleReauth}
              onReconnect={reconnectGmail}
              error={error}
              onRetry={() => loadEmails(selectedLabelId ?? null)}
              selectedEmailId={selectedInboxEmailId}
              onSelectEmail={setSelectedInboxEmailId}
              onLoadMore={handleLoadMoreInbox}
              canLoadMore={!!nextPageToken}
              isLoadingMore={isLoadingMoreEmails}
              selectedLabelId={selectedLabelId}
            />
          )}
        </main>
      </div>
    </>
  );
}

export default App;
