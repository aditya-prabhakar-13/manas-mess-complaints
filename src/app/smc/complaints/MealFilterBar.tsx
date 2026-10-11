import Link from "next/link";

interface MealFilterBarProps {
  currentMeal: string;
  basePath?: string;
  extraParams?: Record<string, string>;
}

const MEALS = [
  { value: "all", label: "ALL MEALS" },
  { value: "breakfast", label: "BREAKFAST" },
  { value: "lunch", label: "LUNCH" },
  { value: "dinner", label: "DINNER" },
  { value: "gala_dinner", label: "GALA DINNER" },
];

export function MealFilterBar({
  currentMeal,
  basePath = "/smc/complaints",
  extraParams = {},
}: MealFilterBarProps) {
  const activeMeal = currentMeal.toLowerCase() || "all";

  function buildUrl(mealValue: string) {
    const params = new URLSearchParams();
    // Preserve extra parameters (e.g. month for archive)
    for (const [key, val] of Object.entries(extraParams)) {
      if (val) params.set(key, val);
    }
    if (mealValue !== "all") {
      params.set("meal", mealValue);
    }
    params.set("page", "1");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        marginBottom: "16px",
      }}
    >
      {MEALS.map((m) => {
        const isActive = activeMeal === m.value;
        return (
          <Link
            key={m.value}
            href={buildUrl(m.value)}
            className="btn btn-outline"
            style={{
              padding: "6px 12px",
              minHeight: "36px",
              fontSize: "0.85rem",
              width: "auto",
              textDecoration: "none",
              backgroundColor: isActive ? "var(--fg)" : "var(--bg)",
              color: isActive ? "var(--bg)" : "var(--fg)",
            }}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
