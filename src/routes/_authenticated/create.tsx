import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/create")({ component: CreatePage });

function CreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<"project" | "hackathon">("project");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSubmitting(true);
    const skillsArr = skills.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id, type, title: title.trim(), description: description.trim(), skills: skillsArr,
      venue: type === "hackathon" ? venue.trim() || null : null,
      event_date: type === "hackathon" && eventDate ? eventDate : null,
      registration_link: type === "hackathon" ? link.trim() || null : null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Post published");
    navigate({ to: "/" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-paper rounded-xl border border-navy-dark/5 p-4">
        <p className="text-[11px] font-mono uppercase tracking-widest text-navy-light mb-3">Post type</p>
        <div className="grid grid-cols-2 gap-2">
          {(["project", "hackathon"] as const).map((t) => (
            <button type="button" key={t} onClick={() => setType(t)} className={cn("py-3 rounded-lg text-sm font-bold font-display capitalize transition-colors", type === t ? "bg-navy-dark text-white" : "bg-navy-dark/5 text-navy-dark hover:bg-navy-dark/10")}>{t}</button>
          ))}
        </div>
      </div>
      <Field label="Title"><input required value={title} onChange={(e) => setTitle(e.target.value)} className="cinput" placeholder="What are you building?" /></Field>
      <Field label="Description"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="cinput resize-none" placeholder="Describe the goal, scope, and what kind of teammate you need." /></Field>
      <Field label="Skills (comma-separated)"><input value={skills} onChange={(e) => setSkills(e.target.value)} className="cinput" placeholder="React, Rust, Figma…" /></Field>
      {type === "hackathon" && (<>
        <Field label="Venue"><input value={venue} onChange={(e) => setVenue(e.target.value)} className="cinput" /></Field>
        <Field label="Event date"><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="cinput" /></Field>
        <Field label="Registration link"><input type="url" value={link} onChange={(e) => setLink(e.target.value)} className="cinput" placeholder="https://…" /></Field>
      </>)}
      <button type="submit" disabled={submitting} className="w-full py-3 rounded-lg bg-navy-dark text-white font-bold font-display text-sm disabled:opacity-50">{submitting ? "Publishing…" : "Publish post"}</button>
      <style>{`.cinput{width:100%;background:#fcfcfd;border:1px solid rgba(15,27,61,0.1);border-radius:0.75rem;padding:0.75rem 1rem;font-size:0.875rem;color:#0f1b3d;outline:none}.cinput:focus{border-color:#3b6fa0;box-shadow:0 0 0 3px rgba(59,111,160,0.15)}`}</style>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="text-[11px] font-mono uppercase tracking-widest text-navy-light block mb-1.5">{label}</span>{children}</label>);
}
