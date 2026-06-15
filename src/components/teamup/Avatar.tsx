import { cn } from "@/lib/utils";

const PALETTE = [
  ["#0f1b3d", "#3b6fa0"],
  ["#1e3a5f", "#5b8fc4"],
  ["#0d7a5f", "#7bd1b2"],
  ["#7a4b0d", "#d1a25b"],
  ["#6b1e3a", "#c46580"],
  ["#4b1e7a", "#a07bd1"],
];

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

export function Avatar({
  name,
  photoUrl,
  size = 40,
  className,
  rounded = "lg",
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
  rounded?: "lg" | "full";
}) {
  const initials =
    (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  const [c1, c2] = PALETTE[hashIndex(name || "x", PALETTE.length)];
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className={cn(
          "object-cover ring-1 ring-navy-dark/5 shrink-0",
          rounded === "full" ? "rounded-full" : "rounded-lg",
          className,
        )}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        fontSize: Math.max(10, Math.floor(size * 0.36)),
      }}
      className={cn(
        "grid place-items-center font-display font-bold text-white shrink-0 ring-1 ring-navy-dark/5",
        rounded === "full" ? "rounded-full" : "rounded-lg",
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function roleLabel(role: string) {
  const m: Record<string, string> = {
    user: "Student",
    organizer: "Organizer",
    institution: "Institution",
    organization: "Organization",
  };
  return m[role] ?? "Student";
}

export function SkillChips({ skills }: { skills: string[] }) {
  if (!skills?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <span
          key={s}
          className="px-2.5 py-1 rounded-md bg-navy-dark/5 text-[11px] font-medium text-navy-mid"
        >
          {s}
        </span>
      ))}
    </div>
  );
}
