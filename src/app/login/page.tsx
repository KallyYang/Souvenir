import LoginForm from "./LoginForm";

export const metadata = {
  title: "登录 · 回忆日历",
};

export default async function LoginPage(props: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await props.searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">回忆日历</h1>
          <p className="mt-2 text-sm text-neutral-500">
            请输入访问密码以继续
          </p>
        </div>
        <LoginForm redirectTo={from || "/"} />
      </div>
    </main>
  );
}
