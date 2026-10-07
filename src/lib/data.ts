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

/* ---------------- Practice Arena ---------------- */

export type PracticeQuestion = {
  id: string;
  user_id: string;
  author_name: string | null;
  subject: string;
  qtype: string;
  difficulty: string;
  tag: string;
  question: string;
  options: string[];
  correct_index: number;
  correct_indices: number[] | null;
  nat_answer: string | null;
  image_path: string | null;
  explanation: string | null;
  status: string;
  created_at: string;
};

export type PracticeAttempt = {
  id: string;
  question_id: string;
  selected_index: number | null;
  selected_indices: number[] | null;
  nat_input: string | null;
  is_correct: boolean;
  skipped: boolean;
  time_taken_secs: number | null;
  created_at: string;
};

export const PRACTICE_SUBJECTS = [
  "DBMS",
  "Prog. and DS",
  "Algorithms",
  "Operating System",
  "Computer Networks",
  "TOC",
  "Compiler Design",
  "COA",
  "Digital Logic",
  "Discrete Maths",
  "Engg. Maths",
  "Aptitude",
] as const;

export const PRACTICE_TYPES = ["MCQ", "MSQ", "NAT"] as const;
export const PRACTICE_LEVELS = ["Easy", "Medium", "Hard"] as const;
export const PRACTICE_TAGS = [
  "Untagged",
  "PYQ",
  "Concept",
  "Tricky",
  "Numerical",
  "Theory",
] as const;

export async function fetchPracticeQuestions(): Promise<PracticeQuestion[]> {
  return (unwrap(
    await supabase
      .from("practice_questions")
      .select("*")
      .order("created_at", { ascending: true }),
  ) ?? []) as PracticeQuestion[];
}

export async function fetchMyQuestions(): Promise<PracticeQuestion[]> {
  const user_id = await getUserId();
  return (unwrap(
    await supabase
      .from("practice_questions")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false }),
  ) ?? []) as PracticeQuestion[];
}

export type QuestionInput = {
  subject: string;
  qtype: string;
  difficulty: string;
  tag: string;
  question: string;
  options: string[];
  correct_index: number;
  correct_indices?: number[] | null;
  nat_answer?: string | null;
  image_path?: string | null;
  explanation?: string;
  author_name?: string | null;
};

/** 0-based correct option list for a practice question (MSQ-aware). */
export function practiceCorrectSet(q: Pick<PracticeQuestion, "correct_index" | "correct_indices">) {
  return q.correct_indices && q.correct_indices.length ? q.correct_indices : [q.correct_index];
}

export async function submitQuestion(input: QuestionInput) {
  const user_id = await getUserId();
  return unwrap(
    await supabase
      .from("practice_questions")
      .insert({ ...input, user_id, status: "approved" } as never)
      .select("*")
      .single(),
  );
}

export async function submitQuestions(rows: QuestionInput[]) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from("practice_questions")
    .insert(rows.map((r) => ({ ...r, user_id, status: "approved" })) as never);
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase.from("practice_questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchMyAttempts(): Promise<PracticeAttempt[]> {
  return (unwrap(
    await supabase.from("practice_attempts").select("*").order("created_at", { ascending: false }),
  ) ?? []) as PracticeAttempt[];
}

export async function recordAttempt(input: {
  question_id: string;
  selected_index: number | null;
  selected_indices?: number[] | null;
  nat_input?: string | null;
  is_correct: boolean;
  skipped: boolean;
  time_taken_secs?: number | null;
}) {
  const user_id = await getUserId();
  return unwrap(
    await supabase.from("practice_attempts").insert({ ...input, user_id } as never).select("*").single(),
  );
}

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  solved: number;
  attempts: number;
  accuracy: number;
  contributed: number;
};

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("practice_leaderboard");
  if (error) throw new Error(error.message);
  return (data ?? []) as LeaderboardRow[];
}

/* ---------------- PYQ Arena ---------------- */

export type PyqQuestion = {
  id: string;
  user_id: string;
  year: number;
  paper: string;
  subject: string;
  topic: string;
  qtype: string;
  marks: number;
  question: string;
  options: string[];
  correct_index: number;
  correct_indices: number[];
  image_path: string | null;
  answer_text: string | null;
  explanation: string | null;
  created_at: string;
};

export type PyqAttempt = {
  id: string;
  question_id: string;
  selected_index: number | null;
  selected_indices: number[];
  answer_text: string | null;
  is_correct: boolean;
  skipped: boolean;
  created_at: string;
};

