import { redirect } from "next/navigation";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";

export default async function Login() {
  if (!process.env.WORKOS_CLIENT_ID) redirect("/coach");
  const url = await getSignInUrl();
  redirect(url);
}
