import { supabase } from "@/integrations/supabase/client";

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  teacher: string | null;
  source: string | null;
  start_date: string | null;
  end_date: string | null;
  color: string | null;
};

export type StudySession = {
  id: string;
  subject_id: string;
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  tag: string;
  topics: string | null;
  completed: boolean;
  position: number;
};

export type JournalEntry = {
  id: string;
  content: string;
  entry_date: string;
  created_at: string;
};

export type StudyHour = {
  id: string;
  subject_id: string;
  log_date: string;
  hours: number;
};

export type MistakeLog = {
  id: string;
  subject_id: string | null;
  title: string;
  details: string | null;
  resolved: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  exam_date: string;
  prep_start_date: string;
  username: string | null;
  stream: string;
  target_branch: string;
  about_me: string | null;
  social_links: string | null;
};

export const SESSION_TAGS = [
  "Revise Concepts",
  "Solve PYQs",
  "Watch Lecture",
  "Practice Questions",
  "Make Notes",
] as const;

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function fetchProfile(): Promise<Profile> {
  const userId = await getUserId();
  const existing = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data as Profile;
  const created = await supabase
    .from("profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  return unwrap(created) as Profile;
}

export async function updateProfile(patch: Partial<Profile>) {
  const userId = await getUserId();
  return unwrap(
    await supabase.from("profiles").update(patch).eq("user_id", userId).select("*").single(),
  );
}

export async function fetchSubjects(): Promise<Subject[]> {
  return (unwrap(
    await supabase.from("subjects").select("*").order("created_at", { ascending: true }),
  ) ?? []) as Subject[];
}

export async function createSubject(input: Partial<Subject>) {
  const user_id = await getUserId();
  return unwrap(await supabase.from("subjects").insert({ ...input, user_id } as never).select("*").single());
}

export async function updateSubject(id: string, patch: Partial<Subject>) {
  return unwrap(await supabase.from("subjects").update(patch).eq("id", id).select("*").single());
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchSessions(subjectId?: string): Promise<StudySession[]> {
  let q = supabase.from("study_sessions").select("*");
  if (subjectId) q = q.eq("subject_id", subjectId);
  return (unwrap(
    await q.order("position", { ascending: true }).order("scheduled_date", { ascending: true }),
  ) ?? []) as StudySession[];
}

export async function createSession(input: Partial<StudySession>) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("study_sessions").insert({ ...input, user_id } as never).select("*").single(),
  );
}

export async function updateSession(id: string, patch: Partial<StudySession>) {
  return unwrap(
    await supabase.from("study_sessions").update(patch).eq("id", id).select("*").single(),
  );
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchJournal(): Promise<JournalEntry[]> {
  return (unwrap(
    await supabase.from("journal_entries").select("*").order("created_at", { ascending: false }),
  ) ?? []) as JournalEntry[];
}

export async function createJournal(content: string) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("journal_entries").insert({ content, user_id } as never).select("*").single(),
  );
}

export async function deleteJournal(id: string) {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchStudyHours(): Promise<StudyHour[]> {
  return (unwrap(
    await supabase.from("study_hours").select("*").order("log_date", { ascending: false }),
  ) ?? []) as StudyHour[];
}

export async function createStudyHour(input: { subject_id: string; log_date: string; hours: number }) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("study_hours").insert({ ...input, user_id } as never).select("*").single(),
  );
}

export async function deleteStudyHour(id: string) {
  const { error } = await supabase.from("study_hours").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchMistakes(): Promise<MistakeLog[]> {
  return (unwrap(
    await supabase.from("mistake_logs").select("*").order("created_at", { ascending: false }),
  ) ?? []) as MistakeLog[];
}

export async function createMistake(input: {
  title: string;
  details?: string;
  subject_id?: string | null;
}) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("mistake_logs").insert({ ...input, user_id } as never).select("*").single(),
  );
}

export async function updateMistake(id: string, patch: Partial<MistakeLog>) {
  return unwrap(await supabase.from("mistake_logs").update(patch).eq("id", id).select("*").single());
}

export async function deleteMistake(id: string) {
  const { error } = await supabase.from("mistake_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export type TestRecord = {
  id: string;
  name: string;
  organization: string;
  test_type: string;
  category: string | null;
  attempted: boolean;
  score: number | null;
  max_score: number | null;
  actual_time_mins: number | null;
  analysis_time_mins: number | null;
  test_date: string | null;
  created_at: string;
};

export type SyllabusTopic = {
  id: string;
  track: string;
  section: string;
  topic: string;
  completed: boolean;
  position: number;
};

export async function fetchTests(): Promise<TestRecord[]> {
  return (unwrap(
    await supabase.from("tests").select("*").order("created_at", { ascending: false }),
  ) ?? []) as TestRecord[];
}

export async function createTest(input: Partial<TestRecord>) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("tests").insert({ ...input, user_id } as never).select("*").single(),
  );
}

