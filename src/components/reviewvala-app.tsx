import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileBarChart,
  Filter,
  Gauge,
  Inbox,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquareReply,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PageKey = "Overview" | "Reviews" | "Response Center" | "Ratings" | "Analytics" | "Alerts" | "Locations" | "Team" | "Reports" | "Settings";
type PreviewState = "Live data" | "Loading" | "Empty" | "Error";

const navGroups: { label: string; items: { name: PageKey; icon: typeof Gauge; badge?: string }[] }[] = [
  { label: "Workspace", items: [
    { name: "Overview", icon: LayoutDashboard }, { name: "Reviews", icon: Inbox, badge: "18" },
    { name: "Response Center", icon: MessageSquareReply, badge: "7" }, { name: "Ratings", icon: Star },
  ]},
  { label: "Intelligence", items: [
    { name: "Analytics", icon: ChartNoAxesCombined }, { name: "Alerts", icon: Bell, badge: "3" },
    { name: "Reports", icon: FileBarChart },
  ]},
  { label: "Manage", items: [
    { name: "Locations", icon: MapPin }, { name: "Team", icon: Users }, { name: "Settings", icon: Settings },
  ]},
];

type Review = {
  id: string;
  initials: string;
  name: string;
  source: string;
  location: string;
  rating: number;
  time: string;
  status: string;
  sentiment: string;
  text: string;
};

type ResponseRecord = {
  id: string;
  review_id: string;
  response_text: string;
  response_status: string;
  author_name: string;
};

type RatingSnapshot = {
  id: string;
  channel: string;
  rating: number;
  period_label: string;
};

const fallbackReviews: Review[] = [
  { id: "fallback-1", initials: "AK", name: "Aarav Kapoor", source: "Google", location: "Indiranagar, Bengaluru", rating: 5, time: "18 min ago", status: "Needs reply", sentiment: "Positive", text: "The onboarding was effortless and the support team explained everything clearly. Priya was especially patient and helpful." },
  { id: "fallback-2", initials: "SM", name: "Sofia Martinez", source: "Trustpilot", location: "SoHo, New York", rating: 3, time: "1 hr ago", status: "Assigned", sentiment: "Mixed", text: "Good product overall, but I waited longer than expected for an update on my request." },
  { id: "fallback-3", initials: "JL", name: "James Liu", source: "Facebook", location: "Shoreditch, London", rating: 1, time: "3 hrs ago", status: "Escalated", sentiment: "Negative", text: "My issue is still unresolved after two conversations. I need someone to take ownership." },
  { id: "fallback-4", initials: "NP", name: "Nina Patel", source: "Google", location: "Indiranagar, Bengaluru", rating: 5, time: "Yesterday", status: "Replied", sentiment: "Positive", text: "Fast, thoughtful and genuinely friendly service. Would recommend to any growing business." },
];

function mapReview(row: {
  id: string;
  reviewer_initials: string;
  reviewer_name: string;
  source: string;
  location: string;
  rating: number;
  time_label: string;
  status: string;
  sentiment: string;
  review_text: string;
}): Review {
  return { id: row.id, initials: row.reviewer_initials, name: row.reviewer_name, source: row.source, location: row.location, rating: row.rating, time: row.time_label, status: row.status, sentiment: row.sentiment, text: row.review_text };
}

