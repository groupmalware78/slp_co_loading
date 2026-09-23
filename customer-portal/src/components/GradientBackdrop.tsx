// A subtle, site-wide wash of the admin-configured gradient (see the
// "Site background gradient" fields in PortalSettingsForm) — fixed behind
// every page's content so it doesn't scroll away and never intercepts
// clicks. Deliberately low-opacity: the same gradient is used at full
// strength as the homepage hero backdrop (see src/app/page.tsx), which is
// safe there because that section always pairs it with white text: pages
// using this component (login, signup, the whole authenticated portal
// shell) keep their normal dark text on light-card layouts, so a
// full-strength dark gradient behind them would wreck contrast — a faint
// wash reads as branding without risking readability regardless of which
// colors an admin picks.
export function GradientBackdrop({
  gradientFrom,
  gradientVia,
  gradientTo,
}: {
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-20"
      style={{
        background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
      }}
    />
  );
}
