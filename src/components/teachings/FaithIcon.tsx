/** Small line icons for the Our Faith cards (D-049, the reference layout's icon cards). Decorative. */
const PATHS: Record<string, React.ReactNode> = {
  // book
  scriptures: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h7" />,
  // star
  mysteries: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  // drop
  sacraments: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  // crescent
  fasting: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  // cross
  prayers: <path d="M12 3v18M7 8h10" />,
  // question
  faq: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" />
    </>
  ),
  // gift
  offerings: <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3-2-5 1z" />,
  // microphone
  sermons: <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4" />,
};

export function FaithIcon({ name }: { name: string }) {
  return (
    <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream text-primary">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {PATHS[name] ?? PATHS.prayers}
      </svg>
    </span>
  );
}