function useWorkspaceData() {
  const [workspaceReviews, setWorkspaceReviews] = useState<Review[]>(fallbackReviews);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [snapshots, setSnapshots] = useState<RatingSnapshot[]>([]);
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "error">("loading");

  const refresh = useCallback(async () => {
    setDataStatus("loading");
    const [reviewResult, responseResult, snapshotResult] = await Promise.all([
      supabase.from("reviewvala_reviews").select("id, reviewer_initials, reviewer_name, source, location, rating, time_label, status, sentiment, review_text").eq("workspace_slug", "northstar-group").order("created_at", { ascending: false }),
      supabase.from("reviewvala_responses").select("id, review_id, response_text, response_status, author_name").order("created_at", { ascending: false }),
      supabase.from("reviewvala_rating_snapshots").select("id, channel, rating, period_label").eq("workspace_slug", "northstar-group").order("created_at", { ascending: true }),
    ]);

    const firstError = reviewResult.error ?? responseResult.error ?? snapshotResult.error;
    if (firstError) {
      console.error(firstError);
      setDataStatus("error");
      return;
    }

    setWorkspaceReviews((reviewResult.data ?? []).map(mapReview));
    setResponses(responseResult.data ?? []);
    setSnapshots(snapshotResult.data ?? []);
    setDataStatus("ready");
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const saveResponse = useCallback(async (reviewId: string, responseText: string) => {
    const existing = responses.find((response) => response.review_id === reviewId);
    const responseResult = existing
      ? await supabase.from("reviewvala_responses").update({ response_text: responseText, response_status: "Approved" }).eq("id", existing.id).select("id, review_id, response_text, response_status, author_name").single()
      : await supabase.from("reviewvala_responses").insert({ review_id: reviewId, response_text: responseText, response_status: "Approved" }).select("id, review_id, response_text, response_status, author_name").single();
    if (responseResult.error) throw responseResult.error;
    const reviewResult = await supabase.from("reviewvala_reviews").update({ status: "Replied" }).eq("id", reviewId).select("id, reviewer_initials, reviewer_name, source, location, rating, time_label, status, sentiment, review_text").single();
    if (reviewResult.error) throw reviewResult.error;
    setResponses((current) => [responseResult.data, ...current.filter((response) => response.id !== responseResult.data.id)]);
    setWorkspaceReviews((current) => current.map((review) => review.id === reviewId ? mapReview(reviewResult.data) : review));
  }, [responses]);

  const approveResponse = useCallback(async (responseId: string) => {
    const result = await supabase.from("reviewvala_responses").update({ response_status: "Approved" }).eq("id", responseId).select("id, review_id, response_text, response_status, author_name").single();
    if (result.error) throw result.error;
    setResponses((current) => current.map((response) => response.id === responseId ? result.data : response));
  }, []);

  return { reviews: workspaceReviews, responses, snapshots, dataStatus, saveResponse, approveResponse };
}

const pageDescriptions: Record<PageKey, string> = {
  Overview: "Your reputation, response health, and priorities at a glance.",
  Reviews: "Read, route, and resolve every customer conversation in one place.",
  "Response Center": "Draft, approve, and publish thoughtful responses faster.",
  Ratings: "Understand rating movement across channels and locations.",
  Analytics: "Turn customer feedback into clear, actionable intelligence.",
  Alerts: "Stay ahead of urgent reviews and reputation changes.",
  Locations: "Compare performance and ownership across every location.",
  Team: "Manage collaborators, roles, and response accountability.",
  Reports: "Create polished summaries for leaders and stakeholders.",
  Settings: "Configure your workspace, channels, and response standards.",
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground shadow-brand"><span className="font-display text-sm font-bold">RV</span></div>{!compact && <div><div className="font-display text-[17px] font-bold leading-none text-sidebar-foreground">ReviewVala<span className="text-brand">™</span></div><div className="mt-1 text-[9px] font-medium text-sidebar-muted">Powered by Software Vala™</div></div>}</div>;
}

function Stars({ value, small = false }: { value: number; small?: boolean }) {
  return <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map((star) => <Star key={star} className={cn(small ? "size-3" : "size-4", star <= value ? "fill-warning text-warning" : "fill-muted text-border")} />)}</div>;
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "brand" }) {
  const tones = { neutral: "bg-muted text-muted-foreground", good: "bg-success-soft text-success", warn: "bg-warning-soft text-warning-strong", bad: "bg-destructive-soft text-destructive", brand: "bg-brand-soft text-brand" };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

function IconButton({ label, children, onClick, className }: { label: string; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={label} onClick={onClick} className={className}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

function Sidebar({ page, setPage, open, close }: { page: PageKey; setPage: (p: PageKey) => void; open: boolean; close: () => void }) {
  return <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 transition-transform duration-300 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
    <div className="flex items-center justify-between px-2 pb-5"><BrandMark/><IconButton label="Close navigation" onClick={close} className="lg:hidden"><X/></IconButton></div>
    <button className="mx-1 mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-elevated p-2.5 text-left shadow-xs">
      <span className="flex min-w-0 items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft font-display text-xs font-bold text-brand">N</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-sidebar-foreground">Northstar Group</span><span className="block truncate text-[10px] text-sidebar-muted">12 locations · Owner</span></span></span><ChevronDown className="size-3.5 text-sidebar-muted"/>
    </button>
    <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="Primary navigation">{navGroups.map((group) => <div key={group.label}><p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted">{group.label}</p><div className="space-y-0.5">{group.items.map((item) => { const Icon = item.icon; const active = page === item.name; return <button key={item.name} onClick={() => { setPage(item.name); close(); }} className={cn("grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground")}><Icon className={cn("size-4", active && "text-brand")}/><span className="truncate">{item.name}</span>{item.badge && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-brand text-brand-foreground" : "bg-sidebar-hover text-sidebar-muted")}>{item.badge}</span>}</button>})}</div></div>)}</nav>
    <div className="border-t border-sidebar-border pt-3"><button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-hover"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-avatar text-xs font-bold text-avatar-foreground">RS</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-sidebar-foreground">Riya Sharma</span><span className="block truncate text-[10px] text-sidebar-muted">Workspace owner</span></span><MoreHorizontal className="size-4 text-sidebar-muted"/></button><div className="mt-2 flex items-center gap-1.5 px-2 text-[9px] text-sidebar-muted"><ShieldCheck className="size-3 text-brand"/>Software Vala™ — The Name of Trust</div></div>
  </aside>;
}

