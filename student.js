(async () => {
const supabaseClient = window.skillUpSupabase;
if (!supabaseClient) {
  window.location.replace("auth.html?mode=login");
  return;
}
const { data: { session } } = await supabaseClient.auth.getSession();
if (!session) {
  window.location.replace("auth.html?mode=login");
  return;
}
const { data: learnerProfile, error: profileError } = await supabaseClient
  .from("profiles")
  .select("role,full_name,email")
  .eq("id", session.user.id)
  .maybeSingle();
if (profileError || !learnerProfile) {
  window.location.replace("auth.html?mode=login");
  return;
}
if (learnerProfile.role === "admin") {
  window.location.replace("admin.html");
  return;
}
if (learnerProfile.role !== "learner") {
  window.location.replace("auth.html?mode=login");
  return;
}
const learnerAuthSession = {
  id: session.user.id,
  email: session.user.email,
  name: learnerProfile.full_name || session.user.user_metadata?.full_name || session.user.email.split("@")[0]
};
const STUDENT_STORAGE_KEY = `skillup-learner-prototype-v1:${learnerAuthSession.email}`;
const learnerContent = document.querySelector("#learner-content");
const learnerSidebar = document.querySelector("#learner-sidebar");
const learnerModal = document.querySelector("#learner-modal-layer");
const learnerModalBody = document.querySelector("#learner-modal-body");
const learnerNav = [...document.querySelectorAll(".learner-nav-item")];
const learnerViews = {
  dashboard: "Overview",
  catalog: "Explore courses",
  learning: "My learning",
  certificates: "Certificates",
  referrals: "Referral programme",
  profile: "Profile & settings"
};
const learnerToday = new Date();
const learnerDay = (offset = 0) => {
  const date = new Date(learnerToday);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const demoCourses = [
  { id: "c-fullstack", title: "Full Stack Development", category: "Development", price: 5000, instructor: "Tunde Adebayo", status: "Published", description: "Build complete websites and web applications with frontend, backend and database skills.", modules: "Web fundamentals\nFrontend foundations\nBackend APIs\nDatabases and deployment", materials: "https://example.com/fullstack-guide.pdf", requirements: "Complete all core modules and submit the portfolio project.", assignments: "Build and deploy a responsive portfolio website.", quizzes: "Web fundamentals quiz\nJavaScript and API quiz", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80", duration: "8 weeks", level: "Beginner friendly" },
  { id: "c-frontend", title: "Frontend Development", category: "Development", price: 5000, instructor: "Ada Okafor", status: "Published", description: "Master HTML, CSS and JavaScript to create beautiful, responsive websites.", modules: "HTML and accessibility\nCSS and responsive layouts\nJavaScript fundamentals\nModern frontend projects", materials: "", requirements: "Complete all core lessons and submit the final website project.", assignments: "Create a responsive product landing page.", quizzes: "HTML and accessibility quiz\nCSS layout quiz", thumbnail: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80", duration: "6 weeks", level: "Beginner friendly" },
  { id: "c-ai", title: "AI Automation", category: "Artificial Intelligence", price: 5000, instructor: "Ifeanyi Okoro", status: "Published", description: "Use AI tools and automation platforms to build intelligent workflows.", modules: "AI foundations\nWorkflow automation\nConnecting business tools\nBuild an automation project", materials: "", requirements: "Submit one working automation and complete the final quiz.", assignments: "Create an automated lead follow-up workflow.", quizzes: "Workflow automation fundamentals", thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80", duration: "5 weeks", level: "All levels" },
  { id: "c-voice", title: "AI Voice Agent", category: "Artificial Intelligence", price: 5000, instructor: "Chika Nwosu", status: "Published", description: "Create voice agents that communicate, help customers and automate conversations.", modules: "Voice AI fundamentals\nConversation design\nAgent integrations\nTesting and deployment", materials: "", requirements: "Build, test and document a working voice-agent prototype.", assignments: "Design a helpful customer-support voice agent.", quizzes: "Voice agent safety and conversation design", thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80", duration: "5 weeks", level: "All levels" },
  { id: "c-vibe", title: "Vibe Coding & Google AdSense", category: "Development", price: 5000, instructor: "Tunde Adebayo", status: "Published", description: "Build digital products with AI-assisted coding and explore website monetization.", modules: "AI-assisted prototyping\nCreate a web product\nContent and publishing\nMonetization basics", materials: "", requirements: "Publish a simple project and complete the monetization knowledge check.", assignments: "Build and publish a small useful website.", quizzes: "Content quality and AdSense policy quiz", thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80", duration: "4 weeks", level: "Beginner friendly" },
  { id: "c-ux", title: "UI/UX Design", category: "Design", price: 5000, instructor: "Ada Okafor", status: "Published", description: "Learn wireframing, prototyping and user-friendly digital product design.", modules: "Design thinking\nResearch and personas\nWireframes and prototypes\nUsability and handoff", materials: "", requirements: "Submit a case study and a clickable prototype.", assignments: "Redesign a familiar mobile app flow.", quizzes: "Accessibility and usability quiz", thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=800&q=80", duration: "6 weeks", level: "All levels" },
  { id: "c-graphics", title: "Graphics Design", category: "Design", price: 5000, instructor: "Zainab Musa", status: "Published", description: "Develop creative skills in branding, social media graphics and visual communication.", modules: "Design fundamentals\nColor and typography\nBranding projects\nSocial media campaigns", materials: "", requirements: "Submit a mini brand kit with three design assets.", assignments: "Design a social media campaign for a local business.", quizzes: "Color, typography and visual hierarchy", thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80", duration: "4 weeks", level: "Beginner friendly" },
  { id: "c-mobile", title: "Mobile App Development", category: "Development", price: 5000, instructor: "Ifeanyi Okoro", status: "Published", description: "Create mobile applications and turn ideas into functional Android and iOS experiences.", modules: "Mobile app foundations\nInterface and navigation\nConnect to APIs\nBuild and test an app", materials: "", requirements: "Complete the core lessons and submit a tested mobile app prototype.", assignments: "Build an app with navigation and one data-driven screen.", quizzes: "Mobile app fundamentals", thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80", duration: "8 weeks", level: "All levels" },
  { id: "c-cybersecurity", title: "Cybersecurity Fundamentals", category: "Cybersecurity", price: 5000, instructor: "Chika Nwosu", status: "Published", description: "Learn ethical, defensive security practices for protecting accounts, networks and digital information.", modules: "Security foundations and ethics\nThreat modeling and risk management\nIdentity, access and network defense\nSecure software and data protection\nIncident response and recovery\nSecurity awareness capstone", materials: "", requirements: "Complete the core lessons and submit a defensive security plan.", assignments: "Create a security awareness and incident response plan for a small organization.", quizzes: "Security foundations and safe practice", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80", duration: "6 weeks", level: "Beginner friendly" }
];
const initialLearnerState = () => ({
  profile: { name: "", email: "", role: "Student / learner", avatar: "", location: "", bio: "", notifications: true },
  courses: [],
  purchases: [],
  enrollmentRequests: [],
  progress: {},
  activities: [],
  sessions: [],
  questions: [],
  announcements: [],
  quizzes: {},
  jobs: [],
  resources: [],
  savedJobs: [],
  referral: { active: false, code: "", registrations: 0, conversions: 0, commission: 0, withdrawals: [], history: [] },
  cart: [],
  announcementsRead: false,
  profileHistory: [],
  messageSentAt: null
});

function escapeLearner(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function readLearnerState() {
  const [
    { data: remoteWorkspace, error: workspaceError },
    { data: remoteCourses, error: coursesError },
    { data: remoteEnrollments, error: enrollmentError },
    { data: remoteEnrollmentRequests, error: enrollmentRequestsError },
    { data: remotePublicContent, error: publicContentError }
  ] = await Promise.all([
    supabaseClient.from("learner_workspaces").select("data").eq("user_id", learnerAuthSession.id).maybeSingle(),
    supabaseClient.from("courses").select("data").eq("status", "Published"),
    supabaseClient.from("enrollments").select("course_id,status,purchased_at,amount,receipt").eq("user_id", learnerAuthSession.id).eq("status", "Successful"),
    supabaseClient.from("enrollment_requests").select("id,course_id,status,requested_at").eq("user_id", learnerAuthSession.id).order("requested_at", { ascending: false }),
    supabaseClient.from("public_content").select("kind,data").eq("status", "Published").in("kind", ["job", "resource", "announcement"])
  ]);
  if (workspaceError) throw workspaceError;
  if (coursesError) throw coursesError;
  if (enrollmentError) throw enrollmentError;
  if (enrollmentRequestsError) throw enrollmentRequestsError;
  if (publicContentError) throw publicContentError;

  const defaults = initialLearnerState();
  let legacyData = null;
  if (!remoteWorkspace) {
    try { legacyData = JSON.parse(localStorage.getItem(STUDENT_STORAGE_KEY) || "null"); } catch { legacyData = null; }
  }
  const source = remoteWorkspace?.data || legacyData || defaults;
  const loaded = Object.fromEntries(Object.keys(defaults).map((key) => [key, source[key] ?? defaults[key]]));
  if (!remoteWorkspace && !legacyData) {
    loaded.purchases = [];
    loaded.progress = {};
    loaded.activities = [];
    loaded.sessions = [];
    loaded.questions = [];
    loaded.quizzes = {};
    loaded.referral = { active: false, code: "", registrations: 0, conversions: 0, commission: 0, withdrawals: [], history: [] };
  }
  loaded.courses = remoteCourses.map((course) => course.data);
  loaded.jobs = remotePublicContent.filter((item) => item.kind === "job").map((item) => item.data);
  loaded.resources = remotePublicContent.filter((item) => item.kind === "resource").map((item) => item.data);
  loaded.announcements = remotePublicContent.filter((item) => item.kind === "announcement").map((item) => item.data);
  loaded.purchases = remoteEnrollments.map((enrollment) => ({
    courseId: enrollment.course_id,
    purchasedAt: enrollment.purchased_at,
    amount: Number(enrollment.amount),
    status: enrollment.status,
    receipt: enrollment.receipt
  }));
  loaded.enrollmentRequests = remoteEnrollmentRequests;
  loaded.profile = {
    ...defaults.profile,
    ...loaded.profile,
    name: loaded.profile?.name || learnerAuthSession.name,
    email: learnerAuthSession.email,
    role: "Student / learner"
  };

  if (!remoteWorkspace) {
    const { error } = await supabaseClient.from("learner_workspaces").upsert({ user_id: learnerAuthSession.id, data: loaded });
    if (error) throw error;
  }
  return loaded;
}

let learnerState;
try {
  learnerState = await readLearnerState();
} catch (error) {
  document.querySelector("#learner-content").innerHTML = `<section class="learner-panel"><div class="learner-panel-body"><h2>Could not connect to Supabase</h2><p>${escapeLearner(error.message || "Check the database schema and project configuration, then reload.")}</p></div></section>`;
  return;
}
let activeLearnerView = "dashboard";
let courseSearch = "";
let courseCategory = "All";
let certificateFocus = "";
let previousModalFocus = null;

let learnerPersistQueue = Promise.resolve();
let persistedLearnerState = JSON.parse(JSON.stringify(learnerState));
let learnerPersistVersion = 0;
function saveLearnerState(mutator, message) {
  mutator();
  const committedState = JSON.parse(JSON.stringify(learnerState));
  const snapshot = JSON.parse(JSON.stringify(learnerState));
  const version = ++learnerPersistVersion;
  delete snapshot.purchases;
  delete snapshot.enrollmentRequests;
  delete snapshot.courses;
  delete snapshot.jobs;
  delete snapshot.resources;
  delete snapshot.announcements;
  learnerPersistQueue = learnerPersistQueue.then(async () => {
    const { error } = await supabaseClient.from("learner_workspaces").upsert({ user_id: learnerAuthSession.id, data: snapshot });
    if (error) throw error;
  }).then(() => {
    persistedLearnerState = committedState;
    if (message) notify(message);
    return true;
  }).catch((error) => {
    if (version === learnerPersistVersion) {
      learnerState = JSON.parse(JSON.stringify(persistedLearnerState));
      renderLearnerView();
    }
    notify(`Supabase could not save this change: ${error.message || "Database request failed."}`, "error");
    return false;
  });
  renderLearnerView();
  return learnerPersistQueue;
}

function notify(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `learner-toast${type === "error" ? " error" : ""}`;
  toast.textContent = message;
  document.querySelector("#learner-toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function learnerMoney(amount) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function learnerDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? escapeLearner(value) : new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function learnerRelativeDate(value) {
  if (!value) return "";
  const difference = Math.round((new Date(`${value}T00:00:00`) - new Date(`${learnerDay()}T00:00:00`)) / 86400000);
  if (difference === 0) return "Today";
  if (difference === -1) return "Yesterday";
  if (difference > 0) return `In ${difference} day${difference === 1 ? "" : "s"}`;
  return `${Math.abs(difference)} days ago`;
}

function learnerAvatar(name, picture = "", className = "") {
  const initials = String(name || "Learner").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  return `<span class="learner-avatar ${className}">${picture ? `<img src="${escapeLearner(picture)}" alt="">` : escapeLearner(initials)}</span>`;
}

function getCourse(id) { return learnerState.courses.find((course) => course.id === id); }
function getProgress(id) { return learnerState.progress[id] || { completedLessons: [], lastLesson: 0, completed: false, assignment: "", feedback: "" }; }
function ownsCourse(id) { return learnerState.purchases.some((purchase) => purchase.courseId === id && purchase.status === "Successful"); }
function progressPercent(id) {
  const course = getCourse(id);
  if (!course) return 0;
  const count = (course.modules || "").split("\n").filter(Boolean).length || 1;
  const state = getProgress(id);
  return state.completed ? 100 : Math.min(99, Math.round((state.completedLessons.length / count) * 100));
}
function purchasedCourses() { return learnerState.purchases.filter((purchase) => purchase.status === "Successful").map((purchase) => getCourse(purchase.courseId)).filter(Boolean); }
function completedCourses() { return purchasedCourses().filter((course) => getProgress(course.id).completed); }
function activeCourses() { return purchasedCourses().filter((course) => !getProgress(course.id).completed); }
function selectedOrFirstOwned() { return getCourse(certificateFocus) || activeCourses()[0] || purchasedCourses()[0]; }

function pageHeading(title, description, actions = "") {
  return `<div class="learner-heading"><div><p class="learner-kicker">YOUR SKILL-UP SPACE</p><h1>${escapeLearner(title)}</h1><p>${description}</p></div><div class="learner-actions">${actions}</div></div>`;
}
function button(label, action, id = "", style = "soft", extra = "") {
  return `<button type="button" class="learner-button learner-button-${style}" data-action="${escapeLearner(action)}" ${id ? `data-id="${escapeLearner(id)}"` : ""} ${extra}>${label}</button>`;
}
function notice(text) {
  return `<div class="learner-notice"><span>ⓘ</span><div>${text}</div></div>`;
}
function badge(text, variant = "") {
  return `<span class="learner-badge${variant ? ` ${variant}` : ""}">${escapeLearner(text)}</span>`;
}
function panel(title, subtitle, content, action = "") {
  return `<section class="learner-panel"><header class="learner-panel-header"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</header><div class="learner-panel-body">${content}</div></section>`;
}
function empty(message, description = "") {
  return `<div class="learner-empty"><strong>${message}</strong>${description}</div>`;
}

function renderSidebarUser() {
  const profile = learnerState.profile;
  document.querySelector("#sidebar-user").innerHTML = `${learnerAvatar(profile.name, profile.avatar)}<div class="learner-user-copy"><strong>${escapeLearner(profile.name)}</strong><small>${escapeLearner(profile.role)}</small></div>`;
  const topAvatar = document.querySelector(".learner-top-avatar");
  topAvatar.innerHTML = profile.avatar ? `<img src="${escapeLearner(profile.avatar)}" alt="">` : escapeLearner(profile.name.split(/\s+/).map((part) => part[0] || "").slice(0, 2).join("").toUpperCase());
  const unread = learnerState.announcementsRead ? "" : `<span class="notification-dot"></span>`;
  document.querySelector(".learner-notification-button").innerHTML = `♧${unread}`;
}

function renderDashboard() {
  const active = activeCourses();
  const completed = completedCourses();
  const allOwned = purchasedCourses();
  const overall = allOwned.length ? Math.round(allOwned.reduce((sum, course) => sum + progressPercent(course.id), 0) / allOwned.length) : 0;
  const activities = learnerState.activities.slice(0, 5).map((item) => `<div class="activity-row"><span class="activity-icon ${escapeLearner(item.tone)}">${escapeLearner(item.icon)}</span><div class="activity-copy"><strong>${escapeLearner(item.title)}</strong><small>${escapeLearner(item.detail)}</small></div><span class="activity-time">${learnerRelativeDate(item.date)}</span></div>`).join("");
  const courseRows = [...active].sort((a, b) => (getProgress(b.id).lastLesson || 0) - (getProgress(a.id).lastLesson || 0)).slice(0, 3).map((course) => `<div class="continue-item"><div class="continue-image"><img src="${escapeLearner(course.thumbnail)}" alt="" loading="lazy"></div><div class="continue-copy"><strong>${escapeLearner(course.title)}</strong><small>By ${escapeLearner(course.instructor)} · ${progressPercent(course.id)}% complete</small><div class="progress-track"><span style="width:${progressPercent(course.id)}%"></span></div></div><button class="learner-button learner-button-soft continue-button" data-action="open-learning-course" data-id="${escapeLearner(course.id)}">Access course</button></div>`).join("");
  const announcements = learnerState.announcements.slice(0, 2).map((item) => `<div class="announcement-row"><span class="activity-icon ${escapeLearner(item.tone)}">✳</span><div><strong>${escapeLearner(item.title)}</strong><p>${escapeLearner(item.body)}</p></div></div>`).join("");
  return `${pageHeading("Your learning overview", `Welcome back, ${escapeLearner(learnerState.profile.name.split(" ")[0])}. Every step counts—keep building your next chapter.`, button("Explore courses ↗", "navigate-catalog", "", "primary"))}
    <section class="welcome-banner"><div class="welcome-copy"><p class="learner-kicker">YOU'RE RIGHT WHERE YOU NEED TO BE</p><h2>Keep going, <span>${escapeLearner(learnerState.profile.name.split(" ")[0])}.</span></h2><p>You have ${active.length} active course${active.length === 1 ? "" : "s"} and an average learning progress of ${overall}%. A little progress adds up.</p></div><div class="welcome-mark" aria-hidden="true">✳</div></section>
    <div class="learner-stats">
      <article class="learner-stat"><div class="learner-stat-top"><span>Purchased courses</span><span class="learner-stat-icon">▤</span></div><strong>${allOwned.length}</strong><small>Access is limited to your purchases</small></article>
      <article class="learner-stat"><div class="learner-stat-top"><span>Active courses</span><span class="learner-stat-icon coral">▷</span></div><strong>${active.length}</strong><small>Keep your momentum going</small></article>
      <article class="learner-stat"><div class="learner-stat-top"><span>Completed courses</span><span class="learner-stat-icon violet">✦</span></div><strong>${completed.length}</strong><small>${completed.filter((course) => getProgress(course.id).certificateId).length} certificate${completed.filter((course) => getProgress(course.id).certificateId).length === 1 ? "" : "s"} earned</small></article>
      <article class="learner-stat"><div class="learner-stat-top"><span>Overall progress</span><span class="learner-stat-icon amber">↗</span></div><strong>${overall}%</strong><small>Across your purchased courses</small></article>
    </div>
    ${panel("Continue learning", "Pick up where you left off", `<div class="continue-list">${courseRows || empty("Your learning space is ready.", "Explore courses and purchase one to begin.")}</div>`, `<button class="learner-link-button" data-view="learning">View all →</button>`)}
    <div class="learner-grid">
      ${panel("Recent activity", "A little progress adds up", `<div class="activity-list">${activities || empty("Your activity will appear here.")}</div>`)}
      ${panel("New announcements", "Updates for your learning journey", `<div class="activity-list">${announcements || empty("You're all caught up.")}</div>`, `<button class="learner-link-button" data-action="announcements">See all →</button>`)}
    </div>
    <div class="learner-grid">${panel("Your learner profile", "Your path, your pace", `<div class="mentor-row">${learnerAvatar(learnerState.profile.name, learnerState.profile.avatar)}<div class="learner-mentor-copy"><strong>${escapeLearner(learnerState.profile.name)}</strong><small>${escapeLearner(learnerState.profile.email)}</small></div>${badge(learnerState.profile.role)}</div><div class="activity-row"><span class="activity-icon violet">✦</span><div class="activity-copy"><strong>${completed.length} course${completed.length === 1 ? "" : "s"} completed</strong><small>Keep growing your skills</small></div><button class="learner-link-button" data-view="profile">Edit</button></div>`)}</div>`;
}

function catalogCard(course) {
  return `<article class="catalog-card"><div class="catalog-image"><img src="${escapeLearner(course.thumbnail)}" alt="" loading="lazy"><span class="catalog-category">${escapeLearner(course.category)}</span></div><div class="catalog-body"><div class="catalog-meta"><span>${escapeLearner(course.level || "All levels")}</span><span class="catalog-rating">✦ 4.9</span></div><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.description)}</p><div class="catalog-meta"><span>${escapeLearner(course.instructor)}</span><span>${escapeLearner(course.duration || "Self-paced")}</span></div><div class="catalog-actions"><button class="learner-link-button" data-action="course-details" data-id="${escapeLearner(course.id)}">Course details</button>${button("Access course", "open-learning-course", course.id, "primary")}</div></div></article>`;
}

function renderCatalog() {
  const available = learnerState.courses.filter((course) => course.status !== "Archived");
  const categories = ["All", ...new Set(available.map((course) => course.category))];
  const visible = available.filter((course) => (course.status === "Published" || ownsCourse(course.id))
    && (courseCategory === "All" || course.category === courseCategory)
    && (`${course.title} ${course.description} ${course.instructor} ${course.category}`.toLowerCase().includes(courseSearch.toLowerCase())));
  return `${pageHeading("Explore courses", "Find a skill that fits your goals. View the curriculum, meet the instructor, and choose where to begin.")}
    <div class="catalog-toolbar"><div class="catalog-filters">${categories.map((category) => `<button class="catalog-filter${courseCategory === category ? " active" : ""}" data-category="${escapeLearner(category)}">${escapeLearner(category)}</button>`).join("")}</div><input class="learner-search" type="search" data-course-search placeholder="Search courses, skills or instructors…" value="${escapeLearner(courseSearch)}" aria-label="Search courses"></div>
    <div class="catalog-grid">${visible.map(catalogCard).join("") || empty("No courses found.", "Try another search or category.")}</div>`;
}

function courseDetails(course) {
  const modules = (course.modules || "").split("\n").filter(Boolean);
  const materials = (course.materials || "").split("\n").filter(Boolean);
  openLearnerModal(course.title, `<div class="course-detail-hero"><img src="${escapeLearner(course.thumbnail)}" alt=""><div class="course-detail-overlay"><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.category)} · ${escapeLearner(course.level || "All levels")} · ${escapeLearner(course.duration || "Self-paced")}</p></div></div><div class="detail-sections"><div class="learner-detail-box"><h3>About this course</h3><p>${escapeLearner(course.description)}</p></div><div class="learner-detail-box"><h3>Instructor</h3><p>${escapeLearner(course.instructor)}<br>SKILL-UP course instructor</p></div><div class="learner-detail-box"><h3>Course curriculum</h3><ul>${modules.map((item) => `<li>${escapeLearner(item)}</li>`).join("") || "<li>Curriculum coming soon.</li>"}</ul></div><div class="learner-detail-box"><h3>Requirements & completion</h3><p>${escapeLearner(course.requirements || "No prerequisites listed.")}</p></div><div class="learner-detail-box"><h3>Assignments & quizzes</h3><p><strong>Assignment:</strong> ${escapeLearner(course.assignments || "To be announced.")}<br><strong>Quizzes:</strong> ${escapeLearner(course.quizzes || "To be announced.")}</p></div><div class="learner-detail-box"><h3>Learning resources</h3><p>${materials.map((item) => `<a href="${escapeLearner(item)}" target="_blank" rel="noopener noreferrer">Open learning material ↗</a>`).join("<br>") || "Materials are shared in the lessons."}</p></div></div><div class="modal-actions"><button class="learner-button learner-button-soft" data-close-learner-modal>Close</button><button class="learner-button learner-button-primary" data-action="open-learning-course" data-id="${escapeLearner(course.id)}">Access course syllabus →</button></div>`);
}

function renderLearning() {
  const purchased = purchasedCourses();
  const rows = purchased.map((course) => {
    const complete = getProgress(course.id).completed;
    const progress = progressPercent(course.id);
    return `<article class="learning-card"><div class="learning-card-image"><img src="${escapeLearner(course.thumbnail)}" alt="" loading="lazy"><span>${complete ? "COURSE COMPLETED" : "YOUR NEXT LESSON IS READY"}</span></div><div class="learning-card-body"><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.instructor)} · ${escapeLearner(course.duration || "Self-paced")} · Purchased ${learnerDate(learnerState.purchases.find((purchase) => purchase.courseId === course.id)?.purchasedAt)}</p><div class="learning-progress-header"><span>${complete ? "Completed" : "Course progress"}</span><strong>${progress}%</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><div class="learning-footer">${complete ? button("Course outline", "open-learning-course", course.id) : `<span class="muted">Last lesson: ${escapeLearner((course.modules || "").split("\n")[getProgress(course.id).lastLesson] || "Start learning")}</span>`}${button("Access course", "open-learning-course", course.id, "primary")}</div></div></article>`;
  }).join("");
  return `${pageHeading("My learning", "Your learning area is limited to courses with a successful purchase in your account.", button("Find another course", "navigate-catalog", "", "soft"))}
    <div class="learner-stats"><article class="learner-stat"><div class="learner-stat-top"><span>Purchased courses</span><span class="learner-stat-icon">▤</span></div><strong>${purchased.length}</strong><small>Your personal learning library</small></article><article class="learner-stat"><div class="learner-stat-top"><span>In progress</span><span class="learner-stat-icon coral">▷</span></div><strong>${activeCourses().length}</strong><small>Pick up where you left off</small></article><article class="learner-stat"><div class="learner-stat-top"><span>Completed</span><span class="learner-stat-icon violet">✦</span></div><strong>${completedCourses().length}</strong><small>Celebrate your progress</small></article><article class="learner-stat"><div class="learner-stat-top"><span>Lessons completed</span><span class="learner-stat-icon amber">✓</span></div><strong>${Object.values(learnerState.progress).reduce((sum, progress) => sum + (progress.completedLessons || []).length, 0)}</strong><small>Keep up the great work</small></article></div>
    <div class="learning-layout"><div class="lesson-list">${rows || `<section class="learner-panel">${empty("Your course library is empty.", "Browse the catalogue and request enrollment. An administrator will verify payment before granting access.")}</section>`}</div><div>${panel("Course resources", "Helpful links for your studies", `<div class="resource-list">${learnerState.resources.slice(0, 3).map((resource) => `<div class="resource-row"><span class="activity-icon violet">▧</span><div class="activity-copy"><strong>${escapeLearner(resource.title)}</strong><small>${escapeLearner(resource.category)}</small></div><a class="learner-link-button" href="${escapeLearner(resource.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a></div>`).join("") || empty("No resources added.")}</div>`)}</div></div>`;
}

function openLearningCourse(id) {
  const course = getCourse(id);
  if (!course) { notify("This course is not available.", "error"); return; }
  certificateFocus = id;
  activeLearnerView = "course";
  renderLearnerView();
}

function renderCourseRoom() {
  const course = getCourse(certificateFocus);
  if (!course) {
    activeLearnerView = "learning";
    return renderLearning();
  }
  const progress = getProgress(course.id);
  const owned = ownsCourse(course.id);
  const lessons = (course.modules || "").split("\n").filter(Boolean);
  const rows = lessons.map((lesson, index) => {
    const completed = owned && progress.completedLessons.includes(index);
    const current = progress.lastLesson === index && !completed;
    return `<div class="lesson-row"><span class="lesson-play">${completed ? "✓" : "▷"}</span><div class="lesson-details"><strong>${escapeLearner(lesson)}</strong><small>Lesson ${index + 1} · ${owned ? current ? "Continue here" : completed ? "Completed" : "Learning material coming soon" : "Syllabus preview"}</small></div>${owned ? `<button class="lesson-complete" type="button" aria-pressed="${completed}" aria-label="${completed ? "Mark lesson incomplete" : "Mark lesson complete"}" data-action="toggle-lesson" data-id="${escapeLearner(course.id)}" data-lesson="${index}">${completed ? "✓" : ""}</button>` : `<span class="lesson-complete" aria-hidden="true">•</span>`}</div>`;
  }).join("");
  const materialLinks = (course.materials || "").split("\n").filter(Boolean).map((link) => `<a class="learner-button learner-button-soft" href="${escapeLearner(link)}" target="_blank" rel="noopener noreferrer">Open course material ↗</a>`).join(" ");
  const percentage = progressPercent(course.id);
  return `${pageHeading(course.title, `${escapeLearner(course.instructor)} · Course syllabus and learning resources`, `<button class="learner-button learner-button-soft" data-action="navigate-learning">← My courses</button>`)}
    ${owned ? notice("<strong>Purchased course access.</strong> Track lesson progress and use the course resources below.") : notice("<strong>Syllabus preview.</strong> You can review the course curriculum. Lesson tracking, assignments and quizzes require course enrollment.")}
    <div class="learning-layout"><section class="learner-panel"><header class="learner-panel-header"><div><h2>Course syllabus</h2><p>${lessons.length} lessons${owned ? " · mark a lesson complete to track your progress" : " · preview only"}</p></div>${owned ? `<strong>${percentage}%</strong>` : ""}</header><div class="learner-panel-body">${owned ? `<div class="learner-progress-header"><span>Course completion</span><strong>${percentage}%</strong></div><div class="progress-track"><span style="width:${percentage}%"></span></div>` : ""}<div class="lesson-list" style="margin-top:13px">${rows || empty("Course curriculum is being prepared.")}</div><div class="learner-detail-box" style="margin-top:12px"><h3>Learning materials</h3><p>${owned ? materialLinks || "No downloadable materials attached to this course yet." : "Course materials are available to enrolled learners."}</p></div><div class="learner-detail-box" style="margin-top:10px"><h3>Completion requirement</h3><p>${escapeLearner(course.requirements || "Complete all lessons and submit the final project.")}</p></div></div></section><div>${owned ? panel("Your next steps", "Practice what you learn", `<div class="detail-block"><h3>Assignment</h3><p>${escapeLearner(course.assignments || "No assignment published yet.")}</p><div style="margin-top:8px">${button("Submit assignment", "assignment", course.id, "soft")}</div></div><div class="detail-block"><h3>Knowledge check</h3><p>${escapeLearner((course.quizzes || "Course fundamentals").split("\n")[0])}</p><div style="margin-top:8px">${button(learnerState.quizzes[course.id] === undefined ? "Take practice quiz" : `Best score: ${learnerState.quizzes[course.id]}%`, "quiz", course.id, "soft")}</div></div>${progress.completed ? `<div class="detail-block"><h3>Certificate earned</h3><p>Your course completion is recorded. Open certificates to view and share it.</p><div style="margin-top:8px">${button("View certificate", "navigate-certificates", "", "lime")}</div></div>` : ""}`) : panel("Course access", "Your syllabus preview", `<p class="muted">This course outline is available to all learners. Enrollment unlocks progress tracking, lessons, assignments and quizzes.</p>`)}</div></div>`;
}

function updateCourseProgress(id, lessonIndex, markCompleted) {
  if (!ownsCourse(id)) { notify("Purchase this course to update lesson progress.", "error"); return; }
  const course = getCourse(id);
  const lessonCount = (course?.modules || "").split("\n").filter(Boolean).length;
  if (lessonIndex < 0 || lessonIndex >= lessonCount) return;
  saveLearnerState(() => {
    if (!learnerState.progress[id]) learnerState.progress[id] = getProgress(id);
    const progress = learnerState.progress[id];
    const completed = new Set(progress.completedLessons);
    if (markCompleted) completed.add(lessonIndex);
    else completed.delete(lessonIndex);
    progress.completedLessons = [...completed].sort((a, b) => a - b);
    progress.lastLesson = Math.min(lessonCount - 1, lessonIndex + (markCompleted ? 1 : 0));
    if (progress.completedLessons.length === lessonCount && lessonCount > 0) {
      progress.completed = true;
      progress.certificateId ||= `SKILLUP-${learnerToday.getFullYear()}-${id.replace("c-", "").toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      progress.feedback ||= "Congratulations on completing your course.";
      learnerState.activities.unshift({ icon: "✦", tone: "amber", title: "Course completed", detail: course.title, date: learnerDay() });
    } else {
      progress.completed = false;
    }
  }, markCompleted ? "Lesson progress saved." : "Lesson marked incomplete.");
}

function renderMentorship() {
  const sessions = learnerState.sessions.map((session) => `<div class="mentorship-history-row"><strong>${escapeLearner(session.title)} · ${escapeLearner(session.type)}</strong><small>${escapeLearner(session.mentor)}${session.courseId ? ` · ${escapeLearner(getCourse(session.courseId)?.title || "Course")}` : ""} · ${learnerDate(session.date)} at ${escapeLearner(session.time)} · ${escapeLearner(session.status)}</small>${session.link && session.status === "Scheduled" ? `<div style="margin-top:7px"><a class="learner-button learner-button-primary" href="${escapeLearner(session.link)}" target="_blank" rel="noopener noreferrer">Join session ↗</a></div>` : ""}</div>`).join("");
  const questions = learnerState.questions.map((question) => `<div class="mentorship-history-row"><strong>${escapeLearner(question.title)}</strong><small>${escapeLearner(getCourse(question.courseId)?.title || "Course")} · ${learnerDate(question.date)} · ${escapeLearner(question.status)}</small>${question.answer ? `<p style="margin:7px 0 0;color:#77857e;font-size:12px;line-height:1.6">Mentor feedback: ${escapeLearner(question.answer)}</p>` : ""}</div>`).join("");
  const instructors = [...new Set(learnerState.courses.map((course) => course.instructor).filter(Boolean))];
  const supportOptions = [...instructors, "Group training"];
  return `${pageHeading("Mentorship & support", "Book time with a mentor, join available training, and get feedback as you learn.")}
    ${notice("Session requests and course questions are saved to Supabase and appear in the admin mentorship workspace. Email or real-time mentor notifications are not configured.")}
    <div class="learner-grid"><section class="learner-panel"><header class="learner-panel-header"><div><h2>Course instructors</h2><p>Request support from an instructor listed on your courses</p></div></header><div class="learner-panel-body"><div class="mentor-list">${instructors.map((name) => `<div class="mentor-row"><span class="learner-avatar">${escapeLearner(name.split(/\s+/).map((part) => part[0] || "").slice(0, 2).join("").toUpperCase())}</span><div class="learner-mentor-copy"><strong>${escapeLearner(name)}</strong><small>Course instructor</small></div></div>`).join("") || empty("Instructor details appear when courses are published.")}</div><form data-learner-form="booking" style="margin-top:15px"><div class="mentorship-booking"><div class="learner-field full"><label for="booking-title">What would you like help with?</label><input id="booking-title" name="title" required placeholder="e.g. Review my portfolio project"></div><div class="learner-field"><label for="booking-mentor">Instructor / programme</label><select id="booking-mentor" name="mentor">${supportOptions.map((item) => `<option>${escapeLearner(item)}</option>`).join("")}</select></div><div class="learner-field"><label for="booking-course">Related course</label><select id="booking-course" name="courseId">${purchasedCourses().map((course) => `<option value="${escapeLearner(course.id)}">${escapeLearner(course.title)}</option>`).join("")}</select></div><div class="learner-field"><label for="booking-date">Preferred date</label><input id="booking-date" name="date" type="date" min="${learnerDay()}" required></div><div class="learner-field"><label for="booking-time">Preferred time</label><input id="booking-time" name="time" type="time" value="14:00" required></div></div><button class="learner-button learner-button-primary" type="submit">Request session ↗</button></form></div></section>
    ${panel("Your mentorship sessions", "Upcoming bookings and learning history", `<div class="activity-list">${sessions || empty("No sessions booked yet.", "Use the form to request a mentorship session.")}</div>`)}
    </div><div class="learner-grid">${panel("Ask a mentor", "Share a question about a purchased course", `<form data-learner-form="question"><div class="learner-field"><label for="question-course">Course</label><select id="question-course" name="courseId" required>${purchasedCourses().map((course) => `<option value="${escapeLearner(course.id)}">${escapeLearner(course.title)}</option>`).join("")}</select></div><div class="learner-field"><label for="question-text">Your question</label><textarea id="question-text" name="title" required placeholder="Tell us what you are working through…"></textarea></div><button class="learner-button learner-button-primary" type="submit">Send question</button></form>`, "")}
    ${panel("Questions & feedback", "A record of your recent support", `<div class="activity-list">${questions || empty("No questions yet.")}</div>`)}</div>`;
}

function verificationURL(certificateId) {
  const url = new URL("student.html", window.location.href);
  url.searchParams.set("certificate", certificateId);
  return url.href;
}

function renderCertificates() {
  const completed = completedCourses();
  const eligible = completed.filter((course) => getProgress(course.id).certificateId);
  const completedList = completed.map((course) => {
    const progress = getProgress(course.id);
    const id = progress.certificateId || "Completion record";
    return `<article class="certificate-tile"><span class="certificate-seal">✦</span>${badge(progress.certificateId ? "Certificate ready" : "Completed", "certificate-eligible")}<h3>${escapeLearner(course.title)}</h3><p>Completed ${learnerDate(learnerState.purchases.find((purchase) => purchase.courseId === course.id)?.purchasedAt)} · Instructor ${escapeLearner(course.instructor)}</p><div class="job-card-actions">${progress.certificateId ? `<span class="muted">${escapeLearner(id)}</span>${button("View certificate", "view-certificate", course.id, "soft")}` : `<span class="muted">Certificate requirements pending review</span>`}</div></article>`;
  }).join("");
  const certificateQuery = new URLSearchParams(location.search).get("certificate");
  const verify = certificateQuery ? findCertificate(certificateQuery) : null;
  return `${pageHeading("Certificates", "Celebrate the skills you've built. Certificates are available after your course completion criteria are met.")}
    ${notice("Certificates in this preview are sample learner records. A public verification service and official downloadable certificate are not connected.")}
    ${certificateQuery ? `<div class="learner-panel" style="margin-bottom:14px"><div class="learner-panel-body"><strong>${verify ? "Certificate record found" : "Certificate not found"}</strong><p class="muted">${verify ? `${escapeLearner(verify.course.title)} · ${escapeLearner(verify.id)} · Learner: ${escapeLearner(learnerState.profile.name)}` : "This verification code does not match the sample learner records in this browser."}</p></div></div>` : ""}
    <div class="learner-stats"><article class="learner-stat"><div class="learner-stat-top"><span>Certificates earned</span><span class="learner-stat-icon amber">✦</span></div><strong>${eligible.length}</strong><small>Courses completed and eligible</small></article><article class="learner-stat"><div class="learner-stat-top"><span>Courses completed</span><span class="learner-stat-icon violet">✓</span></div><strong>${completed.length}</strong><small>See your learning achievements</small></article></div>
    <div class="certificate-grid">${completedList || empty("Your first certificate is waiting.", "Complete a purchased course and its requirements to see your certificates here.")}</div>
    <section class="learner-panel" style="margin-top:14px"><header class="learner-panel-header"><div><h2>Certificate eligibility</h2><p>Only completed, purchased courses are considered</p></div></header><div class="learner-panel-body"><div class="activity-list">${purchasedCourses().filter((course) => !getProgress(course.id).completed).map((course) => `<div class="activity-row"><span class="activity-icon violet">▷</span><div class="activity-copy"><strong>${escapeLearner(course.title)}</strong><small>${progressPercent(course.id)}% complete · ${escapeLearner(course.requirements)}</small></div><button class="learner-link-button" data-action="open-learning-course" data-id="${escapeLearner(course.id)}">Continue</button></div>`).join("") || empty("No unfinished purchased courses.")}</div></div></section>`;
}

function findCertificate(certificateId) {
  const course = learnerState.courses.find((item) => getProgress(item.id).certificateId === certificateId);
  return course ? { course, id: certificateId } : null;
}

function renderCareers() {
  const jobs = learnerState.jobs.map((job) => {
    const saved = learnerState.savedJobs.includes(job.id);
    return `<article class="job-card"><div class="job-card-top"><span class="job-company-icon">${escapeLearner(job.company.slice(0, 1))}</span>${job.verified ? badge("Verified listing") : badge("External listing · unverified", "external")}</div><h3>${escapeLearner(job.title)}</h3><p>${escapeLearner(job.company)}</p><div class="job-tags"><span>${escapeLearner(job.type)}</span><span>${escapeLearner(job.location)}</span></div><div class="job-card-actions">${button(saved ? "♥ Saved" : "♡ Save", "toggle-save-job", job.id, "soft")}<a class="learner-button learner-button-primary" href="${escapeLearner(job.link)}" target="_blank" rel="noopener noreferrer">View listing ↗</a></div></article>`;
  }).join("");
  const resources = learnerState.resources.map((resource) => `<article class="resource-card"><span class="resource-icon">▧</span><h3>${escapeLearner(resource.title)}</h3><p>${escapeLearner(resource.category)} · Career preparation resource</p><div class="job-card-actions"><span class="muted">Resource guide</span><a class="learner-button learner-button-soft" href="${escapeLearner(resource.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a></div></article>`).join("");
  return `${pageHeading("Career opportunities", "Explore listings and build the career skills to help you take your next step.")}
    ${notice("<strong>Opportunities are illustrative demo listings.</strong> Verify each vacancy and application link independently. Employment is not guaranteed. External listings are clearly marked.")}
    <div class="learner-grid">${panel("Build your professional profile", "Career-ready foundations", `<div class="activity-list"><div class="activity-row"><span class="activity-icon">✓</span><div class="activity-copy"><strong>Professional profile</strong><small>${escapeLearner(learnerState.profile.name)} · ${escapeLearner(learnerState.profile.location || "Add your location")}</small></div>${button("Update", "navigate-profile", "", "soft")}</div><div class="activity-row"><span class="activity-icon violet">▤</span><div class="activity-copy"><strong>CV and portfolio resources</strong><small>${learnerState.resources.length} career guides available</small></div>${button("Explore", "scroll-resources", "", "soft")}</div><div class="activity-row"><span class="activity-icon amber">◎</span><div class="activity-copy"><strong>Interview preparation</strong><small>Practice communicating your skills clearly</small></div>${button("View guide", "open-resource", learnerState.resources.find((resource) => resource.category === "Interview preparation")?.id || "", "soft")}</div></div>`)}
    ${panel("Your saved opportunities", "A short list for your next application", `<div class="activity-list">${learnerState.jobs.filter((job) => learnerState.savedJobs.includes(job.id)).map((job) => `<div class="activity-row"><span class="activity-icon coral">♥</span><div class="activity-copy"><strong>${escapeLearner(job.title)}</strong><small>${escapeLearner(job.company)}</small></div><a class="learner-link-button" href="${escapeLearner(job.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a></div>`).join("") || empty("No saved opportunities yet.")}</div>`)}</div>
    <h2 class="section-title">Opportunities to explore</h2><div class="job-grid">${jobs || empty("No opportunities available.")}</div>
    <h2 class="section-title" id="career-resources">Career resources</h2><div class="resource-grid">${resources || empty("No resources available.")}</div>`;
}

function renderReferrals() {
  const referral = learnerState.referral;
  const history = referral.history.map((item) => `<div class="activity-row"><span class="activity-icon violet">${item.conversion ? "✓" : "↗"}</span><div class="activity-copy"><strong>${escapeLearner(item.name || "New referral")}</strong><small>${escapeLearner(item.description || "Joined using your referral link")} · ${learnerDate(item.date)}</small></div><span class="activity-time">${item.conversion ? "Purchase" : "Registration"}</span></div>`).join("");
  const withdrawals = referral.withdrawals.map((item) => `<div class="activity-row"><span class="activity-icon amber">◷</span><div class="activity-copy"><strong>Withdrawal request · ${learnerMoney(item.amount)}</strong><small>Requested ${learnerDate(item.date)} · ${escapeLearner(item.method)}</small></div>${badge(item.status, item.status === "Pending" ? "pending" : "")}</div>`).join("");
  if (!referral.active) {
    return `${pageHeading("Referral programme", "As a learner, you can also share SKILL-UP with friends and track eligible referrals.")}
      ${notice("Referral registrations, conversions, commissions and withdrawal requests are demo records. A production referral programme needs server-side purchase verification and payout controls.")}
      <div class="welcome-banner"><div class="welcome-copy"><p class="learner-kicker">LEARN, SHARE & GROW TOGETHER</p><h2>Invite friends to <span>skill up.</span></h2><p>Activate your referral preview to receive a personal demo code, track local activity and see how a referral dashboard could work.</p></div><div class="welcome-mark">↗</div></div>
      <div class="learner-grid">${panel("How the referral programme works", "A simple way to share what you're learning", `<div class="activity-list"><div class="activity-row"><span class="activity-icon">1</span><div class="activity-copy"><strong>Activate your referral account</strong><small>Generate your unique sample referral code.</small></div></div><div class="activity-row"><span class="activity-icon violet">2</span><div class="activity-copy"><strong>Share your referral link</strong><small>Invite friends to create an account on SKILL-UP.</small></div></div><div class="activity-row"><span class="activity-icon amber">3</span><div class="activity-copy"><strong>Track eligible referrals</strong><small>Successful qualifying purchases may earn a commission once verified.</small></div></div></div><div style="margin-top:12px">${button("Activate referral preview", "activate-referral", "", "primary")}</div>`)}
      ${panel("A note about rewards", "Referral activity is not a guaranteed income", `<p style="color:#7b8982;font-size:12px;line-height:1.7">Referral amounts and purchases shown in this prototype are fictional. Real commissions should only be calculated from verified successful transactions under the programme's published terms. Withdrawal requests need identity review and secure payment processing.</p>`)}</div>`;
  }
  return `${pageHeading("Your referral space", "Share your personal demo link and keep track of your referral activity.", button("Request withdrawal", "request-withdrawal", "", "primary"))}
    ${notice("This referral dashboard is part of your learner account. Referral totals are local demo values and not verified income. No payout will be sent.")}
    <div class="referral-banner"><div><h2>Good skills are worth sharing.</h2><p>Your demo partner code is ready. Share it with your network and encourage friends to explore a course.</p></div><div class="referral-code-box"><span>${escapeLearner(referral.code)}</span><button data-action="copy-referral">Copy link</button></div></div>
    <div class="referral-stats"><div class="referral-stat"><span>Registrations</span><strong>${referral.registrations}</strong></div><div class="referral-stat"><span>Course purchases</span><strong>${referral.conversions}</strong></div><div class="referral-stat"><span>Demo commission</span><strong>${learnerMoney(referral.commission)}</strong></div><div class="referral-stat"><span>Pending withdrawal</span><strong>${learnerMoney(referral.withdrawals.filter((item) => item.status === "Pending").reduce((sum, item) => sum + item.amount, 0))}</strong></div></div>
    <div class="learner-grid">${panel("Referral activity", "Sample registrations and qualifying purchases", `<div class="activity-list">${history || empty("Your referral activity will appear here.", "Share your link to get started.")}</div>`)}
    ${panel("Withdrawal requests", "Local request history", `<div class="activity-list">${withdrawals || empty("No withdrawal requests yet.")}</div>`)}</div>`;
}

function renderProfile() {
  const profile = learnerState.profile;
  const purchases = learnerState.purchases.filter((purchase) => purchase.status === "Successful").map((purchase) => `<div class="activity-row"><span class="activity-icon">▤</span><div class="activity-copy"><strong>${escapeLearner(getCourse(purchase.courseId)?.title || "Course")}</strong><small>${learnerDate(purchase.purchasedAt)} · ${escapeLearner(purchase.receipt)}</small></div><strong>${learnerMoney(purchase.amount)}</strong></div>`).join("");
  return `${pageHeading("Profile & settings", "Manage your learner profile, notification preference and course purchase history.", button("Sign out", "sign-out", "", "soft"))}
    <div class="account-profile"><aside class="profile-card"><div class="profile-photo">${profile.avatar ? `<img src="${escapeLearner(profile.avatar)}" alt="Profile photo">` : escapeLearner(profile.name.split(/\s+/).map((item) => item[0] || "").slice(0, 2).join("").toUpperCase())}</div><h2>${escapeLearner(profile.name)}</h2><p>${escapeLearner(profile.email)}</p>${badge(profile.role)}<div><label class="learner-button learner-button-soft" for="avatar-upload">Upload profile photo</label><input id="avatar-upload" type="file" accept="image/*" hidden></div><div class="profile-save">${button("Activate referral account", "navigate-referrals", "", "soft")}</div></aside>
    <section class="profile-edit-card"><h2>Personal information</h2><p>Update your profile and preferences for this device.</p><form data-learner-form="profile"><div class="profile-edit-grid"><div class="learner-field"><label for="profile-name">Full name</label><input id="profile-name" name="name" required minlength="2" value="${escapeLearner(profile.name)}"></div><div class="learner-field"><label for="profile-email">Sign-in email</label><input id="profile-email" name="email" readonly type="email" value="${escapeLearner(profile.email)}"></div><div class="learner-field"><label for="profile-location">Location</label><input id="profile-location" name="location" value="${escapeLearner(profile.location || "")}" placeholder="City, country"></div><div class="learner-field"><label for="profile-role">Account type</label><input id="profile-role" value="${escapeLearner(profile.role)}" readonly></div><div class="learner-field full"><label for="profile-bio">About you</label><textarea id="profile-bio" name="bio" maxlength="240">${escapeLearner(profile.bio || "")}</textarea></div></div><div class="security-row"><div><strong>Email notifications</strong><small>Receive learning and mentorship updates on this profile</small></div><input type="checkbox" name="notifications" ${profile.notifications ? "checked" : ""} aria-label="Email notifications"></div><div class="modal-actions"><button class="learner-button learner-button-primary" type="submit">Save profile</button></div></form>
    <div class="security-row"><div><strong>Password & account security</strong><small>Supabase Auth manages your password; this app never stores it in the database.</small></div>${button("Password help", "password-help", "", "soft")}</div>
    </section></div>
    <section class="learner-panel" style="margin-top:14px"><header class="learner-panel-header"><div><h2>Purchase history</h2><p>Course orders in your local demo account</p></div><button class="learner-link-button" data-action="export-purchases">Download CSV ↓</button></header><div class="learner-panel-body"><div class="activity-list">${purchases || empty("No course purchases recorded.")}</div></div></section>`;
}

function findLearnerCertificate(id) {
  for (const course of learnerState.courses) {
    const progress = getProgress(course.id);
    if (progress.completed && progress.certificateId === id) return { course, progress, id };
  }
  return null;
}

function renderLearnerView() {
  document.querySelector("#learner-current-page").textContent = learnerViews[activeLearnerView] || "Course lessons";
  learnerNav.forEach((item) => {
    const active = item.dataset.view === activeLearnerView || (activeLearnerView === "course" && item.dataset.view === "learning");
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  renderSidebarUser();
  const renderer = {
    dashboard: renderDashboard,
    catalog: renderCatalog,
    learning: renderLearning,
    course: renderCourseRoom,
    certificates: renderCertificates,
    referrals: renderReferrals,
    profile: renderProfile
  }[activeLearnerView];
  if (!renderer) {
    activeLearnerView = "dashboard";
    learnerContent.innerHTML = renderDashboard();
    return;
  }
  learnerContent.innerHTML = renderer();
}

function navigateLearner(view) {
  if (!learnerViews[view] && view !== "course") return;
  activeLearnerView = view;
  learnerSidebar.classList.remove("open");
  document.querySelector(".learner-menu-toggle").setAttribute("aria-expanded", "false");
  renderLearnerView();
  learnerContent.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openLearnerModal(title, content) {
  previousModalFocus = document.activeElement;
  document.querySelector("#learner-modal-title").textContent = title;
  learnerModalBody.innerHTML = content;
  learnerModal.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => learnerModalBody.querySelector("input,select,textarea,button")?.focus(), 0);
}

function closeLearnerModal() {
  learnerModal.hidden = true;
  document.body.style.overflow = "";
  learnerModalBody.replaceChildren();
  previousModalFocus?.focus?.();
}

function addActivity(icon, tone, title, detail) {
  learnerState.activities.unshift({ icon, tone, title, detail, date: learnerDay() });
  learnerState.activities = learnerState.activities.slice(0, 30);
}

function addToCart(courseId) {
  const course = getCourse(courseId);
  if (!course || (course.status !== "Published" && !ownsCourse(course.id))) { notify("This course is not currently available.", "error"); return; }
  if (ownsCourse(courseId)) { notify("This course is already in your learning library."); closeLearnerModal(); return; }
  if (!learnerState.cart.includes(courseId)) saveLearnerState(() => { learnerState.cart.push(courseId); }, `${course.title} added to your basket.`);
  closeLearnerModal();
  if (activeLearnerView === "catalog") renderLearnerView();
}

function checkoutModal() {
  const cartCourses = learnerState.cart.map(getCourse).filter((course) => course && !ownsCourse(course.id));
  const pendingIds = new Set(learnerState.enrollmentRequests.filter((request) => request.status === "Pending").map((request) => request.course_id));
  const cartRows = cartCourses.map((course) => `<div class="activity-row"><div class="activity-copy"><strong>${escapeLearner(course.title)}</strong><small>${learnerMoney(course.price)}</small></div>${pendingIds.has(course.id) ? badge("Request pending", "pending") : button("Remove", "remove-cart", course.id)}</div>`).join("");
  const requestRows = learnerState.enrollmentRequests.slice(0, 5).map((request) => {
    const course = getCourse(request.course_id);
    return `<div class="activity-row"><div class="activity-copy"><strong>${escapeLearner(course?.title || "Course")}</strong><small>Requested ${learnerDate(request.requested_at?.slice(0, 10))}</small></div>${badge(request.status, request.status === "Pending" ? "pending" : "")}</div>`;
  }).join("");
  openLearnerModal("Course enrollment", `<div class="learner-notice"><span>ⓘ</span><div>This sends an enrollment request to the administrators. Course access is granted only after they verify payment and approve it. Online payment is not connected.</div></div><h3 class="section-title">Your basket</h3><div class="activity-list">${cartRows || empty("Your basket is empty.")}</div><div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Close</button><button class="learner-button learner-button-primary" type="button" data-action="request-enrollment"${cartCourses.some((course) => !pendingIds.has(course.id)) ? "" : " disabled"}>Request enrollment</button></div><h3 class="section-title">Request history</h3><div class="activity-list">${requestRows || empty("No enrollment requests yet.")}</div>`);
}

function assignmentModal(course) {
  const progress = getProgress(course.id);
  openLearnerModal("Submit a course assignment", `<div class="learner-detail-box"><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.assignments || "Share your work with your instructor for feedback.")}</p></div><form data-learner-form="assignment" data-id="${escapeLearner(course.id)}"><div class="learner-field" style="margin-top:12px"><label for="assignment-link">Project link or submission notes</label><textarea id="assignment-link" name="submission" minlength="5" required placeholder="Paste a project link or describe your submission…">${escapeLearner(progress.assignment)}</textarea></div><div class="learner-notice"><span>ⓘ</span><div>Submission is saved locally and will not be sent to a mentor in this preview.</div></div><div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Cancel</button><button class="learner-button learner-button-primary" type="submit">Save demo submission</button></div></form>${progress.feedback ? `<div class="learner-detail-box" style="margin-top:12px"><h3>Instructor feedback</h3><p>${escapeLearner(progress.feedback)}</p></div>` : ""}`);
}

function quizModal(course) {
  const previous = learnerState.quizzes[course.id];
  openLearnerModal("Course knowledge check", `<div class="learner-detail-box"><h3>${escapeLearner(course.title)}</h3><p>Practice question · your answer and score stay in this browser preview.</p></div><form data-learner-form="quiz" data-id="${escapeLearner(course.id)}"><p style="margin:14px 0 8px;color:#41584e;font-size:12px;font-weight:700">What is a good next step when you get stuck building a project?</p><label class="quiz-option"><input name="answer" type="radio" value="ask" required> Break the problem down, test one idea, and ask for feedback.</label><label class="quiz-option"><input name="answer" type="radio" value="skip"> Skip every challenge and copy an unrelated solution.</label><label class="quiz-option"><input name="answer" type="radio" value="stop"> Stop learning the skill altogether.</label>${previous !== undefined ? `<div class="learner-notice" style="margin-top:10px"><span>✦</span><div>Your saved practice score: <strong>${previous}%</strong>. Try again whenever you're ready.</div></div>` : ""}<div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Close</button><button class="learner-button learner-button-primary" type="submit">Check answer</button></div></form>`);
}

function showAnnouncements() {
  saveLearnerState(() => { learnerState.announcementsRead = true; }, "");
  const rows = learnerState.announcements.map((item) => `<div class="announcement-row"><span class="activity-icon ${escapeLearner(item.tone)}">✳</span><div><strong>${escapeLearner(item.title)}</strong><p>${escapeLearner(item.body)} · ${learnerDate(item.date)}</p></div></div>`).join("");
  openLearnerModal("Learning announcements", `<div class="activity-list">${rows || empty("No announcements yet.")}</div>`);
}

function exportPurchases() {
  const rows = [["Course", "Purchased on", "Amount NGN", "Status", "Receipt"], ...learnerState.purchases.map((purchase) => [getCourse(purchase.courseId)?.title || "Course", purchase.purchasedAt, purchase.amount, purchase.status, purchase.receipt])];
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob(["\ufeff", rows.map((row) => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "skill-up-demo-purchase-history.csv";
  link.click();
  URL.revokeObjectURL(url);
  notify("Demo purchase history downloaded.");
}

async function handleLearnerAction(action, id, element) {
  const course = getCourse(id);
  switch (action) {
    case "navigate-catalog": closeLearnerModal(); navigateLearner("catalog"); break;
    case "navigate-learning": closeLearnerModal(); navigateLearner("learning"); break;
    case "navigate-certificates": closeLearnerModal(); navigateLearner("certificates"); break;
    case "navigate-profile": navigateLearner("profile"); break;
    case "navigate-referrals": navigateLearner("referrals"); break;
    case "open-learning-course": closeLearnerModal(); openLearningCourse(id); break;
    case "course-details": if (course) courseDetails(course); break;
    case "add-to-cart": addToCart(id); break;
    case "open-cart": checkoutModal(); break;
    case "remove-cart":
      saveLearnerState(() => { learnerState.cart = learnerState.cart.filter((item) => item !== id); }, "Course removed from basket.");
      checkoutModal();
      break;
    case "request-enrollment": {
      const pendingIds = new Set(learnerState.enrollmentRequests.filter((request) => request.status === "Pending").map((request) => request.course_id));
      const requestedCourses = learnerState.cart.map(getCourse).filter((item) => item && !ownsCourse(item.id) && !pendingIds.has(item.id));
      if (!requestedCourses.length) {
        notify("Add a course to your basket before requesting enrollment.", "error");
        return;
      }
      const { data: requests, error } = await supabaseClient.from("enrollment_requests").insert(
        requestedCourses.map((item) => ({ user_id: learnerAuthSession.id, course_id: item.id }))
      ).select("id,course_id,status,requested_at");
      if (error) {
        notify(error.code === "23505" ? "An enrollment request for one of these courses is already pending." : `Could not submit your enrollment request: ${error.message}`, "error");
        return;
      }
      learnerState.enrollmentRequests = [...requests, ...learnerState.enrollmentRequests];
      saveLearnerState(() => {
        learnerState.cart = learnerState.cart.filter((courseId) => !requestedCourses.some((item) => item.id === courseId));
        addActivity("▤", "violet", "Enrollment requested", requestedCourses.map((item) => item.title).join(", "));
      }, "");
      closeLearnerModal();
      notify("Enrollment request sent. An administrator will verify payment before granting course access.");
      break;
    }
    case "toggle-lesson": updateCourseProgress(id, Number(element.dataset.lesson), element.getAttribute("aria-pressed") !== "true"); break;
    case "assignment": if (course && ownsCourse(id)) assignmentModal(course); else notify("Purchase this course to submit its assignment.", "error"); break;
    case "quiz": if (course && ownsCourse(id)) quizModal(course); else notify("Purchase this course to access quizzes.", "error"); break;
    case "announcements": showAnnouncements(); break;
    case "activate-referral": {
      const code = `SKILL-${learnerState.profile.name.split(/\s+/)[0].replace(/[^a-z]/gi, "").toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      saveLearnerState(() => { learnerState.referral.active = true; learnerState.referral.code = code; }, "Referral preview activated.");
      break;
    }
    case "copy-referral": {
      const url = new URL("auth.html", window.location.href);
      url.searchParams.set("mode", "signup");
      url.searchParams.set("ref", learnerState.referral.code);
      navigator.clipboard?.writeText(url.href).then(() => notify("Demo referral link copied.")).catch(() => notify(`Demo referral code: ${learnerState.referral.code}`));
      break;
    }
    case "request-withdrawal": {
      if (!learnerState.referral.active) { notify("Activate the referral preview first.", "error"); return; }
      openLearnerModal("Request a demo withdrawal", `<div class="learner-notice"><span>ⓘ</span><div>No payout will be made. Withdrawal requests are for local interface preview only.</div></div><div class="learner-field"><label for="withdrawal-amount">Request amount (demo balance ${learnerMoney(learnerState.referral.commission)})</label><input id="withdrawal-amount" name="amount" type="number" min="1" max="${Math.max(1, learnerState.referral.commission)}" value="${Math.min(learnerState.referral.commission, 5000)}"></div><div class="learner-field"><label for="withdrawal-method">Payout method</label><select id="withdrawal-method"><option>Bank transfer · demo</option><option>Mobile wallet · demo</option></select></div><div class="modal-actions"><button class="learner-button learner-button-soft" data-close-learner-modal>Cancel</button><button class="learner-button learner-button-primary" data-action="submit-withdrawal">Submit demo request</button></div>`);
      break;
    }
    case "submit-withdrawal": {
      const amount = Number(document.querySelector("#withdrawal-amount").value);
      if (!Number.isFinite(amount) || amount <= 0 || amount > learnerState.referral.commission) { notify("Enter a valid amount within your demo commission balance.", "error"); return; }
      saveLearnerState(() => { learnerState.referral.withdrawals.unshift({ id: `WDR-${Date.now()}`, amount, date: learnerDay(), method: document.querySelector("#withdrawal-method").value, status: "Pending" }); }, "Demo withdrawal request recorded. No funds were sent.");
      closeLearnerModal();
      break;
    }
    case "toggle-save-job":
      saveLearnerState(() => { learnerState.savedJobs = learnerState.savedJobs.includes(id) ? learnerState.savedJobs.filter((jobId) => jobId !== id) : [...learnerState.savedJobs, id]; }, learnerState.savedJobs.includes(id) ? "Opportunity removed from saved list." : "Opportunity saved.");
      break;
    case "job-details": {
      const job = learnerState.jobs.find((item) => item.id === id);
      if (job) openLearnerModal("Opportunity details", `<div class="detail-sections"><div class="learner-detail-box"><h3>Role</h3><p>${escapeLearner(job.title)}</p></div><div class="learner-detail-box"><h3>Organization</h3><p>${escapeLearner(job.company)}</p></div><div class="learner-detail-box"><h3>Work arrangement</h3><p>${escapeLearner(job.type)} · ${escapeLearner(job.location)}</p></div><div class="learner-detail-box"><h3>Verification</h3><p>${job.verified ? "Sample listing marked verified." : "External listing · independently verify the organization and link."}</p></div></div><div class="learner-notice" style="margin-top:11px"><span>ⓘ</span><div>This is a sample opportunity. Confirm the vacancy is genuine before sharing personal information or applying.</div></div><div class="modal-actions"><button class="learner-button learner-button-soft" data-close-learner-modal>Close</button><a class="learner-button learner-button-primary" href="${escapeLearner(job.link)}" target="_blank" rel="noopener noreferrer">Open application link ↗</a></div>`);
      break;
    }
    case "scroll-resources": document.querySelector("#career-resources")?.scrollIntoView({ behavior: "smooth" }); break;
    case "open-resource": {
      const resource = learnerState.resources.find((item) => item.id === id);
      if (resource) window.open(resource.link, "_blank", "noopener,noreferrer");
      break;
    }
    case "save-certificate": case "view-certificate": {
      const certificateCourse = getCourse(id);
      const progress = certificateCourse && getProgress(id);
      if (!certificateCourse || !ownsCourse(id) || !progress.completed || !progress.certificateId) { notify("Complete this purchased course to unlock its certificate.", "error"); return; }
      openCertificate(certificateCourse, progress);
      break;
    }
    case "download-certificate": downloadCertificate(id); break;
    case "share-certificate": shareCertificate(id); break;
    case "password-help":
      supabaseClient.auth.resetPasswordForEmail(learnerAuthSession.email, { redirectTo: `${window.location.origin}/auth.html` })
        .then(({ error }) => error ? notify(`Could not send the reset email: ${error.message}`, "error") : notify("If email delivery is configured, a password reset link is on its way."));
      break;
    case "export-purchases": exportPurchases(); break;
    case "sign-out":
      await supabaseClient.auth.signOut();
      window.location.replace("auth.html?mode=login");
      break;
    default: break;
  }
}

function openCertificate(course, progress) {
  const verifyURL = verificationURL(progress.certificateId);
  openLearnerModal("Course certificate", `<div class="certificate-tile" style="text-align:center;padding:25px"><span class="certificate-seal" style="margin-inline:auto">✦</span><p style="letter-spacing:1px;font-size:12px;font-weight:700;color:#9a8b48">CERTIFICATE OF COMPLETION</p><h3 style="font-size:17px">Awarded to ${escapeLearner(learnerState.profile.name)}</h3><p>For successfully completing<br><strong>${escapeLearner(course.title)}</strong></p><p>Instructor: ${escapeLearner(course.instructor)} · ${learnerDate(learnerDay())}</p><p>Verification code: <strong>${escapeLearner(progress.certificateId)}</strong></p></div><div class="learner-notice" style="margin-top:10px"><span>ⓘ</span><div>This certificate preview is a local record, not an official credential. Verification only works in this browser.</div></div><div class="modal-actions"><button class="learner-button learner-button-soft" data-action="share-certificate" data-id="${escapeLearner(course.id)}">Copy verification link</button><button class="learner-button learner-button-primary" data-action="download-certificate" data-id="${escapeLearner(course.id)}">Download certificate</button></div>`);
}

function downloadCertificate(courseId) {
  const course = getCourse(courseId);
  const progress = course && getProgress(courseId);
  if (!course || !progress.completed || !progress.certificateId) return;
  const text = `SKILL-UP CERTIFICATE OF COMPLETION\n\nAwarded to: ${learnerState.profile.name}\nCourse: ${course.title}\nInstructor: ${course.instructor}\nCompleted: ${learnerDate(learnerDay())}\nVerification code: ${progress.certificateId}\n\nLOCAL DEMO PREVIEW — not an official credential.`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-demo-certificate.txt`;
  link.click();
  URL.revokeObjectURL(url);
  notify("Demo certificate file downloaded.");
}

function shareCertificate(courseId) {
  const course = getCourse(courseId);
  const progress = course && getProgress(courseId);
  if (!course || !progress.certificateId) return;
  const url = verificationURL(progress.certificateId);
  navigator.clipboard?.writeText(url).then(() => notify("Local verification link copied.")).catch(() => notify(url, "error"));
}

learnerNav.forEach((item) => item.addEventListener("click", () => navigateLearner(item.dataset.view)));
learnerContent.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { navigateLearner(viewButton.dataset.view); return; }
  const category = event.target.closest("[data-category]");
  if (category) { courseCategory = category.dataset.category; renderLearnerView(); return; }
  const actionElement = event.target.closest("[data-action]");
  if (actionElement) handleLearnerAction(actionElement.dataset.action, actionElement.dataset.id, actionElement);
});
learnerContent.addEventListener("input", (event) => {
  if (event.target.matches("[data-course-search]")) {
    courseSearch = event.target.value;
    const cursor = event.target.selectionStart;
    renderLearnerView();
    const replacement = learnerContent.querySelector("[data-course-search]");
    replacement?.focus();
    replacement?.setSelectionRange(cursor, cursor);
  }
});
learnerModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-learner-modal]")) closeLearnerModal();
  const actionElement = event.target.closest("[data-action]");
  if (actionElement) handleLearnerAction(actionElement.dataset.action, actionElement.dataset.id, actionElement);
});
document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-learner-form]");
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form).entries());
  const kind = form.dataset.learnerForm;
  const courseId = form.dataset.id;
  if (kind === "booking") {
    if (!values.title.trim() || !values.date || !values.time || new Date(`${values.date}T${values.time}`) < new Date()) { notify("Choose a topic and a future date and time for the session request.", "error"); return; }
    saveLearnerState(() => {
      learnerState.sessions.unshift({ id: `LEARN-MNT-${Date.now()}`, title: values.title.trim(), mentor: values.mentor, courseId: values.courseId, date: values.date, time: values.time, type: values.mentor === "Group training" ? "Live training" : "1:1 mentorship", status: "Scheduled", link: "" });
      addActivity("↗", "violet", "Mentorship session requested", values.title.trim());
    }, "Session request saved to Supabase and sent to the admin mentorship queue.");
    closeLearnerModal();
    return;
  }
  if (kind === "question") {
    if (!ownsCourse(values.courseId)) { notify("Select a purchased course before asking for course support.", "error"); return; }
    if (!values.title.trim() || values.title.trim().length < 5) { notify("Please enter a little more detail about your question.", "error"); return; }
    saveLearnerState(() => {
      learnerState.questions.unshift({ id: `Q-${Date.now()}`, title: values.title.trim(), courseId: values.courseId, date: learnerDay(), status: "Pending response", answer: "" });
      addActivity("?", "violet", "Question saved", getCourse(values.courseId)?.title || "Course support");
    }, "Your question was saved to Supabase and added to the support queue.");
    renderLearnerView();
    return;
  }
  if (kind === "assignment") {
    if (!ownsCourse(courseId) || !values.submission.trim() || values.submission.trim().length < 5) { notify("Submit a link or at least five characters of project notes.", "error"); return; }
    saveLearnerState(() => {
      learnerState.progress[courseId] ||= getProgress(courseId);
      learnerState.progress[courseId].assignment = values.submission.trim();
      learnerState.progress[courseId].assignmentDate = learnerDay();
      learnerState.progress[courseId].feedback ||= "";
      addActivity("▤", "coral", "Assignment submitted", getCourse(courseId)?.title || "Course");
    }, "Assignment saved to Supabase and added to the instructor review queue.");
    closeLearnerModal();
    return;
  }
  if (kind === "quiz") {
    const score = values.answer === "ask" ? 100 : 0;
    saveLearnerState(() => { learnerState.quizzes[courseId] = score; addActivity(score ? "✓" : "↗", score ? "" : "coral", "Practice quiz completed", `${getCourse(courseId)?.title || "Course"} · ${score}%`); }, `Practice quiz submitted. Demo score: ${score}%.`);
    closeLearnerModal();
    if (activeLearnerView === "course") renderLearnerView();
    return;
  }
  if (kind === "profile") {
    const email = values.email.trim();
    if (!values.name.trim() || values.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify("Enter a name and a valid email address.", "error"); return; }
    const previousName = learnerAuthSession.name;
    const updatedName = values.name.trim();
    const { error: profileError } = await supabaseClient.from("profiles").update({ full_name: updatedName }).eq("id", learnerAuthSession.id);
    if (profileError) {
      notify(`Could not update your Supabase profile name: ${profileError.message}`, "error");
      return;
    }
    learnerAuthSession.name = updatedName;
    const saved = await saveLearnerState(() => {
      learnerState.profile.name = values.name.trim();
      learnerState.profile.email = email;
      learnerState.profile.location = values.location.trim();
      learnerState.profile.bio = values.bio.trim();
      learnerState.profile.notifications = form.querySelector('[name="notifications"]').checked;
    }, "");
    if (saved) {
      notify("Learner profile saved to Supabase.");
    } else {
      learnerAuthSession.name = previousName;
      const { error: rollbackError } = await supabaseClient.from("profiles").update({ full_name: previousName }).eq("id", learnerAuthSession.id);
      if (rollbackError) notify(`The workspace save failed, and the profile name could not be restored: ${rollbackError.message}`, "error");
    }
    return;
  }
});

learnerContent.addEventListener("change", (event) => {
  if (event.target.id !== "avatar-upload") return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 600 * 1024) { notify("Choose an image under 600 KB.", "error"); event.target.value = ""; return; }
  const reader = new FileReader();
  reader.addEventListener("load", () => saveLearnerState(() => { learnerState.profile.avatar = String(reader.result); }, "Profile photo saved to Supabase."));
  reader.addEventListener("error", () => notify("The selected image could not be read.", "error"));
  reader.readAsDataURL(file);
});

document.querySelector(".learner-menu-toggle").addEventListener("click", (event) => {
  const open = learnerSidebar.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
  event.currentTarget.setAttribute("aria-label", open ? "Close learner navigation" : "Open learner navigation");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !learnerModal.hidden) closeLearnerModal();
  if (event.key === "Escape") learnerSidebar.classList.remove("open");
});

const certificateQuery = new URLSearchParams(window.location.search).get("certificate");
if (certificateQuery) {
  const found = findLearnerCertificate(certificateQuery);
  activeLearnerView = "certificates";
  if (!found) window.setTimeout(() => notify("This verification code does not match a completed course in the local preview.", "error"), 100);
}
renderLearnerView();
})();