export async function updateTest(id: string, patch: Partial<TestRecord>) {
  return unwrap(await supabase.from("tests").update(patch).eq("id", id).select("*").single());
}

export async function deleteTest(id: string) {
  const { error } = await supabase.from("tests").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAllTests() {
  const user_id = await getUserId();
  const { error } = await supabase.from("tests").delete().eq("user_id", user_id);
  if (error) throw new Error(error.message);
}

export async function fetchSyllabus(): Promise<SyllabusTopic[]> {
  return (unwrap(
    await supabase
      .from("syllabus_topics")
      .select("*")
      .order("section", { ascending: true })
      .order("position", { ascending: true }),
  ) ?? []) as SyllabusTopic[];
}

export async function loadSyllabusSeed(
  track: string,
  seed: { section: string; topics: string[] }[],
) {
  const user_id = await getUserId();
  const rows = seed.flatMap((s) =>
    s.topics.map((topic, i) => ({ user_id, track, section: s.section, topic, position: i })),
  );
  const { error } = await supabase.from("syllabus_topics").insert(rows as never);
  if (error) throw new Error(error.message);
}

export async function toggleTopic(id: string, completed: boolean) {
  return unwrap(
    await supabase.from("syllabus_topics").update({ completed }).eq("id", id).select("*").single(),
  );
}

export async function addTopic(input: { track: string; section: string; topic: string; position: number }) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("syllabus_topics").insert({ ...input, user_id } as never).select("*").single(),
  );
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from("syllabus_topics").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function resetSyllabus(track: string) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from("syllabus_topics")
    .delete()
    .eq("user_id", user_id)
    .eq("track", track);
  if (error) throw new Error(error.message);
}

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  due_date: string;
  created_at: string;
};

export async function fetchTasks(): Promise<Task[]> {
  return (unwrap(
    await supabase.from("tasks").select("*").order("created_at", { ascending: false }),
  ) ?? []) as Task[];
}

export async function createTask(title: string) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("tasks").insert({ title, user_id } as never).select("*").single(),
  );
}

export async function updateTask(id: string, patch: Partial<Task>) {
  return unwrap(await supabase.from("tasks").update(patch).eq("id", id).select("*").single());
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchStreakDays(): Promise<string[]> {
  const rows = (unwrap(
    await supabase.from("streak_days").select("day").order("day", { ascending: false }),
  ) ?? []) as { day: string }[];
  return rows.map((r) => r.day);
}

export async function checkInToday() {
  const user_id = await getUserId();
  const { error } = await supabase
    .from("streak_days")
    .upsert({ user_id, day: todayISO() } as never, { onConflict: "user_id,day" });
  if (error) throw new Error(error.message);
}

export function computeStreak(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export type StudyMaterial = {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  kind: string;
  file_path: string;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
};

export const MATERIAL_KINDS = ["Notes", "DPP", "Assignment", "PYQ", "Book", "Other"] as const;

export async function fetchMaterials(subjectId: string): Promise<StudyMaterial[]> {
  return (unwrap(
    await supabase
      .from("study_materials")
      .select("*")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false }),
  ) ?? []) as StudyMaterial[];
}

export async function uploadMaterial(input: {
  subject_id: string;
  title: string;
  kind: string;
  file: File;
}) {
  const user_id = await getUserId();
  const safe = input.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${user_id}/${input.subject_id}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from("study-materials").upload(path, input.file);
  if (up.error) throw new Error(up.error.message);
  return unwrap(
    await supabase
      .from("study_materials")
      .insert({
        user_id,
        subject_id: input.subject_id,
        title: input.title || input.file.name,
        kind: input.kind,
        file_path: path,
        file_name: input.file.name,
        size_bytes: input.file.size,
      } as never)
      .select("*")
      .single(),
  );
}

export async function materialUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("study-materials")
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteMaterial(m: StudyMaterial) {
  await supabase.storage.from("study-materials").remove([m.file_path]);
  const { error } = await supabase.from("study_materials").delete().eq("id", m.id);
  if (error) throw new Error(error.message);
}