function Topbar({ onMenu, onSearch, onNotifications, state, setState }: { onMenu: () => void; onSearch: () => void; onNotifications: () => void; state: PreviewState; setState: (s: PreviewState) => void }) {
  return <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-7"><IconButton label="Open navigation" onClick={onMenu} className="lg:hidden"><Menu/></IconButton><button onClick={onSearch} className="flex h-9 min-w-0 max-w-xl items-center gap-2 rounded-md border bg-surface px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-brand/40"><Search className="size-4 shrink-0"/><span className="truncate">Search reviews, people, or locations…</span><kbd className="ml-auto hidden shrink-0 rounded border bg-background px-1.5 py-0.5 text-[10px] sm:inline">⌘ K</kbd></button><div className="flex shrink-0 items-center gap-1"><select aria-label="Preview state" value={state} onChange={(e) => setState(e.target.value as PreviewState)} className="hidden h-8 rounded-md border bg-background px-2 text-xs text-muted-foreground sm:block"><option>Live data</option><option>Loading</option><option>Empty</option><option>Error</option></select><IconButton label="Help center"><CircleHelp/></IconButton><div className="relative"><IconButton label="Notifications" onClick={onNotifications}><Bell/></IconButton><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background"/></div></div></header>;
}

function MetricCard({ icon: Icon, label, value, note, tone = "brand" }: { icon: typeof Gauge; label: string; value: string; note: string; tone?: "brand" | "warning" | "success" }) {
  return <div className="rounded-lg border bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-bold text-card-foreground">{value}</p></div><span className={cn("grid size-9 place-items-center rounded-md", tone === "brand" ? "bg-brand-soft text-brand" : tone === "warning" ? "bg-warning-soft text-warning-strong" : "bg-success-soft text-success")}><Icon className="size-4"/></span></div><p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><TrendingUp className="size-3 text-success"/>{note}</p></div>;
}

function TrendChart() {
  return <div className="mt-5 h-44 w-full"><svg viewBox="0 0 700 180" className="h-full w-full" preserveAspectRatio="none" aria-label="Rating trend over six months"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity=".2"/><stop offset="100%" stopColor="var(--brand)" stopOpacity="0"/></linearGradient></defs>{[30,75,120,165].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="var(--border)" strokeDasharray="4 6"/>)}<path d="M0 145 C70 130 100 118 145 123 S235 90 285 96 S370 65 420 76 S510 48 560 58 S640 33 700 38 L700 180 L0 180Z" fill="url(#area)"/><path d="M0 145 C70 130 100 118 145 123 S235 90 285 96 S370 65 420 76 S510 48 560 58 S640 33 700 38" fill="none" stroke="var(--brand)" strokeWidth="3"/><circle cx="700" cy="38" r="5" fill="var(--brand)" stroke="var(--background)" strokeWidth="3"/></svg></div>;
}

