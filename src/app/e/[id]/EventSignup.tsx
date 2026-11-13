"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { EventQuestion } from "../../../../shared/event-registration";
import styles from "./event.module.css";

const TOKEN_KEY = "qram-web-token";

type OwnStatus = "pending" | "approved" | "declined" | "cancelled" | "waitlisted" | null;

type RegistrationResponse = {
  ownStatus: OwnStatus;
  approvedCount: number | null;
  waitlistCount?: number;
  waitlistPosition?: number;
};

type Ready = {
  token: string;
  view: RegistrationResponse;
  needsName: boolean;
  profileError?: string;
};

type Failure = { token: string; message: string };

type Challenge = { id: string; mockCode?: string; otpLength: number };

let memoryToken: string | null | undefined;

function readToken() {
  if (memoryToken !== undefined) return memoryToken;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(value: string | null) {
  memoryToken = value;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Storage can be blocked in private mode. The in-memory token still covers this visit. */
  }
  window.dispatchEvent(new Event("qram-token"));
}

function subscribeToken(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("qram-token", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("qram-token", onChange);
  };
}

function subscribeMounted() {
  return () => {};
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorStatus(error: unknown) {
  return error instanceof ApiError ? error.status : 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Something went wrong.";
}

async function request<T>(path: string, options?: { method?: string; token?: string; body?: unknown }): Promise<T> {
  const headers = new Headers();
  if (options?.body !== undefined) headers.set("Content-Type", "application/json");
  if (options?.token) headers.set("Authorization", `Bearer ${options.token}`);
  let response: Response;
  try {
    response = await fetch(path, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Network error. Try again.", 0);
  }
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new ApiError(data?.error || "Something went wrong.", response.status);
  return (data ?? {}) as T;
}

async function fetchSession(token: string, eventId: string) {
  let view: RegistrationResponse;
  try {
    view = await request<RegistrationResponse>(
      `/api/mobile/registrations?eventId=${encodeURIComponent(eventId)}`,
      { token },
    );
  } catch (error) {
    if (errorStatus(error) === 401) return null;
    throw error;
  }
  try {
    const profile = await request<{ user?: { name?: string } }>("/api/mobile", { token });
    return { view, needsName: profile.user?.name === "New member" };
  } catch (error) {
    if (errorStatus(error) === 401) return null;
    return { view, needsName: false, profileError: errorMessage(error) };
  }
}

function capacityCopy(capacity: number, going: number, waitlist: boolean) {
  const left = capacity - going;
  if (left > 0) return `${left} ${left === 1 ? "spot" : "spots"} left`;
  return waitlist ? "Full · join the waitlist" : "Full";
}

function statusCopy(status: OwnStatus, position?: number) {
  if (status === "approved") return "✓ You're going";
  if (status === "waitlisted")
    return position ? `You're on the waitlist · #${position}` : "You're on the waitlist";
  if (status === "pending") return "Request sent · the host will confirm";
  if (status === "declined") return "The host declined this request";
  return "";
}

export function EventMap({ lat, lng }: { lat: number; lng: number }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    // The static map is optional decoration; hide it when the image endpoint fails.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.map}
      src={`/api/mobile/places?map=${lat},${lng}&scheme=dark`}
      alt="Map"
      onError={() => setVisible(false)}
    />
  );
}

export function EventSignup({
  eventId,
  capacity,
  approvedCount,
  waitlistCount,
  waitlist,
  requireApproval,
  questions,
  external,
  registrationUrl,
}: {
  eventId: string;
  capacity: number;
  approvedCount: number;
  waitlistCount: number;
  waitlist: boolean;
  requireApproval: boolean;
  questions: EventQuestion[];
  external: boolean;
  registrationUrl?: string;
}) {
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const token = useSyncExternalStore(subscribeToken, readToken, () => null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState<"register" | "phone" | "code">("register");
  const [digits, setDigits] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [named, setNamed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const session = ready && token && ready.token === token ? ready : null;
  const loadError = failure && token && failure.token === token ? failure.message : null;

  useEffect(() => {
    if (external || !token) return;
    let ignore = false;
    void fetchSession(token, eventId).then(
      (result) => {
        if (ignore) return;
        if (!result) {
          writeToken(null);
          setStep("register");
          setChallenge(null);
          setFormError(null);
          return;
        }
        setReady({ token, view: result.view, needsName: result.needsName, profileError: result.profileError });
      },
      (error: unknown) => {
        if (ignore) return;
        setFailure({ token, message: errorMessage(error) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [external, token, eventId, retry]);

  const going = typeof session?.view.approvedCount === "number" ? session.view.approvedCount : approvedCount;
  const waiting = typeof session?.view.waitlistCount === "number" ? session.view.waitlistCount : waitlistCount;
  const needsName = !named && (session?.needsName ?? false);
  const status = session?.view.ownStatus ?? null;
  const checking = !mounted || (Boolean(token) && !session && !loadError);
  const organiserUrl = registrationUrl?.trim() ? registrationUrl : undefined;

  function forgetSession() {
    writeToken(null);
    setStep("register");
    setChallenge(null);
    setFormError(null);
  }

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setFormError("Enter a 10-digit mobile number starting with 6, 7, 8, or 9.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const payload = await request<{ challengeId?: string; otpLength?: number; mockCode?: string }>(
        "/api/mobile/auth",
        { method: "POST", body: { action: "request", phone: `+91${digits}` } },
      );
      if (!payload.challengeId) throw new ApiError("Something went wrong.", 500);
      setChallenge({ id: payload.challengeId, mockCode: payload.mockCode, otpLength: payload.otpLength ?? 6 });
      setCode("");
      setStep("code");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !challenge) return;
    if (!new RegExp(`^\\d{${challenge.otpLength}}$`).test(code)) {
      setFormError(`Enter the ${challenge.otpLength}-digit code.`);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const payload = await request<{ token?: string }>("/api/mobile/auth", {
        method: "POST",
        body: { action: "verify", challengeId: challenge.id, code },
      });
      if (!payload.token) throw new ApiError("Something went wrong.", 500);
      writeToken(payload.token);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    const trimmedName = name.trim();
    if (needsName && (trimmedName.length < 2 || trimmedName.length > 60)) {
      setFormError("Use a name of 2 to 60 characters.");
      return;
    }
    const outgoing: Record<string, string> = {};
    for (const question of questions) {
      const value = (answers[question.id] ?? "").trim();
      if (question.required && !value) {
        setFormError(`Answer: ${question.label}`);
        return;
      }
      if (value.length > 200) {
        setFormError(`Keep "${question.label}" under 200 characters.`);
        return;
      }
      if (question.kind === "choice" && value && !question.options?.includes(value)) {
        setFormError(`Choose an option for "${question.label}".`);
        return;
      }
      if (value) outgoing[question.id] = value;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (needsName) {
        await request("/api/mobile/account", { method: "PATCH", token, body: { name: trimmedName } });
        setNamed(true);
      }
      const view = await request<RegistrationResponse>("/api/mobile/registrations", {
        method: "POST",
        token,
        body: { action: "request", eventId, answers: outgoing },
      });
      setReady({ token, view, needsName: false });
    } catch (error) {
      if (errorStatus(error) === 401) forgetSession();
      else setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy || !token || !session) return;
    const prompt = session.view.ownStatus === "waitlisted" ? "Leave the waitlist?" : "Cancel your registration?";
    if (!window.confirm(prompt)) return;
    setBusy(true);
    setFormError(null);
    try {
      const view = await request<RegistrationResponse>("/api/mobile/registrations", {
        method: "POST",
        token,
        body: { action: "cancel", eventId },
      });
      setReady({ token, view, needsName: session.needsName });
    } catch (error) {
      if (errorStatus(error) === 401) forgetSession();
      else setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const errorText = formError || loadError || session?.profileError || null;
  const showTrack =
    status === "approved" || status === "pending" || status === "waitlisted" || status === "declined";

  let body: ReactNode;
  if (external) {
    body = organiserUrl ? (
      <a className={styles.primary} href={organiserUrl} target="_blank" rel="noreferrer">
        Register on organiser site
        <span className={styles.sr}> Opens in a new tab</span>
      </a>
    ) : (
      <p className={styles.hint}>Registration is on the organiser site.</p>
    );
  } else if (checking) {
    body = <p className={styles.hint}>Checking your registration…</p>;
  } else if (token && loadError && !session) {
    body = (
      <button
        type="button"
        className={styles.primary}
        disabled={busy}
        onClick={() => {
          setFailure(null);
          setRetry((value) => value + 1);
        }}
      >
        Try again
      </button>
    );
  } else if (token && session && status && status !== "cancelled") {
    const label =
      status === "waitlisted" ? "Leave waitlist" : status === "pending" ? "Cancel request" : "Cancel registration";
    body = (
      <>
        <p className={status === "declined" ? styles.declined : styles.status} role="status">
          {statusCopy(status, session.view.waitlistPosition)}
        </p>
        {status !== "declined" && (
          <button type="button" className={styles.ghost} disabled={busy} onClick={() => void cancel()}>
            {label}
          </button>
        )}
      </>
    );
  } else if (token && session) {
    body = (
      <form className={styles.form} noValidate onSubmit={(event) => void register(event)}>
        {needsName && (
          <label className={styles.field} htmlFor="qram-event-name">
            <span>
              Your name<span className={styles.req}> Required</span>
            </span>
            <input
              id="qram-event-name"
              className={styles.control}
              autoComplete="name"
              maxLength={60}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        {questions.map((question, index) =>
          question.kind === "choice" ? (
            <fieldset key={question.id} className={styles.question}>
              <legend>
                {question.label}
                {question.required && <span className={styles.req}> Required</span>}
              </legend>
              <div className={styles.pills} role="group" aria-label={question.label}>
                {(question.options ?? []).map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={selected ? styles.pillOn : styles.pill}
                      aria-pressed={selected}
                      disabled={busy}
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <label key={question.id} className={styles.field} htmlFor={`qram-question-${index}`}>
              <span>
                {question.label}
                {question.required && <span className={styles.req}> Required</span>}
              </span>
              <input
                id={`qram-question-${index}`}
                className={styles.control}
                maxLength={200}
                required={question.required}
                value={answers[question.id] ?? ""}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                }
              />
            </label>
          ),
        )}
        {requireApproval && <p className={styles.hint}>The host will confirm your request.</p>}
        <button type="submit" className={styles.primary} disabled={busy}>
          Register
        </button>
      </form>
    );
  } else if (step === "phone") {
    body = (
      <form className={styles.form} noValidate onSubmit={(event) => void requestCode(event)}>
        <label className={styles.field} htmlFor="qram-event-phone">
          <span>Mobile number</span>
          <span className={styles.phone}>
            <span className={styles.prefix} aria-hidden="true">
              +91
            </span>
            <input
              id="qram-event-phone"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              aria-label="10-digit mobile number"
              value={digits}
              onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </span>
        </label>
        <button type="submit" className={styles.primary} disabled={busy}>
          Send code
        </button>
      </form>
    );
  } else if (step === "code" && challenge) {
    body = (
      <form className={styles.form} noValidate onSubmit={(event) => void verifyCode(event)}>
        <label className={styles.field} htmlFor="qram-event-code">
          <span>Verification code</span>
          <input
            id="qram-event-code"
            className={styles.control}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={challenge.otpLength}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, challenge.otpLength))}
          />
        </label>
        {challenge.mockCode && <p className={styles.hint}>Test code: {challenge.mockCode}</p>}
        <button type="submit" className={styles.primary} disabled={busy}>
          Verify
        </button>
        <button
          type="button"
          className={styles.textButton}
          disabled={busy}
          onClick={() => {
            setStep("phone");
            setFormError(null);
          }}
        >
          Change number
        </button>
      </form>
    );
  } else {
    body = (
      <button type="button" className={styles.primary} disabled={busy} onClick={() => setStep("phone")}>
        Register
      </button>
    );
  }

  return (
    <section className={styles.card} aria-label="Registration" aria-busy={busy || (!external && checking)}>
      <p className={styles.going}>
        {going} going
        {waiting > 0 ? <span className={styles.spots}> · {waiting} on the waitlist</span> : null}
      </p>
      <p className={styles.spots}>{capacityCopy(capacity, going, waitlist)}</p>
      {errorText && (
        <p className={styles.error} role="alert">
          {errorText}
        </p>
      )}
      {body}
      {showTrack && !external && (
        <p className={styles.track}>
          <Link href="/">Track this and more in the Qram app</Link>
        </p>
      )}
    </section>
  );
}
