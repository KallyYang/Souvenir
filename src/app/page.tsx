import CalendarApp from "@/components/CalendarApp";
import { isPasswordAuthEnabled } from "@/lib/auth";

export default async function HomePage() {
  const showLogout = await isPasswordAuthEnabled();
  return <CalendarApp showLogout={showLogout} />;
}
