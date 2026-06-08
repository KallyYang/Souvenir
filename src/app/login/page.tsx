import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { isPasswordAuthEnabled } from "@/lib/auth";

export const metadata = {
  title: "登录 · Souvenir",
};

export default async function LoginPage(props: {
  searchParams: Promise<{ from?: string }>;
}) {
  // 未配置 APP_PASSWORD 时，应用内密码鉴权模块未启用，登录页无意义。
  if (!(await isPasswordAuthEnabled())) {
    redirect("/");
  }

  const { from } = await props.searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Souvenir</h1>
          <p className="mt-2 text-sm text-neutral-500">
            请输入访问密码以继续
          </p>
        </div>
        <LoginForm redirectTo={from || "/"} />
      </div>
    </main>
  );
}
