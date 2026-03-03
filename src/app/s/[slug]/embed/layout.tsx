export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout — no nav, no footer, transparent background.
  // Font is inherited from the parent s/[slug]/layout.tsx.
  return (
    <div style={{ backgroundColor: "transparent" }}>
      {children}
    </div>
  );
}
