import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"user" | "organizer" | "institution" | "organization">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: fullName, phone, role } },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created");
      navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen bg-surface-wash font-body text-navy-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-bold text-navy-dark">TeamUp</h1>
          <p className="text-sm text-navy-light mt-1">Student collaboration, made professional.</p>
        </div>
        <div className="bg-paper rounded-2xl border border-navy-dark/5 p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-1 bg-navy-dark/5 p-1 rounded-lg mb-4">
            <ModeBtn active={mode === "login"} onClick={() => setMode("login")}>Log in</ModeBtn>
            <ModeBtn active={mode === "signup"} onClick={() => setMode("signup")}>Sign up</ModeBtn>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (<>
              <AField label="Full name"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="ainput" /></AField>
              <AField label="Phone"><input required value={phone} onChange={(e) => setPhone(e.target.value)} className="ainput" /></AField>
              <AField label="Account type">
                <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="ainput">
                  <option value="user">User</option><option value="organizer">Organizer</option><option value="institution">Institution</option><option value="organization">Organization</option>
                </select>
              </AField>
            </>)}
            <AField label="Email"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ainput" /></AField>
            <AField label="Password"><input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="ainput" /></AField>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-navy-dark text-white font-bold font-display text-sm disabled:opacity-50 mt-2">
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
        <style>{`.ainput{width:100%;background:#fcfcfd;border:1px solid rgba(15,27,61,0.12);border-radius:0.625rem;padding:0.65rem 0.9rem;font-size:0.875rem;color:#0f1b3d;outline:none}.ainput:focus{border-color:#3b6fa0;box-shadow:0 0 0 3px rgba(59,111,160,0.15)}`}</style>
      </div>
    </div>
  );
}
function AField({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="text-[11px] font-mono uppercase tracking-widest text-navy-light block mb-1">{label}</span>{children}</label>);
}
function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (<button type="button" onClick={onClick} className={cn("py-2 rounded-md text-xs font-bold font-display transition-colors", active ? "bg-paper text-navy-dark shadow-sm" : "text-navy-mid")}>{children}</button>);
}
