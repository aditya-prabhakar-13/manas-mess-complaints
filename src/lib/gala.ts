/**
 * Gala Dinner date resolution and dynamic meal options provider.
 * All date checks evaluate strictly in Asia/Kolkata (IST).
 */
import { db } from "@/db";
import { galaDates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatISTDate } from "@/lib/date-utils";

export interface MealOption {
  id: string;
  label: string;
  value: "breakfast" | "lunch" | "dinner" | "gala_dinner";
  isGala: boolean;
}

/**
 * Determine whether a given reference date (default: now) is an admin-scheduled
 * Gala Dinner date in Asia/Kolkata.
 */
export async function isGalaDinnerDate(date: Date = new Date()): Promise<boolean> {
  const dateStr = formatISTDate(date);
  const [entry] = await db
    .select({ galaDate: galaDates.galaDate })
    .from(galaDates)
    .where(eq(galaDates.galaDate, dateStr))
    .limit(1);

  return !!entry;
}

/**
 * Pure helper: Returns available meal choices based on whether Gala Dinner is scheduled.
 * When Gala Dinner is active, it completely replaces regular Dinner.
 */
export function getAvailableMeals(isGalaDay: boolean): MealOption[] {
  const baseMeals: MealOption[] = [
    {
      id: "meal-breakfast",
      label: "Breakfast",
      value: "breakfast",
      isGala: false,
    },
    {
      id: "meal-lunch",
      label: "Lunch",
      value: "lunch",
      isGala: false,
    },
  ];

  if (isGalaDay) {
    return [
      ...baseMeals,
      {
        id: "meal-gala-dinner",
        label: "Gala Dinner",
        value: "gala_dinner",
        isGala: true,
      },
    ];
  }

  return [
    ...baseMeals,
    {
      id: "meal-dinner",
      label: "Dinner",
      value: "dinner",
      isGala: false,
    },
  ];
}