export const PYQ_YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);
export const PYQ_PAPERS = ["CS", "CS-1", "CS-2", "DA"] as const;
export const PYQ_TYPES = ["MCQ", "MSQ", "NAT"] as const;
export const PYQ_MARKS = [1, 2] as const;

export async function uploadPyqImage(file: File | Blob, name = "image.jpg") {
  const user_id = await getUserId();
  const raw = file instanceof File ? file.name : name;
  const safe = raw.replace(/[^\w.\-]+/g, "_");
  const path = `${user_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const up = await supabase.storage.from("pyq-images").upload(path, file);
  if (up.error) throw new Error(up.error.message);
  return path;
}

export async function pyqImageUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("pyq-images")
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

const PAGE = 1000;

/** Fetch every PYQ in pages of 1000 so large banks (2000–2026) are never truncated. */
export async function fetchPyqQuestions(): Promise<PyqQuestion[]> {
  const all: PyqQuestion[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = (unwrap(
      await supabase
        .from("pyq_questions")
        .select("*")
        .order("year", { ascending: false })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1),
    ) ?? []) as PyqQuestion[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

export async function fetchMyPyqQuestions(): Promise<PyqQuestion[]> {
  const user_id = await getUserId();
  const all: PyqQuestion[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = (unwrap(
      await supabase
        .from("pyq_questions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1),
    ) ?? []) as PyqQuestion[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

export type PyqInput = {
  year: number;
  paper: string;
  subject: string;
  topic: string;
  qtype: string;
  marks: number;
  question: string;
  options: string[];
  correct_index: number;
  correct_indices?: number[];
  image_path?: string | null;
  answer_text?: string | null;
  explanation?: string | null;
};

/** Normalised identity of a question, used to block duplicate imports. */
export function pyqKey(q: { year: number; paper: string; question: string }) {
  const text = q.question.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 160);
  return `${q.year}|${q.paper.toUpperCase()}|${text}`;
}

/** Inserts questions, skipping any already in the bank (or repeated in the batch). */
export async function addPyqQuestions(rows: PyqInput[]) {
  const user_id = await getUserId();
  const years = [...new Set(rows.map((r) => r.year))];
  const existing = new Set<string>();
  for (let from = 0; years.length; from += PAGE) {
    const res = (unwrap(
      await supabase
        .from("pyq_questions")
        .select("year, paper, question")
        .in("year", years)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1),
    ) ?? []) as { year: number; paper: string; question: string }[];
    res.forEach((r) => existing.add(pyqKey(r)));
    if (res.length < PAGE) break;
  }
  const fresh: PyqInput[] = [];
  for (const r of rows) {
    const k = pyqKey(r);
    if (existing.has(k)) continue;
    existing.add(k);
    fresh.push(r);
  }
  if (fresh.length) {
    const { error } = await supabase
      .from("pyq_questions")
      .insert(fresh.map((r) => ({ ...r, user_id })) as never);
    if (error) throw new Error(error.message);
  }
  return { added: fresh.length, skipped: rows.length - fresh.length };
}

export async function deletePyqQuestion(id: string) {
  const { error } = await supabase.from("pyq_questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchMyPyqAttempts(): Promise<PyqAttempt[]> {
  const all: PyqAttempt[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = (unwrap(
      await supabase
        .from("pyq_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1),
    ) ?? []) as PyqAttempt[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

/** One result per question — the most recent non-skipped attempt (attempts sorted newest first). */
export function latestPyqResults(attempts: PyqAttempt[]) {
  const map = new Map<string, PyqAttempt>();
  for (const a of attempts) {
    if (a.skipped) continue;
    if (!map.has(a.question_id)) map.set(a.question_id, a);
  }
  return map;
}

export async function recordPyqAttempt(input: {
  question_id: string;
  selected_index: number | null;
  selected_indices?: number[];
  answer_text?: string | null;
  is_correct: boolean;
  skipped: boolean;
}) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from("pyq_attempts")
    .insert({ selected_indices: [], ...input, user_id } as never);
  if (error) throw new Error(error.message);
}

/** Parses a NAT key: "12.5", "4.0 to 4.2", "4.0 - 4.2", "4.0:4.2", "-3 to -1". */
export function parseNatRange(key: string | null | undefined): [number, number] | null {
  if (!key) return null;
  const s = key.trim().replace(/[–—]/g, "-");
  const num = "(-?\\d+(?:\\.\\d+)?|-?\\.\\d+)";
  const range = s.match(new RegExp(`^${num}\\s*(?:to|:|-)\\s*${num}$`, "i"));
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return [Math.min(a, b), Math.max(a, b)];
  }
  const single = Number(s);
  return Number.isFinite(single) ? [single, single] : null;
}

/** Numeric NAT grading with a tolerance so 12.5 == 12.50 and ranges are honoured. */
export function checkNatAnswer(input: string, key: string | null | undefined) {
  const v = Number(input.trim());
  const r = parseNatRange(key);
  if (!r || !Number.isFinite(v) || input.trim() === "") {
    return !!key && input.trim().toLowerCase() === key.trim().toLowerCase();
  }
  const eps = 1e-6 * Math.max(1, Math.abs(r[0]), Math.abs(r[1]));
  return v >= r[0] - eps && v <= r[1] + eps;
}

function toNumbers(v: unknown): number[] {
  if (Array.isArray(v)) return v.map(Number).filter((n) => Number.isFinite(n));
  if (typeof v === "number") return [v];
  if (typeof v === "string")
    return v
      .split(/[,\s]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .map((x) => (/^[A-F]$/.test(x) ? x.charCodeAt(0) - 64 : Number(x)))
      .filter((n) => Number.isFinite(n));
  return [];
}

/**
 * Bulk import. Correct answers are ALWAYS 1-based (1 = option A) in both formats.
 * JSON: [{ year, paper, subject, topic, qtype, marks, question, options, correct: 3 | [2,4] | "B", answer: "4.0 to 4.2", explanation }]
 * Line: year | subject | topic | question | optA ;; optB ;; optC ;; optD | correct (3, or 2,4) | explanation | marks
 */
export function parsePyqBulk(text: string, fallbackPaper: string): PyqInput[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as Record<string, unknown>[];
    return arr
      .map((r) => {
        const options = Array.isArray(r["options"]) ? (r["options"] as unknown[]).map(String) : [];
        const nums = toNumbers(r["correct"]).filter((n) => n >= 1 && n <= options.length);
        const qtype = String(
          r["qtype"] ?? (!options.length ? "NAT" : nums.length > 1 ? "MSQ" : "MCQ"),
        ).toUpperCase();
        const answer = r["answer"] ?? r["answer_text"];
        return {
          year: Number(r["year"] ?? 2024),
          paper: String(r["paper"] ?? fallbackPaper),
          subject: String(r["subject"] ?? "Algorithms"),
          topic: String(r["topic"] ?? "Untagged"),
          qtype,
          marks: Number(r["marks"] ?? 1) === 2 ? 2 : 1,
          question: String(r["question"] ?? ""),
          options: qtype === "NAT" ? [] : options,
          correct_index: Math.max(0, (nums[0] ?? 1) - 1),
          correct_indices: qtype === "MSQ" ? nums.map((n) => n - 1) : [],
          answer_text: qtype === "NAT" && answer != null ? String(answer) : null,
          explanation: r["explanation"] ? String(r["explanation"]) : null,
        } satisfies PyqInput;
      })
      .filter((r) => r.question.trim().length > 0);
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const p = line.split("|").map((s) => s.trim());
      const options = (p[4] ?? "")
        .split(";;")
        .map((o) => o.trim())
        .filter(Boolean);
      const answerField = p[5] ?? "";
      const nums = options.length
        ? toNumbers(answerField).filter((n) => n >= 1 && n <= options.length)
        : [];
      const isMsq = options.length > 0 && nums.length > 1;
      const qtype = options.length ? (isMsq ? "MSQ" : "MCQ") : "NAT";
      return {
        year: Number(p[0] ?? 2024) || 2024,
        paper: fallbackPaper,
        subject: p[1] || "Algorithms",
        topic: p[2] || "Untagged",
        qtype,
        marks: Number(p[7] ?? 1) === 2 ? 2 : 1,
        question: p[3] ?? "",
        options,
        correct_index: Math.max(0, (nums[0] ?? 1) - 1),
        correct_indices: isMsq ? nums.map((n) => n - 1) : [],
        answer_text: options.length ? null : answerField || null,
        explanation: p[6] || null,
      } satisfies PyqInput;
    })
    .filter((r) => r.question.length > 0);
}
