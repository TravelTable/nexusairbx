import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Eye, EyeOff, Github, Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import { createUserWithEmailAndPassword, GithubAuthProvider, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { getFriendlyAuthErrorMessage, signInWithOAuthProvider } from "../lib/firebaseAuth";
import { PLAN } from "../lib/prices";
import NexusRBXFooter from "../components/NexusRBXFooter";

const PLANS = [
  { id: PLAN.FREE, name: "Free", price: "$0", description: "Nexus Free Auto and daily usage" },
  { id: PLAN.PRO, name: "Pro", price: "$19.99/month", description: "Included Usage and full model selection" },
  { id: PLAN.PRO_PLUS, name: "Pro+", price: "$39.99/month", description: "Higher usage, larger context and priority processing" },
  { id: PLAN.TEAM, name: "Team", price: "$29/user/month", description: "Per-user billing and pooled team usage" },
];

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.7 4.7 0 0 1-2 3.1v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.7-1.7-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-4V7.4H3.1A10 10 0 0 0 2 12c0 1.7.4 3.2 1.1 4.6L6.5 14Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.5 10A6 6 0 0 1 12 5.9Z"/></svg>;
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState(PLAN.FREE);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const destination = selectedPlan === PLAN.FREE ? (location.state?.from?.pathname || "/ai") : "/subscribe";

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function validationError() {
    if (!form.name.trim() || !form.email.trim() || !form.password) return "Complete all required fields.";
    if (form.password.length < 8) return "Use a password with at least eight characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (!agreed) return "Accept the Terms of Service and Privacy Policy to continue.";
    return "";
  }

  async function submit(event) {
    event.preventDefault();
    const error = validationError();
    if (error) return setStatus({ loading: false, error });
    setStatus({ loading: true, error: "" });
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(credential.user, { displayName: form.name.trim() });
      navigate(destination, { replace: true, state: selectedPlan === PLAN.FREE ? undefined : { selectedPlan } });
    } catch (authError) {
      setStatus({ loading: false, error: getFriendlyAuthErrorMessage(authError) });
    }
  }

  async function oauth(provider, method) {
    setStatus({ loading: true, error: "" });
    try {
      const credential = await signInWithOAuthProvider(auth, provider, { returnPath: destination, method });
      if (credential) navigate(destination, { replace: true, state: selectedPlan === PLAN.FREE ? undefined : { selectedPlan } });
    } catch (authError) {
      setStatus({ loading: false, error: getFriendlyAuthErrorMessage(authError) });
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_1.15fr]">
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#9b5de5]/15 to-[#00f5d4]/10 p-8">
            <Sparkles className="h-9 w-9 text-[#00f5d4]" />
            <h1 className="mt-6 text-4xl font-black">Create your NexusRBX account</h1>
            <p className="mt-4 leading-7 text-gray-400">Start with Nexus Free Auto or choose a paid plan. Paid subscriptions are completed securely through Stripe after account creation.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {PLANS.map((plan) => {
                const selected = selectedPlan === plan.id;
                return (
                  <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-[#00f5d4] bg-[#00f5d4]/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
                    <div className="flex items-center justify-between"><span className="font-black">{plan.name}</span>{selected && <Check className="h-4 w-4 text-[#00f5d4]" />}</div>
                    <div className="mt-1 text-xl font-black">{plan.price}</div>
                    <p className="mt-2 text-xs leading-5 text-gray-500">{plan.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[.03] p-8">
            <div className="grid grid-cols-2 gap-3">
              <button disabled={status.loading} onClick={() => oauth(GoogleAuthProvider, "google")} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold hover:bg-white/10"><GoogleIcon />Google</button>
              <button disabled={status.loading} onClick={() => oauth(GithubAuthProvider, "github")} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold hover:bg-white/10"><Github className="h-5 w-5" />GitHub</button>
            </div>
            <div className="my-6 flex items-center gap-4 text-xs text-gray-600"><span className="h-px flex-1 bg-white/10" />OR<span className="h-px flex-1 bg-white/10" /></div>
            {status.error && <div className="mb-5 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle className="h-5 w-5 shrink-0" />{status.error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Name</span><div className="relative"><User className="absolute left-3 top-3.5 h-5 w-5 text-gray-600" /><input name="name" value={form.name} onChange={update} className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 outline-none focus:border-[#9b5de5]" autoComplete="name" /></div></label>
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Email</span><div className="relative"><Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-600" /><input name="email" type="email" value={form.email} onChange={update} className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 outline-none focus:border-[#9b5de5]" autoComplete="email" /></div></label>
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Password</span><div className="relative"><Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-600" /><input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-11 pr-11 outline-none focus:border-[#9b5de5]" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3.5 text-gray-500">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Confirm password</span><input name="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={update} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#9b5de5]" autoComplete="new-password" /></label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-400"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1" /><span>I agree to the <a href="/terms" className="text-white underline">Terms</a> and <a href="/privacy" className="text-white underline">Privacy Policy</a>.</span></label>
              <button disabled={status.loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] px-4 py-4 font-black disabled:opacity-60">{status.loading && <Loader2 className="h-5 w-5 animate-spin" />}Create account</button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-500">Already registered? <button onClick={() => navigate("/signin", { state: location.state })} className="font-bold text-[#00f5d4]">Sign in</button></p>
          </section>
        </div>
      </main>
      <NexusRBXFooter navigate={navigate} />
    </div>
  );
}