const journey = [
  { step: "Connect", copy: "Bring every review channel together" },
  { step: "Monitor", copy: "Watch ratings and mentions in real time" },
  { step: "Organize", copy: "Route, assign, and prioritize" },
  { step: "Respond", copy: "Reply fast with approved tone" },
  { step: "Analyze", copy: "Find themes behind the scores" },
  { step: "Improve", copy: "Turn feedback into action" },
];

function JourneyStrip() {
  return <section className="mb-4 rounded-lg border bg-card p-4 shadow-card"><div className="flex items-center justify-between"><h2 className="font-display text-sm font-bold">Your reputation journey</h2><span className="text-[11px] text-muted-foreground">4 of 6 stages active</span></div><ol className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{journey.map((item, index) => <li key={item.step} className="rounded-md border bg-surface p-3 transition-transform hover:-translate-y-0.5"><div className="flex items-center gap-2"><span className={cn("grid size-5 place-items-center rounded-full text-[10px] font-bold", index < 4 ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground")}>{index < 4 ? <Check className="size-3"/> : index + 1}</span><span className="text-xs font-semibold">{item.step}</span></div><p className="mt-2 text-[11px] leading-4 text-muted-foreground">{item.copy}</p></li>)}</ol></section>;
}

function Overview({ setPage }: { setPage: (p: PageKey) => void }) {
  return <><JourneyStrip/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Star} label="Overall rating" value="4.62" note="+0.14 in 90 days" tone="warning"/><MetricCard icon={Inbox} label="New reviews" value="128" note="18 need attention"/><MetricCard icon={MessageSquareReply} label="Response rate" value="94%" note="+6% vs last month" tone="success"/><MetricCard icon={Clock3} label="Avg. response time" value="3h 24m" note="42m faster this month"/></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.85fr)]"><section className="rounded-lg border bg-card p-5 shadow-card"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-base font-bold">Reputation pulse</h2><p className="mt-1 text-xs text-muted-foreground">Average rating across all channels</p></div><select className="h-8 rounded-md border bg-background px-2 text-xs"><option>Last 6 months</option><option>Last 30 days</option></select></div><TrendChart/><div className="mt-2 grid grid-cols-6 text-center text-[10px] text-muted-foreground"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div></section>
      <section className="rounded-lg border bg-ink p-5 text-ink-foreground shadow-card"><div className="flex items-center gap-2 text-brand-bright"><Sparkles className="size-4"/><span className="text-xs font-bold uppercase tracking-wider">Reputation signal</span></div><h2 className="mt-5 font-display text-xl font-bold">Service mentions are up 23%</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Customers increasingly praise “helpful staff” and “fast setup.” Bengaluru is leading the lift.</p><div className="mt-5 flex flex-wrap gap-2"><StatusPill tone="good">helpful staff · 42</StatusPill><StatusPill tone="brand">fast setup · 31</StatusPill></div><Button className="mt-6 w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setPage("Analytics")}>Explore insight <Activity/></Button></section></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]"><RecentReviews setPage={setPage}/><LocationsSnapshot/></div></>;
}

function RecentReviews({ setPage }: { setPage: (p: PageKey) => void }) { return <section className="rounded-lg border bg-card shadow-card"><div className="flex items-center justify-between border-b p-4"><div><h2 className="font-display text-base font-bold">Reviews needing attention</h2><p className="mt-1 text-xs text-muted-foreground">Prioritized by rating, recency, and risk</p></div><Button variant="ghost" size="sm" onClick={() => setPage("Reviews")}>View all</Button></div><div className="divide-y">{reviews.slice(0,3).map((review) => <button key={review.id} onClick={() => setPage("Reviews")} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 p-4 text-left hover:bg-surface"><span className="grid size-9 place-items-center rounded-full bg-avatar text-xs font-bold text-avatar-foreground">{review.initials}</span><span className="min-w-0"><span className="flex items-center gap-2"><strong className="truncate text-sm">{review.name}</strong><span className="text-[10px] text-muted-foreground">{review.source}</span></span><span className="mt-1 block truncate text-xs text-muted-foreground">{review.text}</span><span className="mt-2 flex items-center gap-2"><Stars value={review.rating} small/><span className="text-[10px] text-muted-foreground">{review.time}</span></span></span><StatusPill tone={review.rating <= 2 ? "bad" : review.rating === 3 ? "warn" : "neutral"}>{review.status}</StatusPill></button>)}</div></section>; }

function LocationsSnapshot() { const rows = [{name:"Indiranagar",score:"4.8",change:"+0.2",width:"92%"},{name:"SoHo",score:"4.6",change:"+0.1",width:"84%"},{name:"Shoreditch",score:"4.1",change:"−0.3",width:"68%"},{name:"Marina Bay",score:"4.7",change:"+0.2",width:"88%"}]; return <section className="rounded-lg border bg-card p-4 shadow-card"><div className="flex items-center justify-between"><div><h2 className="font-display text-base font-bold">Location health</h2><p className="mt-1 text-xs text-muted-foreground">Top and at-risk locations</p></div><MapPin className="size-4 text-brand"/></div><div className="mt-5 space-y-5">{rows.map((row) => <div key={row.name}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">{row.name}</span><span><strong>{row.score}</strong> <span className={row.change.startsWith("+") ? "text-success" : "text-destructive"}>{row.change}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{width: row.width}}/></div></div>)}</div></section>; }

function ReviewsPage() {
  const [selected, setSelected] = useState(reviews[0]!); const [reply, setReply] = useState("");
  return <div className="grid min-h-[calc(100vh-150px)] overflow-hidden rounded-lg border bg-card shadow-card xl:grid-cols-[minmax(360px,.9fr)_minmax(480px,1.3fr)]"><section className="border-r"><div className="border-b p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search reviews"/></div><Button variant="outline" size="icon" aria-label="Filter reviews"><Filter/></Button></div><div className="mt-3 flex gap-2 overflow-x-auto"><StatusPill tone="brand">All 1,284</StatusPill><StatusPill>Needs reply 18</StatusPill><StatusPill>Escalated 3</StatusPill></div></div><div className="divide-y">{reviews.map((review) => <button key={review.id} onClick={() => setSelected(review)} className={cn("w-full p-4 text-left transition-colors", selected.id === review.id ? "bg-brand-soft/60" : "hover:bg-surface")}><div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3"><span className="grid size-9 place-items-center rounded-full bg-avatar text-xs font-bold text-avatar-foreground">{review.initials}</span><span className="min-w-0"><strong className="block truncate text-sm">{review.name}</strong><span className="mt-1 flex items-center gap-2"><Stars value={review.rating} small/><span className="text-[10px] text-muted-foreground">{review.source}</span></span></span><span className="text-[10px] text-muted-foreground">{review.time}</span></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{review.text}</p></button>)}</div></section>
    <section className="min-w-0"><div className="flex items-center justify-between border-b px-5 py-3"><div className="flex items-center gap-2"><StatusPill tone={selected.rating <= 2 ? "bad" : selected.rating === 3 ? "warn" : "good"}>{selected.sentiment}</StatusPill><StatusPill>{selected.status}</StatusPill></div><div className="flex"><IconButton label="Assign review"><Users/></IconButton><IconButton label="More actions"><MoreHorizontal/></IconButton></div></div><div className="p-5 lg:p-7"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-avatar font-display text-sm font-bold text-avatar-foreground">{selected.initials}</span><div className="min-w-0"><h2 className="font-display text-lg font-bold">{selected.name}</h2><p className="mt-1 text-xs text-muted-foreground">{selected.location} · {selected.source} · {selected.time}</p><div className="mt-3"><Stars value={selected.rating}/></div></div></div><blockquote className="mt-6 border-l-2 border-brand pl-4 text-[15px] leading-7 text-foreground">“{selected.text}”</blockquote><div className="mt-6 rounded-lg border bg-surface p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold"><WandSparkles className="size-4 text-brand"/>Suggested response</span><button className="text-xs font-semibold text-brand">Regenerate</button></div><textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Hi ${selected.name.split(" ")[0]}, thank you for taking the time to share this with us…`} className="mt-3 min-h-32 w-full resize-none rounded-md border bg-background p-3 text-sm leading-6 outline-none transition-shadow focus:ring-2 focus:ring-ring"/><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><span className="min-w-0 text-[11px] text-muted-foreground">Warm · Concise · Brand-safe</span><Button><Send/>Send response</Button></div></div><div className="mt-5 border-t pt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Collaboration</h3><div className="mt-3 flex items-center gap-3 text-xs"><span className="grid size-7 place-items-center rounded-full bg-avatar font-bold">RS</span><span><strong>Riya</strong> assigned this to Customer Care</span><span className="ml-auto text-muted-foreground">12 min ago</span></div></div></div></section></div>;
}

function ResponseCenter() { return <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]"><section className="rounded-lg border bg-card shadow-card"><div className="flex items-center justify-between border-b p-4"><div><h2 className="font-display font-bold">Approval queue</h2><p className="mt-1 text-xs text-muted-foreground">7 responses are ready for review</p></div><StatusPill tone="warn">SLA: 2 due soon</StatusPill></div><div className="divide-y">{reviews.slice(0,3).map((r,i) => <div key={r.id} className="p-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-avatar text-xs font-bold">{r.initials}</span><span className="truncate text-sm font-semibold">Response to {r.name}</span></div><Stars value={r.rating} small/></div><p className="mt-4 rounded-md bg-surface p-3 text-xs leading-5 text-muted-foreground">{i === 0 ? "Thank you for your kind words, Aarav. We’re delighted Priya made your onboarding feel effortless…" : "Thank you for sharing this. We understand how important timely updates are, and we’re reviewing your experience…"}</p><div className="mt-3 flex justify-end gap-2"><Button variant="ghost" size="sm">Edit</Button><Button variant="outline" size="sm">Request changes</Button><Button size="sm"><Check/>Approve</Button></div></div>)}</div></section><aside className="space-y-4"><section className="rounded-lg border bg-card p-5 shadow-card"><h2 className="font-display font-bold">Response quality</h2><div className="mt-5 flex items-end gap-3"><span className="font-display text-4xl font-bold">92</span><span className="pb-1 text-xs text-success">Excellent</span></div><div className="mt-4 h-2 rounded-full bg-muted"><div className="h-full w-[92%] rounded-full bg-success"/></div><ul className="mt-5 space-y-3 text-xs"><li className="flex justify-between"><span className="text-muted-foreground">Personalization</span><strong>96%</strong></li><li className="flex justify-between"><span className="text-muted-foreground">Brand voice</span><strong>91%</strong></li><li className="flex justify-between"><span className="text-muted-foreground">Resolution clarity</span><strong>88%</strong></li></ul></section><section className="rounded-lg border bg-card p-5 shadow-card"><div className="flex items-center justify-between"><h2 className="font-display font-bold">Saved templates</h2><Button variant="ghost" size="icon" aria-label="Add template"><Plus/></Button></div>{["Positive feedback", "Service recovery", "Follow-up requested"].map(x => <button key={x} className="mt-2 flex w-full items-center justify-between rounded-md border p-3 text-left text-xs font-medium hover:bg-surface">{x}<ChevronDown className="size-3 -rotate-90"/></button>)}</section></aside></div>; }

const moduleCards: Record<Exclude<PageKey, "Overview"|"Reviews"|"Response Center">, { metric: string; label: string; items: string[]; insight: string }> = {
  Ratings: { metric: "4.62", label: "weighted rating", items: ["Google · 4.7", "Trustpilot · 4.4", "Facebook · 4.5"], insight: "Five-star reviews grew fastest in Bengaluru and Singapore." },
  Analytics: { metric: "+18%", label: "positive sentiment", items: ["Helpful staff · 284 mentions", "Fast setup · 191 mentions", "Wait time · 42 mentions"], insight: "Customers who mention onboarding are 2.3× more likely to leave five stars." },
  Alerts: { metric: "3", label: "active alerts", items: ["1-star review · Shoreditch", "Rating drop · SoHo", "Response SLA · 46 min left"], insight: "One high-priority issue needs owner attention now." },
  Locations: { metric: "12", label: "active locations", items: ["Indiranagar · 4.8 · Healthy", "Marina Bay · 4.7 · Healthy", "Shoreditch · 4.1 · Watch"], insight: "Indiranagar leads the network for response speed and service sentiment." },
  Team: { metric: "24", label: "team members", items: ["Owners · 2", "Managers · 8", "Responders · 14"], insight: "Customer Care resolved 94% of assigned reviews within SLA." },
  Reports: { metric: "8", label: "scheduled reports", items: ["Executive reputation brief · Weekly", "Location scorecard · Monthly", "Service themes · Monthly"], insight: "The September executive brief is ready to review." },
  Settings: { metric: "6", label: "channels connected", items: ["Review channels", "Response guidelines", "Alerts & routing"], insight: "Workspace health is strong. One channel needs re-authorization." },
};

function ModulePage({ page }: { page: Exclude<PageKey, "Overview"|"Reviews"|"Response Center"> }) { const data = moduleCards[page]; return <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]"><section className="rounded-lg border bg-card shadow-card"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-display text-lg font-bold">{page} overview</h2><p className="mt-1 text-xs text-muted-foreground">Northstar Group · All locations</p></div><Button variant="outline" size="sm"><Filter/>Last 30 days</Button></div><div className="p-6"><div className="flex items-end gap-3"><span className="font-display text-5xl font-bold">{data.metric}</span><span className="pb-1 text-sm text-muted-foreground">{data.label}</span></div>{page === "Ratings" || page === "Analytics" ? <TrendChart/> : <div className="my-8 grid grid-cols-7 items-end gap-2 h-36">{[42,68,54,82,74,92,78].map((h,i) => <div key={i} className="rounded-t bg-brand-soft" style={{height:`${h}%`}}><div className="h-2 rounded-t bg-brand"/></div>)}</div>}<div className="grid gap-3 sm:grid-cols-3">{data.items.map((item) => <button key={item} className="rounded-md border bg-surface p-3 text-left text-xs font-semibold transition-colors hover:border-brand/40">{item}</button>)}</div></div></section><aside className="space-y-4"><section className="rounded-lg border bg-ink p-5 text-ink-foreground shadow-card"><Sparkles className="size-4 text-brand-bright"/><h2 className="mt-4 font-display text-lg font-bold">What matters now</h2><p className="mt-2 text-sm leading-6 text-ink-muted">{data.insight}</p><Button className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90">View details</Button></section><section className="rounded-lg border bg-card p-5 shadow-card"><h2 className="font-display font-bold">Quick actions</h2><div className="mt-3 grid gap-2"><Button variant="outline" className="justify-start"><Plus/>Create {page === "Reports" ? "report" : page === "Alerts" ? "alert" : "view"}</Button><Button variant="outline" className="justify-start"><Users/>Share with team</Button></div></section></aside></div>; }

function StatePanel({ state }: { state: Exclude<PreviewState, "Live data"> }) { const config = state === "Loading" ? {icon: Activity,title:"Loading your reputation workspace",copy:"Bringing together reviews, ratings, and team activity…"} : state === "Empty" ? {icon: Inbox,title:"Your inbox is clear",copy:"New reviews from every connected channel will appear here."} : {icon: AlertCircle,title:"We couldn’t refresh this view",copy:"Your existing data is safe. Try again in a moment."}; const Icon=config.icon; return <div className="grid min-h-[420px] place-items-center rounded-lg border bg-card p-8 text-center shadow-card"><div className="max-w-sm"><span className={cn("mx-auto grid size-12 place-items-center rounded-lg", state === "Error" ? "bg-destructive-soft text-destructive" : "bg-brand-soft text-brand")}><Icon className={cn("size-5", state === "Loading" && "animate-spin")}/></span><h2 className="mt-5 font-display text-xl font-bold">{config.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{config.copy}</p>{state !== "Loading" && <Button className="mt-5">{state === "Empty" ? "Connect a channel" : "Try again"}</Button>}</div></div>; }

function SearchOverlay({ close }: { close: () => void }) { return <div className="fixed inset-0 z-50 bg-overlay p-4 backdrop-blur-sm" onMouseDown={close}><div onMouseDown={(e)=>e.stopPropagation()} className="mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-lg border bg-background shadow-modal"><div className="flex items-center gap-3 border-b p-4"><Search className="size-5 text-brand"/><input autoFocus className="min-w-0 flex-1 bg-transparent text-base outline-none" placeholder="Search reviews, customers, locations…"/><kbd className="rounded border px-2 py-1 text-[10px] text-muted-foreground">ESC</kbd></div><div className="p-3"><p className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent searches</p>{["1-star reviews this week", "Shoreditch", "Aarav Kapoor"].map((x,i)=><button key={x} className="flex w-full items-center gap-3 rounded-md p-3 text-left text-sm hover:bg-surface">{i===0?<Star className="size-4 text-warning"/>:i===1?<MapPin className="size-4 text-brand"/>:<Users className="size-4 text-brand"/>}{x}</button>)}</div></div></div>; }

function Notifications({ close }: { close: () => void }) { return <div className="fixed inset-0 z-50 bg-overlay/50" onMouseDown={close}><aside onMouseDown={(e)=>e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-sm bg-background p-5 shadow-modal"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold">Notifications</h2><p className="mt-1 text-xs text-muted-foreground">3 need your attention</p></div><IconButton label="Close notifications" onClick={close}><X/></IconButton></div><div className="mt-6 space-y-2">{["A 1-star review needs escalation","SoHo rating dropped by 0.3","Riya requested response approval"].map((x,i)=><button key={x} className="w-full rounded-lg border p-4 text-left hover:bg-surface"><span className="flex items-start gap-3"><span className={cn("mt-0.5 size-2 shrink-0 rounded-full", i===0?"bg-destructive":i===1?"bg-warning":"bg-brand")}/><span><strong className="text-sm">{x}</strong><span className="mt-1 block text-xs text-muted-foreground">{i+1} hour{i ? "s" : ""} ago · Northstar Group</span></span></span></button>)}</div></aside></div>; }

export function ReviewValaApp() {
  const [page, setPage] = useState<PageKey>("Overview"); const [menu, setMenu] = useState(false); const [search, setSearch] = useState(false); const [notifications, setNotifications] = useState(false); const [state, setState] = useState<PreviewState>("Live data");
  const content = useMemo(() => page === "Overview" ? <Overview setPage={setPage}/> : page === "Reviews" ? <ReviewsPage/> : page === "Response Center" ? <ResponseCenter/> : <ModulePage page={page}/>, [page]);
  return <TooltipProvider delayDuration={250}><div className="min-h-screen bg-background text-foreground"><Sidebar page={page} setPage={setPage} open={menu} close={()=>setMenu(false)}/>{menu && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-overlay lg:hidden" onClick={()=>setMenu(false)}/>}<div className="lg:pl-[248px]"><Topbar onMenu={()=>setMenu(true)} onSearch={()=>setSearch(true)} onNotifications={()=>setNotifications(true)} state={state} setState={setState}/><main className="mx-auto max-w-[1600px] px-4 py-5 pb-24 lg:px-7 lg:py-7"><header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"><div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand">Northstar Group / All locations</p><h1 className="truncate font-display text-2xl font-bold lg:text-[28px]">{page}</h1><p className="mt-1 hidden text-sm text-muted-foreground sm:block">{pageDescriptions[page]}</p></div><Button className="hidden sm:flex">{page === "Reviews" ? <><MessageSquareReply/>Respond</> : page === "Reports" ? <><Plus/>New report</> : <><Plus/>Quick action</>}</Button></header>{state === "Live data" ? content : <StatePanel state={state}/>}</main></div><nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background px-2 py-1.5 shadow-modal lg:hidden">{(["Overview","Reviews","Response Center","Analytics","Settings"] as PageKey[]).map((item)=>{const Icon=navGroups.flatMap(x=>x.items).find(x=>x.name===item)?.icon ?? Gauge; return <button key={item} onClick={()=>setPage(item)} className={cn("flex flex-col items-center gap-1 py-1 text-[9px]", page===item?"text-brand":"text-muted-foreground")}><Icon className="size-5"/><span>{item === "Response Center" ? "Respond" : item}</span></button>})}</nav>{search && <SearchOverlay close={()=>setSearch(false)}/>} {notifications && <Notifications close={()=>setNotifications(false)}/>}</div></TooltipProvider>;
}