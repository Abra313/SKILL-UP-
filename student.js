(async () => {
const currentUser = await window.skillUpAuth.requireRole("learner");
if (!currentUser) return;
const supabaseClient = window.skillUpSupabase;
const LEARNER_ID = currentUser.id;
const COURSE_INSTRUCTOR = "Skill Up Hub Team";
const COURSE_ACCESS_PRICE_NGN = 5000;
const ALL_COURSES_PRICE_NGN = 25000;
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
const initialLearnerState = () => ({
  profile: { name: "", email: "", role: "Student / learner", avatar: "", location: "", bio: "", notifications: true },
  courses: [],
  purchases: [],
  enrollments: [],
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
  cart: [],
  announcementsRead: false,
  profileHistory: [],
  messageSentAt: null
});
const defaultPrivacyPreferences = {
  product_email: false,
  marketing_email: false,
  sms_notifications: false,
  whatsapp_notifications: false,
  analytics_cookies: false,
  third_party_sharing: false
};
const securityCenter = {
  preferences: { ...defaultPrivacyPreferences },
  requests: [],
  factors: [],
  session: null,
  loaded: false,
  loading: false,
  error: "",
  realtimeError: "",
  mfaError: "",
  pendingFactor: null,
  channel: null
};
const referralCenter = {
  summary: null,
  loading: false,
  error: "",
  realtimeError: "",
  channel: null,
  promise: null
};
let securityLoadPromise = null;

function escapeLearner(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function validMentorshipProgram(program) {
  if (!program || program.status !== "Published" || !program.title || !program.flyer) return false;
  try {
    const joinUrl = new URL(program.joinLink);
    return joinUrl.protocol === "https:" && !joinUrl.username && !joinUrl.password
      && /^data:image\/(?:jpeg|png|webp);base64,/i.test(program.flyer);
  } catch {
    return false;
  }
}

function readLearnerState(source, publicWorkspace) {
  const defaults = initialLearnerState();
  source ||= defaults;
  const loaded = Object.fromEntries(Object.keys(defaults).map((key) => [key, source[key] ?? defaults[key]]));
  const publishedCourses = (publicWorkspace?.courses || [])
    .filter((course) => course.status === "Published")
    .map((course) => ({
      ...window.skillUpCourseUtils.normalizeCourse(course),
      price: COURSE_ACCESS_PRICE_NGN,
      instructor: COURSE_INSTRUCTOR
    }));
  loaded.courses = publicWorkspace?.catalogInitialized
    ? publishedCourses
    : publishedCourses.length
      ? publishedCourses
      : (window.skillUpAICourses || []).map((course) => ({
        ...window.skillUpCourseUtils.normalizeCourse(course),
        price: 5000,
        instructor: COURSE_INSTRUCTOR,
        status: "Published",
        enrolled: 0,
        completion: 0,
        thumbnail: course.thumbnail,
        banner: "",
        materials: "",
        requirements: "Complete the course modules and submit the final project.",
        assignments: "Create a practical project that applies the skills from this course.",
        quizzes: "Course fundamentals"
      }));
  loaded.jobs = (publicWorkspace?.jobs || []).filter((item) => item.status === "Published");
  loaded.resources = (publicWorkspace?.resources || []).filter((item) => item.status === "Published");
  loaded.announcements = (publicWorkspace?.announcements || []).filter((item) => item.status === "Published");
  loaded.mentorshipProgram = validMentorshipProgram(publicWorkspace?.mentorshipProgram)
    ? publicWorkspace.mentorshipProgram
    : null;
  loaded.profile = {
    ...defaults.profile,
    ...loaded.profile,
    name: currentUser.name,
    email: currentUser.email,
    role: "Learner"
  };
  return loaded;
}
let learnerState;
let courseAccess = [];
let courseBundleAccess = null;
try {
  const [publicWorkspace, learnerWorkspace, savedCourseAccess, savedBundleAccess] = await Promise.all([
    supabaseClient.loadWorkspace("public"),
    supabaseClient.loadWorkspace(`learner:${currentUser.id}`),
    supabaseClient.loadCourseAccess(),
    supabaseClient.loadCourseBundleAccess()
  ]);
  learnerState = readLearnerState(learnerWorkspace, publicWorkspace);
  courseAccess = savedCourseAccess;
  courseBundleAccess = savedBundleAccess;
  if (!learnerWorkspace) {
    const snapshot = { ...learnerState };
    delete snapshot.courses;
    delete snapshot.jobs;
    delete snapshot.resources;
    delete snapshot.announcements;
    delete snapshot.mentorshipProgram;
    await supabaseClient.saveWorkspace(`learner:${currentUser.id}`, snapshot);
  }
} catch (error) {
  document.querySelector("#learner-content").innerHTML = `<section class="learner-panel"><div class="learner-panel-body"><h2>Could not load account data</h2><p>${escapeLearner(error.message || "Check your connection and try again.")}</p></div></section>`;
  return;
}
let activeLearnerView = "dashboard";
let courseSearch = "";
let courseCategory = "All";
let billingCourseId = "";
let certificateFocus = "";
let previousModalFocus = null;

let persistedLearnerState = JSON.parse(JSON.stringify(learnerState));
async function saveLearnerState(mutator, message) {
  mutator();
  const snapshot = JSON.parse(JSON.stringify(learnerState));
  delete snapshot.courses;
  delete snapshot.jobs;
  delete snapshot.resources;
  delete snapshot.announcements;
  delete snapshot.mentorshipProgram;
  try {
    await supabaseClient.saveWorkspace(`learner:${currentUser.id}`, snapshot);
    persistedLearnerState = JSON.parse(JSON.stringify(learnerState));
    if (message) notify(`${message} Synced with your account.`);
    renderLearnerView();
    return true;
  } catch (error) {
    learnerState = persistedLearnerState;
    renderLearnerView();
    notify(`Could not sync this change with your account: ${error.message}`, "error");
    return false;
  }
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
function ownsCourse(id) {
  return courseBundleAccess?.status === "active" || courseAccess.some((access) =>
    access.course_id === id && access.status === "active"
  );
}
function progressPercent(id) {
  const course = getCourse(id);
  if (!course) return 0;
  const count = (course.modules || "").split("\n").filter(Boolean).length || 1;
  const state = getProgress(id);
  return state.completed ? 100 : Math.min(99, Math.round((state.completedLessons.length / count) * 100));
}
function enrolledCourses() {
  const courseIds = new Set(courseAccess
    .filter((access) => access.status === "active")
    .map((access) => access.course_id));
  return [...courseIds].map(getCourse).filter(Boolean);
}
function completedCourses() { return enrolledCourses().filter((course) => getProgress(course.id).completed); }
function activeCourses() { return enrolledCourses().filter((course) => !getProgress(course.id).completed); }
function selectedOrFirstOwned() { return getCourse(certificateFocus) || activeCourses()[0] || enrolledCourses()[0]; }

function pageHeading(title, description, actions = "") {
  return `<div class="learner-heading"><div><p class="learner-kicker">YOUR SKILL UP HUB SPACE</p><h1>${escapeLearner(title)}</h1><p>${description}</p></div><div class="learner-actions">${actions}</div></div>`;
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
  topAvatar.setAttribute("aria-label", `Open profile for ${profile.name}`);
  const unread = learnerState.announcementsRead ? "" : `<span class="notification-dot"></span>`;
  document.querySelector('[data-action="announcements"]').innerHTML = `♧${unread}`;
}

function renderDashboard() {
  const active = activeCourses();
  const completed = completedCourses();
  const allOwned = enrolledCourses();
  const overall = allOwned.length ? Math.round(allOwned.reduce((sum, course) => sum + progressPercent(course.id), 0) / allOwned.length) : 0;
  const activities = learnerState.activities.slice(0, 5).map((item) => `<div class="activity-row"><span class="activity-icon ${escapeLearner(item.tone)}">${escapeLearner(item.icon)}</span><div class="activity-copy"><strong>${escapeLearner(item.title)}</strong><small>${escapeLearner(item.detail)}</small></div><span class="activity-time">${learnerRelativeDate(item.date)}</span></div>`).join("");
  const courseRows = [...active].sort((a, b) => (getProgress(b.id).lastLesson || 0) - (getProgress(a.id).lastLesson || 0)).slice(0, 3).map((course) => `<div class="continue-item"><div class="continue-image"><img src="${escapeLearner(course.thumbnail)}" alt="" loading="lazy"></div><div class="continue-copy"><strong>${escapeLearner(course.title)}</strong><small>By ${escapeLearner(course.instructor)} · ${progressPercent(course.id)}% complete</small><div class="progress-track"><span style="width:${progressPercent(course.id)}%"></span></div></div><button class="learner-button learner-button-soft continue-button" data-action="open-learning-course" data-id="${escapeLearner(course.id)}">Access course</button></div>`).join("");
  const announcements = learnerState.announcements.slice(0, 2).map((item) => `<div class="announcement-row"><span class="activity-icon ${escapeLearner(item.tone)}">✳</span><div><strong>${escapeLearner(item.title)}</strong><p>${escapeLearner(item.body)}</p></div></div>`).join("");
  const mentorshipProgram = learnerState.mentorshipProgram;
  const mentorshipCard = mentorshipProgram ? `<section class="mentorship-feature" aria-label="Mentorship programme"><img class="mentorship-feature-flyer" src="${escapeLearner(mentorshipProgram.flyer)}" alt="${escapeLearner(mentorshipProgram.title)} flyer"><div class="mentorship-feature-copy"><span class="learner-kicker">MENTORSHIP PROGRAMME</span><h2>${escapeLearner(mentorshipProgram.title)}</h2>${mentorshipProgram.description ? `<p>${escapeLearner(mentorshipProgram.description)}</p>` : ""}</div><a class="learner-button learner-button-primary mentorship-feature-join" href="${escapeLearner(mentorshipProgram.joinLink)}" target="_blank" rel="noopener noreferrer">JOIN NOW</a></section>` : "";
  return `${pageHeading("Your learning overview", `Welcome back, ${escapeLearner(learnerState.profile.name.split(" ")[0])}. Every step counts—keep building your next chapter.`, button("Explore courses ↗", "navigate-catalog", "", "primary"))}
    <section class="welcome-banner"><div class="welcome-copy"><p class="learner-kicker">YOU'RE RIGHT WHERE YOU NEED TO BE</p><h2>Keep going, <span>${escapeLearner(learnerState.profile.name.split(" ")[0])}.</span></h2><p>You have ${active.length} active course${active.length === 1 ? "" : "s"} and an average learning progress of ${overall}%. A little progress adds up.</p></div><div class="welcome-mark" aria-hidden="true">✳</div></section>
    ${mentorshipCard}
    <div class="learner-stats">
      <article class="learner-stat"><div class="learner-stat-top"><span>Enrolled courses</span><span class="learner-stat-icon">▤</span></div><strong>${allOwned.length}</strong><small>Your personal learning library</small></article>
      <article class="learner-stat"><div class="learner-stat-top"><span>Active courses</span><span class="learner-stat-icon coral">▷</span></div><strong>${active.length}</strong><small>Keep your momentum going</small></article>
      <article class="learner-stat"><div class="learner-stat-top"><span>Completed courses</span><span class="learner-stat-icon violet">✦</span></div><strong>${completed.length}</strong><small>${completed.filter((course) => getProgress(course.id).certificateId).length} certificate${completed.filter((course) => getProgress(course.id).certificateId).length === 1 ? "" : "s"} earned</small></article>
      <article class="learner-stat"><div class="learner-stat-top"><span>Overall progress</span><span class="learner-stat-icon amber">↗</span></div><strong>${overall}%</strong><small>Across your enrolled courses</small></article>
    </div>
    ${panel("Continue learning", "Pick up where you left off", `<div class="continue-list">${courseRows || empty("Your learning space is ready.", "Explore courses and purchase one to begin.")}</div>`, `<button class="learner-link-button" data-view="learning">View all →</button>`)}
    <div class="learner-grid">
      ${panel("Recent activity", "A little progress adds up", `<div class="activity-list">${activities || empty("Your activity will appear here.")}</div>`)}
      ${panel("New announcements", "Updates for your learning journey", `<div class="activity-list">${announcements || empty("You're all caught up.")}</div>`, `<button class="learner-link-button" data-action="announcements">See all →</button>`)}
    </div>
    <div class="learner-grid">${panel("Your learner profile", "Your path, your pace", `<div class="mentor-row">${learnerAvatar(learnerState.profile.name, learnerState.profile.avatar)}<div class="learner-mentor-copy"><strong>${escapeLearner(learnerState.profile.name)}</strong><small>${escapeLearner(learnerState.profile.email)}</small></div>${badge(learnerState.profile.role)}</div><div class="activity-row"><span class="activity-icon violet">✦</span><div class="activity-copy"><strong>${completed.length} course${completed.length === 1 ? "" : "s"} completed</strong><small>Keep growing your skills</small></div><button class="learner-link-button" data-view="profile">Edit</button></div>`)}</div>`;
}

function catalogCard(course) {
  const objectives = (course.objectives || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const modules = (course.modules || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const intro = course.introduction || course.description || "Course introduction coming soon.";
  const outline = `<details class="catalog-preview"><summary>Preview syllabus <span>${objectives.length} objectives · ${modules.length} modules</span></summary><div class="catalog-preview-content"><h4>Learning objectives</h4>${objectives.length ? `<ul>${objectives.map((item) => `<li>${escapeLearner(item)}</li>`).join("")}</ul>` : `<p>Learning objectives coming soon.</p>`}<h4>Course modules</h4>${modules.length ? `<ol>${modules.map((item) => `<li>${escapeLearner(item)}</li>`).join("")}</ol>` : `<p>Course modules coming soon.</p>`}</div></details>`;
  return `<article class="catalog-card"><div class="catalog-image"><img src="${escapeLearner(course.thumbnail)}" alt="" loading="lazy"><span class="catalog-category">${escapeLearner(course.category)}</span></div><div class="catalog-body"><div class="catalog-meta"><span>${escapeLearner(course.level || "All levels")}</span><span class="catalog-rating">✦ 4.9</span></div><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.description)}</p><div class="catalog-introduction"><strong>Introduction</strong><p>${escapeLearner(intro)}</p></div>${outline}<div class="catalog-meta"><span>${escapeLearner(course.instructor)}</span><span>${escapeLearner(course.duration || "Self-paced")}</span></div><div class="catalog-actions"><button class="learner-link-button" data-action="course-details" data-id="${escapeLearner(course.id)}">Course details</button>${button(ownsCourse(course.id) ? "Continue learning" : "Start free module 1", "open-learning-course", course.id, "primary")}</div></div></article>`;
}

function renderCatalog() {
  const available = learnerState.courses.filter((course) => course.status !== "Archived");
  const categories = ["All", ...new Set(available.map((course) => course.category))];
  const publishedCourses = available.filter((course) => course.status === "Published");
  const publishedCount = publishedCourses.length;
  const visible = available.filter((course) => (course.status === "Published" || ownsCourse(course.id))
    && (courseCategory === "All" || course.category === courseCategory)
    && (`${course.title} ${course.description} ${course.introduction} ${course.objectives} ${course.modules} ${course.instructor} ${course.category}`.toLowerCase().includes(courseSearch.toLowerCase())));
  const bundleNotice = courseBundleAccess?.status === "active"
    ? notice("<strong>You have all-course access.</strong> Your library includes every published course.")
    : "";
  return `${pageHeading("Explore courses", `${publishedCount} published courses to explore. Find a skill that fits your goals, view the curriculum, and choose where to begin.`)}
    ${bundleNotice}${renderCatalogBilling(publishedCourses)}<div class="catalog-toolbar"><div class="catalog-filters">${categories.map((category) => `<button class="catalog-filter${courseCategory === category ? " active" : ""}" data-category="${escapeLearner(category)}">${escapeLearner(category)}</button>`).join("")}</div><input class="learner-search" type="search" data-course-search placeholder="Search courses, skills or instructors…" value="${escapeLearner(courseSearch)}" aria-label="Search courses"></div>
    <div class="catalog-grid">${visible.map(catalogCard).join("") || empty("No courses found.", "Try another search or category.")}</div>`;
}

function renderCatalogBilling(publishedCourses) {
  if (courseBundleAccess?.status === "active" || !publishedCourses.length) return "";
  const payableCourses = publishedCourses.filter((course) => !ownsCourse(course.id)
    && String(course.modules || "").split(/\r?\n/).map((module) => module.trim()).filter(Boolean).length > 1);
  const selectedCourse = payableCourses.find((course) => course.id === billingCourseId) || payableCourses[0];
  billingCourseId = selectedCourse?.id || "";
  const courseOptions = payableCourses.map((course) =>
    `<option value="${escapeLearner(course.id)}"${course.id === billingCourseId ? " selected" : ""}>${escapeLearner(course.title)}</option>`
  ).join("");
  const singleCoursePlan = payableCourses.length
    ? `<article class="course-plan-card"><span class="course-plan-tag">SINGLE COURSE</span><h3>Build skills in one subject</h3><p class="course-plan-summary">Get complete access to one course and all its learning materials.</p><div class="course-plan-price"><strong>${learnerMoney(COURSE_ACCESS_PRICE_NGN)}</strong><span>one-time</span></div><label class="course-plan-select-label" for="billing-course-select">Choose a course</label><select class="course-plan-select" id="billing-course-select" data-billing-course>${courseOptions}</select><ul class="course-plan-benefits"><li>Every module and lesson</li><li>Videos, PDFs and course resources</li><li>Assignments, quizzes and progress tracking</li></ul>${button("Continue with this course", "pay-selected-course", "", "primary")}</article>`
    : "";
  return `<section class="learner-panel course-purchase-panel catalog-billing"><header class="course-purchase-header"><div><span class="learner-kicker">COURSE ACCESS</span><h2>Choose how you want to learn</h2><p>Compare the plans and select the access that works for you. All payments are one-time.</p></div><span class="course-payment-secure">Secure checkout</span></header><div class="learner-panel-body"><div class="course-plan-grid${singleCoursePlan ? "" : " course-plan-grid-single"}">${singleCoursePlan}<article class="course-plan-card course-plan-featured"><span class="course-plan-recommendation">BEST VALUE</span><span class="course-plan-tag">ALL-COURSE ACCESS</span><h3>Learn across the catalog</h3><p class="course-plan-summary">A single plan for learners ready to explore more topics.</p><div class="course-plan-price"><strong>${learnerMoney(ALL_COURSES_PRICE_NGN)}</strong><span>one-time</span></div><ul class="course-plan-benefits"><li>Access to all published courses</li><li>Full course materials and activities</li><li>One payment, no recurring fees</li></ul>${button("Choose all-course access", "pay-all-courses", "", "primary")}</article></div></div></section>`;
}

function courseDetails(course) {
  const objectives = (course.objectives || "").split(/\r?\n/).filter(Boolean);
  const modules = (course.modules || "").split(/\r?\n/).filter(Boolean);
  const materials = (course.materials || "").split("\n").filter(Boolean);
  const resources = ownsCourse(course.id)
    ? materials.map((item) => `<a href="${escapeLearner(item)}" target="_blank" rel="noopener noreferrer">Open learning material ↗</a>`).join("<br>") || "Materials are shared in the lessons."
    : "Additional course links unlock with full access.";
  openLearnerModal(course.title, `<div class="course-detail-hero"><img src="${escapeLearner(course.thumbnail)}" alt=""><div class="course-detail-overlay"><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.category)} · ${escapeLearner(course.level || "All levels")} · ${escapeLearner(course.duration || "Self-paced")}</p></div></div><div class="learner-notice"><span>ⓘ</span><div>Module 1 is available to preview. Compare full-access plans in the course catalog.</div></div><div class="detail-sections"><div class="learner-detail-box"><h3>Introduction</h3><p>${escapeLearner(course.introduction || course.description || "Introduction coming soon.")}</p></div><div class="learner-detail-box"><h3>Learning objectives</h3><ul>${objectives.map((item) => `<li>${escapeLearner(item)}</li>`).join("") || "<li>Learning objectives coming soon.</li>"}</ul></div><div class="learner-detail-box"><h3>Course modules</h3><ul>${modules.map((item, index) => `<li>${escapeLearner(item)}${index === 0 ? " · Free preview" : " · Included with full access"}</li>`).join("") || "<li>Curriculum coming soon.</li>"}</ul></div><div class="learner-detail-box"><h3>About this course</h3><p>${escapeLearner(course.description || "Course description coming soon.")}</p></div><div class="learner-detail-box"><h3>Instructor</h3><p>${escapeLearner(course.instructor)}<br>Skill Up Hub course instructor</p></div><div class="learner-detail-box"><h3>Requirements & completion</h3><p>${escapeLearner(course.requirements || "No prerequisites listed.")}</p></div><div class="learner-detail-box"><h3>Assignments & quizzes</h3><p><strong>Assignment:</strong> ${escapeLearner(course.assignments || "To be announced.")}<br><strong>Quizzes:</strong> ${escapeLearner(course.quizzes || "To be announced.")}</p></div><div class="learner-detail-box"><h3>Learning resources</h3><p>${resources}</p></div></div><div class="modal-actions"><button class="learner-button learner-button-soft" data-close-learner-modal>Close</button><button class="learner-button learner-button-primary" data-action="open-learning-course" data-id="${escapeLearner(course.id)}">Start free module 1 →</button></div>`);
}

function renderLearning() {
  const enrolled = enrolledCourses();
  const rows = enrolled.map((course) => {
    const complete = getProgress(course.id).completed;
    const progress = progressPercent(course.id);
    const enrolledAt = learnerState.enrollments?.find((enrollment) => enrollment.courseId === course.id)?.enrolledAt
      || learnerState.purchases.find((purchase) => purchase.courseId === course.id || purchase.plan === "bundle")?.purchasedAt;
    return `<article class="learning-card"><div class="learning-card-image"><img src="${escapeLearner(course.thumbnail)}" alt="" loading="lazy"><span>${complete ? "COURSE COMPLETED" : "YOUR NEXT LESSON IS READY"}</span></div><div class="learning-card-body"><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.instructor)} · ${escapeLearner(course.duration || "Self-paced")} · Enrolled ${learnerDate(enrolledAt?.slice(0, 10))}</p><div class="learning-progress-header"><span>${complete ? "Completed" : "Course progress"}</span><strong>${progress}%</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><div class="learning-footer">${complete ? button("Course outline", "open-learning-course", course.id) : `<span class="muted">Last lesson: ${escapeLearner((course.modules || "").split("\n")[getProgress(course.id).lastLesson] || "Start learning")}</span>`}${button("Access course", "open-learning-course", course.id, "primary")}</div></div></article>`;
  }).join("");
  return `${pageHeading("My learning", "Your courses and saved learning progress.", button("Find another course", "navigate-catalog", "", "soft"))}
    <div class="learner-stats"><article class="learner-stat"><div class="learner-stat-top"><span>Enrolled courses</span><span class="learner-stat-icon">▤</span></div><strong>${enrolled.length}</strong><small>Your personal learning library</small></article><article class="learner-stat"><div class="learner-stat-top"><span>In progress</span><span class="learner-stat-icon coral">▷</span></div><strong>${activeCourses().length}</strong><small>Pick up where you left off</small></article><article class="learner-stat"><div class="learner-stat-top"><span>Completed</span><span class="learner-stat-icon violet">✦</span></div><strong>${completedCourses().length}</strong><small>Celebrate your progress</small></article><article class="learner-stat"><div class="learner-stat-top"><span>Lessons completed</span><span class="learner-stat-icon amber">✓</span></div><strong>${Object.values(learnerState.progress).reduce((sum, progress) => sum + (progress.completedLessons || []).length, 0)}</strong><small>Keep up the great work</small></article></div>
    <div class="learning-layout"><div class="lesson-list">${rows || `<section class="learner-panel">${empty("Your course library is empty.", "Explore courses and select Access course to add one to My learning.")}</section>`}</div><div>${panel("Course resources", "Helpful links for your studies", `<div class="resource-list">${learnerState.resources.slice(0, 3).map((resource) => `<div class="resource-row"><span class="activity-icon violet">▧</span><div class="activity-copy"><strong>${escapeLearner(resource.title)}</strong><small>${escapeLearner(resource.category)}</small></div><a class="learner-link-button" href="${escapeLearner(resource.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a></div>`).join("") || empty("No resources added.")}</div>`)}</div></div>`;
}

function openLearningCourse(id) {
  const course = getCourse(id);
  if (!course) { notify("This course is not available.", "error"); return; }
  certificateFocus = id;
  activeLearnerView = "course";
  renderLearnerView();
}

async function accessCourse(id) {
  const course = getCourse(id);
  if (!course || (course.status !== "Published" && !ownsCourse(id))) {
    notify("This course is not currently available.", "error");
    return;
  }
  openLearningCourse(id);
}

async function startCoursePayment(courseId, buttonElement) {
  if (ownsCourse(courseId)) {
    notify("You already have full access to this course.");
    return;
  }
  const course = getCourse(courseId);
  if (!course || course.status !== "Published") {
    notify("This course is not currently available.", "error");
    return;
  }
  return startPaymentCheckout("course", courseId, buttonElement);
}

async function startBundlePayment(buttonElement) {
  if (courseBundleAccess?.status === "active") {
    notify("You already have all-course access.");
    return;
  }
  if (!learnerState.courses.some((course) => course.status === "Published")) {
    notify("There are no published courses available for the bundle yet.", "error");
    return;
  }
  return startPaymentCheckout("bundle", null, buttonElement);
}

async function startPaymentCheckout(plan, courseId, buttonElement) {
  const originalLabel = buttonElement?.textContent;
  if (buttonElement) {
    buttonElement.disabled = true;
    buttonElement.textContent = "Connecting to Paystack…";
  }
  try {
    const callbackUrl = new URL("student.html", window.location.href);
    callbackUrl.searchParams.set("payment", plan);
    callbackUrl.searchParams.set("action", "verify");
    const checkout = plan === "bundle"
      ? await supabaseClient.initializeBundlePayment(callbackUrl.href)
      : await supabaseClient.initializeCoursePayment(courseId, callbackUrl.href);
    const checkoutUrl = new URL(checkout.authorizationUrl);
    if (checkoutUrl.origin !== "https://checkout.paystack.com") {
      throw new Error("Paystack returned an unexpected checkout address.");
    }
    window.location.assign(checkoutUrl.href);
  } catch (error) {
    notify(`Could not start ${plan === "bundle" ? "all-course" : "course"} payment: ${error.message}`, "error");
    if (buttonElement?.isConnected) {
      buttonElement.disabled = false;
      buttonElement.textContent = originalLabel || `Pay ${learnerMoney(plan === "bundle" ? ALL_COURSES_PRICE_NGN : COURSE_ACCESS_PRICE_NGN)}`;
    }
  }
}

function getCourseMaterials(course) {
  return [...new Set(String(course.materials || "").split(/\r?\n/)
    .map((material) => material.trim())
    .filter((material) => material && !/^bunny-stream:|^course-videos\//i.test(material)))];
}

function normalizeCourseMaterial(material) {
  try {
    const url = new URL(material, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function getLessonMaterialLabel(url) {
  if (/\.pdf(?:$|[?#])/i.test(url)) return "Open PDF ↗";
  return "Open material ↗";
}

function renderCourseRoom() {
  const course = getCourse(certificateFocus);
  if (!course) {
    activeLearnerView = "learning";
    return renderLearning();
  }
  const progress = getProgress(course.id);
  const owned = ownsCourse(course.id);
  const lessons = (course.modules || "").split(/\r?\n/).filter(Boolean);
  const objectives = (course.objectives || "").split(/\r?\n/).filter(Boolean);
  const rows = lessons.map((lesson, index) => {
    const completed = owned && progress.completedLessons.includes(index);
    const current = progress.lastLesson === index && !completed;
    const lessonStatus = owned
      ? current ? "Continue here" : completed ? "Completed" : "Not started"
      : index === 0 ? "Free preview" : "Locked · full access required";
    const material = course.moduleMaterials?.[index];
    const canOpenModule = owned || index === 0;
    const materialPreview = canOpenModule && material ? `<details class="lesson-material-preview" data-course-material-preview data-course-id="${escapeLearner(course.id)}" data-material-module-index="${index}" data-material-provider="${escapeLearner(material.provider || "supabase")}" data-material-path="${escapeLearner(material.path || "")}" data-material-video-id="${escapeLearner(material.videoId || "")}" data-material-type="${escapeLearner(material.mimeType)}"><summary>Preview ${material.mimeType === "application/pdf" ? "PDF" : "video"} · ${escapeLearner(material.fileName)}</summary><div class="lesson-material-player" data-material-preview>Open to load this lesson material.</div></details>` : "";
    const lessonContent = `<span class="lesson-number">${completed ? "✓" : index + 1}</span><span class="lesson-details"><strong>${escapeLearner(lesson)}</strong><small>Module ${index + 1} · ${lessonStatus}</small></span>${owned ? `<button class="lesson-complete" type="button" aria-pressed="${completed}" aria-label="${completed ? "Mark lesson incomplete" : "Mark lesson complete"}" data-action="toggle-lesson" data-id="${escapeLearner(course.id)}" data-lesson="${index}">${completed ? "✓" : ""}</button>` : index > 0 ? `<span class="learner-badge pending">Locked</span>` : ""}`;
    return `<article class="lesson-row"><div class="lesson-row-main">${lessonContent}</div>${materialPreview}</article>`;
  }).join("");
  const materialLinks = getCourseMaterials(course).map((link) => {
    const safeLink = normalizeCourseMaterial(link);
    if (!safeLink) return "";
    return `<a class="learner-button learner-button-soft" href="${escapeLearner(safeLink)}" target="_blank" rel="noopener noreferrer">${getLessonMaterialLabel(safeLink)}</a>`;
  }).join(" ");
  const percentage = progressPercent(course.id);
  const courseActions = `<button class="learner-button learner-button-soft" data-action="navigate-learning">← My courses</button>${owned ? "" : `<button class="learner-button learner-button-primary" data-action="navigate-catalog">View access plans</button>`}`;
  const courseSidePanel = owned
    ? `<div>${panel("Your next steps", "Practice what you learn", `<div class="detail-block"><h3>Assignment</h3><p>${escapeLearner(course.assignments || "No assignment published yet.")}</p><div style="margin-top:8px">${button("Submit assignment", "assignment", course.id, "soft")}</div></div><div class="detail-block"><h3>Knowledge check</h3><p>${escapeLearner((course.quizzes || "Course fundamentals").split("\n")[0])}</p><div style="margin-top:8px">${button(learnerState.quizzes[course.id] === undefined ? "Take practice quiz" : `Best score: ${learnerState.quizzes[course.id]}%`, "quiz", course.id, "soft")}</div></div>${progress.completed ? `<div class="detail-block"><h3>Certificate earned</h3><p>Your course completion is recorded. Open certificates to view and share it.</p><div style="margin-top:8px">${button("View certificate", "navigate-certificates", "", "lime")}</div></div>` : ""}`)}</div>`
    : "";
  return `${pageHeading(course.title, `${escapeLearner(course.instructor)} · Course syllabus and learning resources`, courseActions)}
    ${owned ? notice("<strong>You have full access to this course.</strong> Track lesson progress and use all course materials below.") : notice("<strong>Module 1 is free.</strong> Watch or read its material here. View access plans in Explore courses to unlock the remaining modules.")}
    <div class="detail-sections course-learning-overview"><div class="learner-detail-box"><h3>Introduction</h3><p>${escapeLearner(course.introduction || course.description || "Introduction coming soon.")}</p></div><div class="learner-detail-box"><h3>Learning objectives</h3><ul>${objectives.map((item) => `<li>${escapeLearner(item)}</li>`).join("") || "<li>Learning objectives coming soon.</li>"}</ul></div></div>
    <div class="learning-layout${owned ? "" : " course-room-layout-free"}"><section class="learner-panel"><header class="learner-panel-header"><div><h2>Course syllabus</h2><p>${lessons.length} modules${owned ? " · mark a lesson complete to track your progress" : " · module 1 is free to preview"}</p></div>${owned ? `<strong>${percentage}%</strong>` : ""}</header><div class="learner-panel-body">${owned ? `<div class="learner-progress-header"><span>Course completion</span><strong>${percentage}%</strong></div><div class="progress-track"><span style="width:${percentage}%"></span></div>` : ""}<div class="lesson-list" style="margin-top:13px">${rows || empty("Course curriculum is being prepared.")}</div><div class="learner-detail-box" style="margin-top:12px"><h3>Learning materials</h3><p>${owned ? materialLinks || "Open each module to view its material." : "Open module 1 above to watch its video or read its PDF."}</p></div><div class="learner-detail-box" style="margin-top:10px"><h3>Completion requirement</h3><p>${escapeLearner(course.requirements || "Complete all lessons and submit the final project.")}</p></div></div></section>${courseSidePanel}</div>`;
}

async function loadLessonMaterialPreview(details) {
  if (details.dataset.loaded || details.dataset.loading) return;
  const courseId = details.dataset.courseId;
  const provider = details.dataset.materialProvider;
  const path = details.dataset.materialPath;
  const videoId = details.dataset.materialVideoId;
  const moduleIndex = Number(details.dataset.materialModuleIndex);
  const course = getCourse(courseId);
  const material = course?.moduleMaterials?.[moduleIndex];
  const validModuleIndex = Number.isInteger(moduleIndex) && moduleIndex >= 0;
  const materialMatches = Boolean(material && (provider === "bunny"
    ? material.provider === "bunny" && material.videoId === videoId
    : material.provider === "supabase" && material.path === path));
  const preview = details.querySelector("[data-material-preview]");
  if (!preview) return;
  if (!course || !validModuleIndex || (!ownsCourse(courseId) && moduleIndex !== 0) || !materialMatches ||
      (provider === "bunny" ? !videoId : !path.startsWith(`${courseId}/`))) {
    preview.textContent = "This lesson material is unavailable.";
    return;
  }
  details.dataset.loading = "true";
  preview.textContent = "Loading preview…";
  try {
    const url = provider === "bunny"
      ? await supabaseClient.createBunnyPlaybackUrl(courseId, videoId)
      : await supabaseClient.createCourseMaterialSignedUrl(path);
    if (!details.isConnected || !details.open) return;
    if (provider === "bunny") {
      preview.innerHTML = `<iframe src="${escapeLearner(url)}" title="${escapeLearner(material.fileName)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    } else if (material.mimeType === "application/pdf") {
      preview.innerHTML = `<iframe src="${escapeLearner(url)}" title="${escapeLearner(material.fileName)}" loading="lazy"></iframe><a href="${escapeLearner(url)}" target="_blank" rel="noopener noreferrer">Open PDF in a new tab ↗</a>`;
    } else if (["video/mp4", "video/quicktime", "video/webm"].includes(material.mimeType)) {
      preview.innerHTML = `<video controls playsinline preload="metadata" src="${escapeLearner(url)}"><a href="${escapeLearner(url)}">Open video</a></video>`;
    } else {
      throw new Error("This file type cannot be previewed.");
    }
    details.dataset.loaded = "true";
  } catch (error) {
    preview.textContent = /object not found/i.test(error.message)
      ? "This file is missing from course storage. Ask an administrator to re-upload it."
      : `Preview unavailable: ${error.message}`;
  } finally {
    delete details.dataset.loading;
  }
}

function updateCourseProgress(id, lessonIndex, markCompleted) {
  if (!ownsCourse(id)) { notify("Enroll in this course to update lesson progress.", "error"); return; }
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
    progress.updatedAt = new Date().toISOString();
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
    ${notice("Session requests and course questions are saved to your account. They are not sent to mentors.")}
    <div class="learner-grid"><section class="learner-panel"><header class="learner-panel-header"><div><h2>Course instructors</h2><p>Request support from an instructor listed on your courses</p></div></header><div class="learner-panel-body"><div class="mentor-list">${instructors.map((name) => `<div class="mentor-row"><span class="learner-avatar">${escapeLearner(name.split(/\s+/).map((part) => part[0] || "").slice(0, 2).join("").toUpperCase())}</span><div class="learner-mentor-copy"><strong>${escapeLearner(name)}</strong><small>Course instructor</small></div></div>`).join("") || empty("Instructor details appear when courses are published.")}</div><form data-learner-form="booking" style="margin-top:15px"><div class="mentorship-booking"><div class="learner-field full"><label for="booking-title">What would you like help with?</label><input id="booking-title" name="title" required placeholder="e.g. Review my portfolio project"></div><div class="learner-field"><label for="booking-mentor">Instructor / programme</label><select id="booking-mentor" name="mentor">${supportOptions.map((item) => `<option>${escapeLearner(item)}</option>`).join("")}</select></div><div class="learner-field"><label for="booking-course">Related course</label><select id="booking-course" name="courseId">${enrolledCourses().map((course) => `<option value="${escapeLearner(course.id)}">${escapeLearner(course.title)}</option>`).join("")}</select></div><div class="learner-field"><label for="booking-date">Preferred date</label><input id="booking-date" name="date" type="date" min="${learnerDay()}" required></div><div class="learner-field"><label for="booking-time">Preferred time</label><input id="booking-time" name="time" type="time" value="14:00" required></div></div><button class="learner-button learner-button-primary" type="submit">Request session ↗</button></form></div></section>
    ${panel("Your mentorship sessions", "Upcoming bookings and learning history", `<div class="activity-list">${sessions || empty("No sessions booked yet.", "Use the form to request a mentorship session.")}</div>`)}
    </div><div class="learner-grid">${panel("Ask a mentor", "Share a question about an enrolled course", `<form data-learner-form="question"><div class="learner-field"><label for="question-course">Course</label><select id="question-course" name="courseId" required>${enrolledCourses().map((course) => `<option value="${escapeLearner(course.id)}">${escapeLearner(course.title)}</option>`).join("")}</select></div><div class="learner-field"><label for="question-text">Your question</label><textarea id="question-text" name="title" required placeholder="Tell us what you are working through…"></textarea></div><button class="learner-button learner-button-primary" type="submit">Send question</button></form>`, "")}
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
    return `<article class="certificate-tile"><span class="certificate-seal">✦</span>${badge(progress.certificateId ? "Certificate ready" : "Completed", "certificate-eligible")}<h3>${escapeLearner(course.title)}</h3><p>Completed ${learnerDate(learnerState.purchases.find((purchase) => purchase.courseId === course.id || purchase.plan === "bundle")?.purchasedAt)} · Instructor ${escapeLearner(course.instructor)}</p><div class="job-card-actions">${progress.certificateId ? `<span class="muted">${escapeLearner(id)}</span>${button("View certificate", "view-certificate", course.id, "soft")}` : `<span class="muted">Certificate requirements pending review</span>`}</div></article>`;
  }).join("");
  const certificateQuery = new URLSearchParams(location.search).get("certificate");
  const verify = certificateQuery ? findCertificate(certificateQuery) : null;
  return `${pageHeading("Certificates", "Celebrate the skills you've built. Certificates are available after your course completion criteria are met.")}
    ${notice("Certificates are saved with your learner account. A public verification service and official credential are not connected.")}
    ${certificateQuery ? `<div class="learner-panel" style="margin-bottom:14px"><div class="learner-panel-body"><strong>${verify ? "Certificate record found" : "Certificate not found"}</strong><p class="muted">${verify ? `${escapeLearner(verify.course.title)} · ${escapeLearner(verify.id)} · Learner: ${escapeLearner(learnerState.profile.name)}` : "This verification code does not match a completed course in your learner account."}</p></div></div>` : ""}
    <div class="learner-stats"><article class="learner-stat"><div class="learner-stat-top"><span>Certificates earned</span><span class="learner-stat-icon amber">✦</span></div><strong>${eligible.length}</strong><small>Courses completed and eligible</small></article><article class="learner-stat"><div class="learner-stat-top"><span>Courses completed</span><span class="learner-stat-icon violet">✓</span></div><strong>${completed.length}</strong><small>See your learning achievements</small></article></div>
    <div class="certificate-grid">${completedList || empty("Your first certificate is waiting.", "Complete an enrolled course and its requirements to see your certificates here.")}</div>
    <section class="learner-panel" style="margin-top:14px"><header class="learner-panel-header"><div><h2>Certificate eligibility</h2><p>Only completed, enrolled courses are considered</p></div></header><div class="learner-panel-body"><div class="activity-list">${enrolledCourses().filter((course) => !getProgress(course.id).completed).map((course) => `<div class="activity-row"><span class="activity-icon violet">▷</span><div class="activity-copy"><strong>${escapeLearner(course.title)}</strong><small>${progressPercent(course.id)}% complete · ${escapeLearner(course.requirements)}</small></div><button class="learner-link-button" data-action="open-learning-course" data-id="${escapeLearner(course.id)}">Continue</button></div>`).join("") || empty("No unfinished enrolled courses.")}</div></div></section>`;
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

async function refreshReferralCenter() {
  const summary = await supabaseClient.getMyReferralSummary();
  referralCenter.summary = {
    code: String(summary.code || ""),
    rate: Number(summary.rate) || 0,
    registrations: Number(summary.registrations) || 0,
    conversions: Number(summary.conversions) || 0,
    commission: Number(summary.commission) || 0,
    earned: Number(summary.earned) || 0,
    payoutAccount: summary.payoutAccount || null,
    withdrawals: Array.isArray(summary.withdrawals) ? summary.withdrawals : [],
    history: Array.isArray(summary.history) ? summary.history : []
  };
}

function ensureReferralCenterLoaded() {
  if (referralCenter.summary) return Promise.resolve();
  if (referralCenter.promise) return referralCenter.promise;
  referralCenter.loading = true;
  referralCenter.promise = (async () => {
    try {
      await refreshReferralCenter();
      referralCenter.error = "";
      if (!referralCenter.channel && supabaseClient.subscribeReferrals) {
        referralCenter.channel = supabaseClient.subscribeReferrals(
          LEARNER_ID,
          () => {
            void refreshReferralCenter().then(() => {
              referralCenter.realtimeError = "";
              if (activeLearnerView === "referrals") renderLearnerView();
            }).catch((error) => {
              referralCenter.realtimeError = error.message || "Referral activity could not be refreshed.";
              if (activeLearnerView === "referrals") renderLearnerView();
            });
          },
          (error) => {
            referralCenter.realtimeError = error.message || "Live referral updates are unavailable.";
            if (activeLearnerView === "referrals") renderLearnerView();
          }
        );
      }
    } catch (error) {
      referralCenter.error = error.message || "Referral information could not be loaded.";
    } finally {
      referralCenter.loading = false;
      referralCenter.promise = null;
      if (activeLearnerView === "referrals") renderLearnerView();
    }
  })();
  return referralCenter.promise;
}

function renderReferrals() {
  if (!referralCenter.summary && !referralCenter.loading) void ensureReferralCenterLoaded();
  if (referralCenter.loading) return `${pageHeading("Referral programme", "Share your link and track eligible referrals.")}<section class="learner-panel"><div class="learner-panel-body"><p class="security-description">Loading your referral information…</p></div></section>`;
  if (referralCenter.error) return `${pageHeading("Referral programme", "Share your link and track eligible referrals.")}<section class="learner-panel"><div class="learner-panel-body"><p class="security-description">Referral information could not be loaded: ${escapeLearner(referralCenter.error)}</p>${button("Try again", "refresh-referrals", "", "soft")}</div></section>`;
  if (!referralCenter.summary) return "";
  const referral = referralCenter.summary;
  const history = referral.history.map((item) => `<div class="activity-row"><span class="activity-icon violet">${item.conversion ? "✓" : "↗"}</span><div class="activity-copy"><strong>${escapeLearner(item.name || "Referred learner")}</strong><small>${escapeLearner(item.description || "Registered using your referral link")} · ${learnerDate(item.date)}</small></div><span class="activity-time">${item.conversion ? "Verified purchase" : "Registration"}</span></div>`).join("");
  const referralUrl = new URL("auth.html", window.location.href);
  referralUrl.searchParams.set("mode", "register");
  referralUrl.searchParams.set("ref", referral.code);
  const realtimeMessage = referralCenter.realtimeError ? `<p class="security-description" role="status">Live updates are temporarily unavailable. Refresh the page to see the latest activity.</p>` : "";
  const account = referral.payoutAccount || {};
  const withdrawalRows = referral.withdrawals.map((withdrawal) => `<div class="activity-row"><span class="activity-icon violet">₦</span><div class="activity-copy"><strong>${learnerMoney(withdrawal.amount)} withdrawal</strong><small>${learnerDate(String(withdrawal.created_at || "").slice(0, 10))}</small></div>${badge(withdrawal.status, withdrawal.status === "pending" ? "pending" : "")}</div>`).join("");
  const savedAccountNumber = account.account_number || "";
  const withdrawalDescription = referral.payoutAccount
    ? `Request any amount up to your available balance of ${learnerMoney(referral.commission)}. Skill Up Hub will review and pay by bank transfer.`
    : "Save your bank details before requesting a withdrawal.";
  return `${pageHeading("Referral programme", "Share your personal link and track registered learners and verified course purchases.")}
    <section class="referral-hero"><div class="referral-hero-copy"><p class="learner-kicker">YOUR REFERRAL SPACE</p><h2>Good skills are worth <span>sharing.</span></h2><p>Earn ${referral.rate}% of each referred learner's verified course or all-course payment. You can request manual bank-transfer withdrawals from your available balance.</p></div><div class="referral-link-card"><div class="referral-link-label">YOUR PERSONAL LINK</div><div class="referral-link-code">${escapeLearner(referralUrl.href)}</div><button class="learner-button learner-button-lime" data-action="copy-referral">Copy referral link</button><div class="referral-link-foot"><span class="referral-link-status"></span>Your referral code: ${escapeLearner(referral.code)}</div></div><span class="referral-hero-mark" aria-hidden="true">↗</span></section>
    ${realtimeMessage}
    <div class="referral-metrics"><div class="referral-metric"><span>Registrations</span><strong>${referral.registrations}</strong><small>Accounts attributed to your link</small></div><div class="referral-metric violet"><span>Verified purchases</span><strong>${referral.conversions}</strong><small>Referred learners with a verified payment</small></div><div class="referral-metric lime"><span>Commission balance</span><strong>${learnerMoney(referral.commission)}</strong><small>${referral.rate}% of verified payments</small></div><div class="referral-metric coral"><span>Programme rate</span><strong>${referral.rate}%</strong><small>Set by Skill Up Hub</small></div></div>
    <div class="learner-grid referral-activity-grid">${panel("Referral activity", "Registrations and verified course purchases", `<div class="activity-list">${history || empty("No registrations yet.", "Share your referral link to get started.")}</div>`)}
    ${panel("Commission & payouts", "Manual bank-transfer withdrawals", `<div class="referral-payout-grid"><form data-learner-form="payout-account"><h3>Bank account details</h3><div class="learner-field"><label for="payout-account-name">Account holder name</label><input id="payout-account-name" name="account_holder_name" required minlength="2" maxlength="120" autocomplete="name" value="${escapeLearner(account.account_holder_name || "")}"></div><div class="learner-field"><label for="payout-bank-name">Bank name</label><input id="payout-bank-name" name="bank_name" required minlength="2" maxlength="120" value="${escapeLearner(account.bank_name || "")}"></div><div class="learner-field"><label for="payout-account-number">Account number</label><input id="payout-account-number" name="account_number" type="text" inputmode="numeric" pattern="[0-9]{6,20}" minlength="6" maxlength="20" autocomplete="off" required value="${escapeLearner(savedAccountNumber)}"></div><button class="learner-button learner-button-soft" type="submit">Save bank details</button></form><div><h3>Request a withdrawal</h3><p class="referral-rewards-note">${withdrawalDescription}</p><div class="referral-available-balance"><span>Available balance</span><strong>${learnerMoney(referral.commission)}</strong><small>Total earned: ${learnerMoney(referral.earned)} · no minimum withdrawal</small></div><form data-learner-form="referral-withdrawal"><div class="learner-field"><label for="withdrawal-amount">Amount (NGN)</label><input id="withdrawal-amount" name="amount" type="number" inputmode="decimal" min="0.01" max="${referral.commission.toFixed(2)}" step="0.01" required ${!referral.payoutAccount || referral.commission <= 0 ? "disabled" : ""}></div><button class="learner-button learner-button-primary" type="submit" ${!referral.payoutAccount || referral.commission <= 0 ? "disabled" : ""}>Request bank transfer</button></form></div></div><div class="referral-withdrawals-heading"><h3>Withdrawal history</h3>${button("Refresh", "refresh-referrals", "", "soft")}</div><div class="activity-list">${withdrawalRows || empty("No withdrawal requests yet.")}</div><p class="referral-rewards-note">Requests are reviewed by an administrator. A request reserves that amount until it is marked paid or rejected; the app does not initiate transfers automatically.</p>`)}</div>`;
}

function renderProfile() {
  const profile = learnerState.profile;
  const purchases = learnerState.purchases.filter((purchase) => purchase.status === "Successful").map((purchase) => `<div class="activity-row"><span class="activity-icon">▤</span><div class="activity-copy"><strong>${escapeLearner(purchase.plan === "bundle" ? "All-course access" : getCourse(purchase.courseId)?.title || "Course")}</strong><small>${learnerDate(purchase.purchasedAt)} · ${escapeLearner(purchase.receipt)}</small></div><strong>${learnerMoney(purchase.amount)}</strong></div>`).join("");
  const verifiedFactor = securityCenter.factors.find((factor) => factor.factor_type === "totp" && factor.status === "verified");
  const preferences = [
    ["product_email", "Product and learning emails", "Learning updates and account-related product messages."],
    ["marketing_email", "Marketing emails", "Optional offers and promotional messages."],
    ["sms_notifications", "SMS notifications", "Optional text messages; an SMS provider must be configured."],
    ["whatsapp_notifications", "WhatsApp notifications", "Optional WhatsApp messages; a WhatsApp provider must be configured."],
    ["analytics_cookies", "Analytics cookies", "Your saved choice. No analytics-cookie provider is currently connected."],
    ["third_party_sharing", "Third-party data sharing", "Your saved choice. No optional third-party sharing integration is currently connected."]
  ].map(([key, title, description]) => `<label class="security-preference"><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-privacy-preference="${key}" ${securityCenter.preferences[key] ? "checked" : ""} ${securityCenter.loading || securityCenter.error ? "disabled" : ""} aria-label="${title}"></label>`).join("");
  const requests = securityCenter.requests.map((request) => `<div class="security-request-row"><div><strong>${escapeLearner(privacyRequestName(request.request_type))}</strong><small>${escapeLearner(request.details || "No additional details")} · ${escapeLearner(new Date(request.created_at).toLocaleString())}</small></div>${badge(request.status, request.status === "Pending" ? "pending" : "")}</div>`).join("");
  const factorSummary = verifiedFactor ? `Authenticator app · ${escapeLearner(verifiedFactor.friendly_name || "TOTP")}` : securityCenter.factors.length ? "No verified authenticator" : "Not enabled";
  const browserName = /Edg\//.test(navigator.userAgent) ? "Microsoft Edge" : /Firefox\//.test(navigator.userAgent) ? "Mozilla Firefox" : /Chrome\//.test(navigator.userAgent) ? "Google Chrome" : /Safari\//.test(navigator.userAgent) ? "Safari" : "Browser";
  const missingPrivacySchema = securityCenter.error && supabaseClient.isPrivacySchemaMissing?.(securityCenter.error);
  const requestError = securityCenter.error
    ? `<p class="security-description" role="status">${missingPrivacySchema ? "Privacy settings are not set up for this project yet. Ask an administrator to apply the privacy migration, then reload this page." : "Privacy controls are temporarily unavailable. Please try again later."}</p>`
    : "";
  const mfaNotice = securityCenter.mfaError ? `<p class="security-description">${escapeLearner(securityCenter.mfaError)}</p>` : "";
  const realtimeNotice = securityCenter.realtimeError ? `<p class="security-description">${escapeLearner(securityCenter.realtimeError)}</p>` : "";
  return `${pageHeading("Profile & settings", "Manage the learner profile associated with your account.")}
    <div class="account-profile"><aside class="profile-card"><div class="profile-photo">${profile.avatar ? `<img src="${escapeLearner(profile.avatar)}" alt="Profile photo">` : escapeLearner(profile.name.split(/\s+/).map((item) => item[0] || "").slice(0, 2).join("").toUpperCase())}</div><h2>${escapeLearner(profile.name)}</h2><p>Connected to your Skill Up Hub account</p>${badge(profile.role)}<div><label class="learner-button learner-button-soft" for="avatar-upload">Upload profile photo</label><input id="avatar-upload" type="file" accept="image/*" hidden></div><div class="profile-save">${button("Explore courses", "navigate-catalog", "", "soft")}</div></aside>
    <section class="profile-edit-card"><h2>Personal information</h2><p>Your profile is saved to your account.</p><form data-learner-form="profile"><div class="profile-edit-grid"><div class="learner-field"><label for="profile-name">Full name</label><input id="profile-name" name="name" required minlength="2" value="${escapeLearner(profile.name)}"></div><div class="learner-field"><label for="profile-email">Email address</label><input id="profile-email" value="${escapeLearner(profile.email)}" readonly></div><div class="learner-field"><label for="profile-location">Location</label><input id="profile-location" name="location" value="${escapeLearner(profile.location || "")}" placeholder="City, country"></div><div class="learner-field full"><label for="profile-bio">About you</label><textarea id="profile-bio" name="bio" maxlength="240">${escapeLearner(profile.bio || "")}</textarea></div></div><div class="security-row"><div><strong>Learning notifications</strong></div><input type="checkbox" name="notifications" ${(securityCenter.loaded ? securityCenter.preferences.product_email : profile.notifications) ? "checked" : ""} aria-label="Learning notifications"></div><div class="modal-actions"><button class="learner-button learner-button-primary" type="submit">Save profile</button></div></form>
    </section></div>
    <div class="security-center-grid">
      <section class="learner-panel security-center-card"><div class="learner-panel-body"><div class="security-card-heading"><span class="security-card-icon">⌑</span><div><h2>Account security</h2><p>Protect sign-in and control your active access.</p></div></div>
        <div class="security-row"><div><strong>Password</strong><small>Manage your account password.</small></div>${button("Change password", "change-password")}</div>
        <div class="security-row"><div><strong>Two-factor authentication</strong><small>${factorSummary}</small></div>${verifiedFactor ? button("Turn off", "disable-mfa", verifiedFactor.id, "danger") : button("Set up 2FA", "enable-mfa", "", "soft")}</div>
        ${mfaNotice}
        <div class="security-section-divider"><strong>Current session</strong>${securityCenter.loading ? badge("Loading") : badge(securityCenter.session ? "Active" : "Unavailable")}</div>
        <div class="security-row"><div><strong>This browser · ${escapeLearner(browserName)}</strong><small>Approximate location and IP are not collected by this browser page.</small></div>${button("Sign out", "logout-current", "", "soft")}</div>
        <div class="security-action-row">${button("Log out all devices", "logout-all", "", "danger")}</div>
        <p class="security-description">A device-by-device login history, IP/location, and suspicious-login detection require a trusted server-side audit service; they are not reported as available here.</p>
      </div></section>
      <section class="learner-panel security-center-card"><div class="learner-panel-body"><div class="security-card-heading"><span class="security-card-icon violet">◉</span><div><h2>Privacy &amp; consent</h2><p>Choices are saved to your authenticated account.</p></div></div>
        ${requestError}${realtimeNotice}${securityCenter.loading ? `<p class="security-description">Loading your saved privacy choices…</p>` : preferences}
        <p class="security-description">Profile visibility controls are not available because public learner profiles are not implemented. Saved messaging and sharing choices only take effect when the corresponding provider or integration is configured.</p>
      </div></section>
      <section class="learner-panel security-center-card"><div class="learner-panel-body"><div class="security-card-heading"><span class="security-card-icon coral">▤</span><div><h2>Personal data</h2><p>Review and download information associated with this account.</p></div></div>
        <div class="security-data-summary"><div><span>Account</span><strong>${escapeLearner(profile.email)}</strong></div><div><span>Learning records</span><strong>${learnerState.enrollments.length} enrollments · ${Object.keys(learnerState.progress).length} progress records</strong></div></div>
        <div class="security-action-row">${button("Download my data", "download-personal-data", "", "soft")}${button("Request data export", "privacy-request", "", "soft", 'data-type="data_export"')}</div>
        <div class="security-section-divider"><strong>Data requests</strong></div>${requests || empty("No privacy requests yet.")}<div class="security-action-row" style="margin-top:10px">${button("Request correction", "privacy-request", "", "soft", 'data-type="correction"')}${button("Restrict processing", "privacy-request", "", "soft", 'data-type="restriction"')}${button("Report a privacy concern", "privacy-request", "", "soft", 'data-type="privacy_concern"')}${button("Request account deletion", "privacy-request", "", "danger", 'data-type="account_deletion"')}</div>
        <p class="security-description">Requests are recorded for review; deletion and correction are not completed automatically. No data-retention schedule is configured in this portal yet.</p>
      </div></section>
      <section class="learner-panel security-center-card"><div class="learner-panel-body"><div class="security-card-heading"><span class="security-card-icon">♧</span><div><h2>Alerts &amp; legal</h2><p>Understand what is currently connected.</p></div></div>
        <div class="security-section-divider"><strong>Privacy &amp; legal</strong></div>
        <div class="security-action-row"><a class="learner-button learner-button-soft" href="index.html?legal=privacyPolicy">Privacy policy</a><a class="learner-button learner-button-soft" href="index.html?legal=terms">Terms of service</a><a class="learner-button learner-button-soft" href="mailto:hello@skill-up.ng?subject=Privacy%20concern">Contact privacy support</a></div>
        <p class="security-description">Cookie policy and data-retention policy have not been published. Use privacy support for questions or a data-protection contact request.</p>
      </div></section>
    </div>
    <section class="learner-panel" style="margin-top:14px"><header class="learner-panel-header"><div><h2>Purchase history</h2><p>Your enrollment records synced to your account</p></div><button class="learner-link-button" data-action="export-purchases">Download CSV ↓</button></header><div class="learner-panel-body"><div class="activity-list">${purchases || empty("No course purchases recorded.")}</div></div></section>`;
}

function privacyRequestName(type) {
  return ({
    data_export: "Data export",
    account_deletion: "Account deletion",
    correction: "Data correction",
    restriction: "Processing restriction",
    privacy_concern: "Privacy concern"
  })[type] || "Privacy request";
}

async function refreshPrivacyCenter() {
  const [preferences, requests] = await Promise.all([
    supabaseClient.loadPrivacyPreferences(LEARNER_ID),
    supabaseClient.loadPrivacyRequests(LEARNER_ID)
  ]);
  securityCenter.preferences = {
    ...defaultPrivacyPreferences,
    product_email: Boolean(learnerState.profile.notifications),
    ...(preferences || {})
  };
  securityCenter.requests = requests;
}

function ensureSecurityCenterLoaded() {
  if (securityCenter.loaded) return Promise.resolve();
  if (securityLoadPromise) return securityLoadPromise;
  securityCenter.loading = true;
  securityLoadPromise = (async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabaseClient.client.auth.getSession();
      if (sessionError) throw sessionError;
      securityCenter.session = sessionData.session;
      try {
        if (!supabaseClient.client.auth.mfa?.listFactors) throw new Error("Two-factor authentication is not supported by the current account service.");
        const { data, error } = await supabaseClient.client.auth.mfa.listFactors();
        if (error) throw error;
        securityCenter.factors = data?.all || data?.totp || [];
      } catch (error) {
        securityCenter.mfaError = error.message || "Two-factor authentication status could not be loaded.";
      }
      await refreshPrivacyCenter();
      securityCenter.loaded = true;
      if (supabaseClient.subscribePrivacyCenter) {
        securityCenter.channel = supabaseClient.subscribePrivacyCenter(
          LEARNER_ID,
          async () => {
            try {
              await refreshPrivacyCenter();
              securityCenter.realtimeError = "";
              if (activeLearnerView === "profile") renderLearnerView();
            } catch (error) {
              securityCenter.realtimeError = error.message || "Privacy settings could not be refreshed.";
              if (activeLearnerView === "profile") renderLearnerView();
              notify(`Live privacy update failed: ${securityCenter.realtimeError}`, "error");
            }
          },
          (error) => {
            securityCenter.realtimeError = error.message || "Live privacy updates are unavailable.";
            if (activeLearnerView === "profile") renderLearnerView();
            notify(`Privacy updates could not connect: ${securityCenter.realtimeError}`, "error");
          }
        );
      }
    } catch (error) {
      securityCenter.error = error.message || "Privacy settings could not be loaded.";
    } finally {
      securityCenter.loaded = true;
      securityCenter.loading = false;
      securityLoadPromise = null;
      if (activeLearnerView === "profile") renderLearnerView();
    }
  })();
  return securityLoadPromise;
}

function findLearnerCertificate(id) {
  for (const course of learnerState.courses) {
    const progress = getProgress(course.id);
    if (progress.completed && progress.certificateId === id) return { course, progress, id };
  }
  return null;
}

function renderLearnerView() {
  if (activeLearnerView === "profile" && !securityCenter.loaded && !securityCenter.loading) void ensureSecurityCenterLoaded();
  if (activeLearnerView === "referrals" && !referralCenter.summary && !referralCenter.loading) void ensureReferralCenterLoaded();
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
  openLearnerModal("Submit a course assignment", `<div class="learner-detail-box"><h3>${escapeLearner(course.title)}</h3><p>${escapeLearner(course.assignments || "Share your work with your instructor for feedback.")}</p></div><form data-learner-form="assignment" data-id="${escapeLearner(course.id)}"><div class="learner-field" style="margin-top:12px"><label for="assignment-link">Project link or submission notes</label><textarea id="assignment-link" name="submission" minlength="5" required placeholder="Paste a project link or describe your submission…">${escapeLearner(progress.assignment)}</textarea></div><div class="learner-notice"><span>ⓘ</span><div>Submission is saved locally and will not be sent to a mentor in this demo.</div></div><div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Cancel</button><button class="learner-button learner-button-primary" type="submit">Save demo submission</button></div></form>${progress.feedback ? `<div class="learner-detail-box" style="margin-top:12px"><h3>Instructor feedback</h3><p>${escapeLearner(progress.feedback)}</p></div>` : ""}`);
}

function quizModal(course) {
  const previous = learnerState.quizzes[course.id];
  openLearnerModal("Course knowledge check", `<div class="learner-detail-box"><h3>${escapeLearner(course.title)}</h3><p>Practice question · your answer and score stay in this browser demo.</p></div><form data-learner-form="quiz" data-id="${escapeLearner(course.id)}"><p style="margin:14px 0 8px;color:#41584e;font-size:12px;font-weight:700">What is a good next step when you get stuck building a project?</p><label class="quiz-option"><input name="answer" type="radio" value="ask" required> Break the problem down, test one idea, and ask for feedback.</label><label class="quiz-option"><input name="answer" type="radio" value="skip"> Skip every challenge and copy an unrelated solution.</label><label class="quiz-option"><input name="answer" type="radio" value="stop"> Stop learning the skill altogether.</label>${previous !== undefined ? `<div class="learner-notice" style="margin-top:10px"><span>✦</span><div>Your saved practice score: <strong>${previous}%</strong>. Try again whenever you're ready.</div></div>` : ""}<div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Close</button><button class="learner-button learner-button-primary" type="submit">Check answer</button></div></form>`);
}

function showAnnouncements() {
  saveLearnerState(() => { learnerState.announcementsRead = true; }, "");
  const rows = learnerState.announcements.map((item) => `<div class="announcement-row"><span class="activity-icon ${escapeLearner(item.tone)}">✳</span><div><strong>${escapeLearner(item.title)}</strong><p>${escapeLearner(item.body)} · ${learnerDate(item.date)}</p></div></div>`).join("");
  openLearnerModal("Learning announcements", `<div class="activity-list">${rows || empty("No announcements yet.")}</div>`);
}

function exportPurchases() {
  const rows = [["Plan", "Purchased on", "Amount NGN", "Status", "Receipt"], ...learnerState.purchases.map((purchase) => [purchase.plan === "bundle" ? "All-course access" : getCourse(purchase.courseId)?.title || "Course", purchase.purchasedAt, purchase.amount, purchase.status, purchase.receipt])];
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

function openPrivacyRequest(type) {
  const title = privacyRequestName(type);
  const deletionConfirmation = type === "account_deletion"
    ? `<div class="learner-field"><label for="delete-confirmation">Type DELETE to confirm your request</label><input id="delete-confirmation" name="confirmation" required pattern="DELETE" autocomplete="off"></div>`
    : "";
  openLearnerModal(title, `<p class="security-description">This request will be saved to your account for administrator review. It does not automatically change or delete account data.</p><form data-learner-form="privacy-request" data-type="${escapeLearner(type)}"><div class="learner-field"><label for="privacy-request-details">Details</label><textarea id="privacy-request-details" name="details" maxlength="2000" ${type === "data_export" ? "" : "required"} placeholder="Describe the information or action you are requesting."></textarea></div>${deletionConfirmation}<div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Cancel</button><button class="learner-button learner-button-primary" type="submit">Submit request</button></div></form>`);
}

function openPasswordChange() {
  openLearnerModal("Change password", `<form data-learner-form="password-change"><div class="learner-field"><label for="new-password">New password</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="8" required></div><div class="learner-field"><label for="confirm-new-password">Confirm new password</label><input id="confirm-new-password" name="confirmation" type="password" autocomplete="new-password" minlength="8" required></div><p class="security-description">Choose at least eight characters. A recent sign-in may be required before accepting this change.</p><div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Cancel</button><button class="learner-button learner-button-primary" type="submit">Update password</button></div></form>`);
}

async function beginMfaEnrollment() {
  const mfa = supabaseClient.client.auth.mfa;
  if (!mfa?.enroll) throw new Error("Two-factor authentication is not supported by the current account service.");
  const { data, error } = await mfa.enroll({ factorType: "totp", friendlyName: "Skill Up Hub learner account" });
  if (error) throw error;
  securityCenter.pendingFactor = { id: data.id, secret: data.totp?.secret, qrCode: data.totp?.qr_code };
  const qrCode = String(data.totp?.qr_code || "");
  const qrImage = /^data:image\/svg\+xml(?:;|,)/i.test(qrCode) ? `<img class="mfa-qr-code" src="${escapeLearner(qrCode)}" alt="Authenticator setup QR code">` : "";
  openLearnerModal("Set up two-factor authentication", `<p class="security-description">Scan this code with your authenticator app, or enter the setup key manually. The key is shown only in this dialog.</p>${qrImage}<div class="mfa-secret"><strong>Manual setup key</strong><code>${escapeLearner(data.totp?.secret || "A setup key was not returned.")}</code></div><form data-learner-form="mfa-verify" data-factor="${escapeLearner(data.id)}" data-purpose="enroll"><div class="learner-field" style="margin-top:12px"><label for="mfa-code">6-digit authenticator code</label><input id="mfa-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required></div><div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-action="cancel-mfa-enrollment">Cancel setup</button><button class="learner-button learner-button-primary" type="submit">Verify and enable</button></div></form>`);
}

async function beginMfaRemoval(factorId) {
  const mfa = supabaseClient.client.auth.mfa;
  if (!mfa?.challenge) throw new Error("Two-factor authentication is not supported by the current account service.");
  const { data, error } = await mfa.challenge({ factorId });
  if (error) throw error;
  openLearnerModal("Confirm 2FA removal", `<p class="security-description">Enter the current authenticator code to confirm removal.</p><form data-learner-form="mfa-verify" data-factor="${escapeLearner(factorId)}" data-challenge="${escapeLearner(data.id)}" data-purpose="remove"><div class="learner-field"><label for="mfa-code">6-digit authenticator code</label><input id="mfa-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required></div><div class="modal-actions"><button class="learner-button learner-button-soft" type="button" data-close-learner-modal>Cancel</button><button class="learner-button learner-button-danger" type="submit">Verify and turn off</button></div></form>`);
}

async function downloadPersonalData() {
  const data = await supabaseClient.getPrivacyExport(LEARNER_ID);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `skill-up-personal-data-${learnerDay()}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  notify("Your personal data export has been downloaded.");
}

async function refreshMfaFactors() {
  const { data, error } = await supabaseClient.client.auth.mfa.listFactors();
  if (error) throw error;
  securityCenter.factors = data?.all || data?.totp || [];
  securityCenter.mfaError = "";
  renderLearnerView();
}

async function handleLearnerAction(action, id, element) {
  const course = getCourse(id);
  switch (action) {
    case "change-password":
      openPasswordChange();
      break;
    case "enable-mfa":
      try {
        await beginMfaEnrollment();
      } catch (error) {
        notify(`Could not start two-factor setup: ${error.message}`, "error");
      }
      break;
    case "disable-mfa":
      try {
        await beginMfaRemoval(id);
      } catch (error) {
        notify(`Could not start two-factor removal: ${error.message}`, "error");
      }
      break;
    case "privacy-request":
      openPrivacyRequest(element.dataset.type);
      break;
    case "download-personal-data":
      try {
        await downloadPersonalData();
      } catch (error) {
        notify(`Could not download your personal data: ${error.message}`, "error");
      }
      break;
    case "logout-all":
    case "logout-current": {
      const { error } = await supabaseClient.client.auth.signOut({ scope: action === "logout-all" ? "global" : "local" });
      if (error) {
        notify(`Could not end your session: ${error.message}`, "error");
        break;
      }
      window.location.replace("auth.html?mode=login");
      break;
    }
    case "cancel-mfa-enrollment":
      try {
        const { error } = await supabaseClient.client.auth.mfa.unenroll({ factorId: securityCenter.pendingFactor?.id });
        if (error) throw error;
        securityCenter.pendingFactor = null;
        await refreshMfaFactors();
        closeLearnerModal();
        notify("Two-factor setup was cancelled.");
      } catch (error) {
        notify(`Could not cancel two-factor setup: ${error.message}`, "error");
      }
      break;
    case "navigate-catalog": closeLearnerModal(); navigateLearner("catalog"); break;
    case "navigate-learning": closeLearnerModal(); navigateLearner("learning"); break;
    case "navigate-certificates": closeLearnerModal(); navigateLearner("certificates"); break;
    case "navigate-profile": navigateLearner("profile"); break;
    case "navigate-referrals": navigateLearner("referrals"); break;
    case "open-learning-course": closeLearnerModal(); await accessCourse(id); break;
    case "course-details": if (course) courseDetails(course); break;
    case "pay-selected-course": {
      const selectedCourseId = learnerContent.querySelector("[data-billing-course]")?.value;
      if (!selectedCourseId) {
        notify("Select a course with full access available.", "error");
        break;
      }
      await startCoursePayment(selectedCourseId, element);
      break;
    }
    case "pay-all-courses": await startBundlePayment(element); break;
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
      const requests = requestedCourses.map((item) => ({
        id: `ENR-${Date.now()}-${item.id}`,
        user_id: LEARNER_ID,
        course_id: item.id,
        status: "Pending",
        requested_at: new Date().toISOString()
      }));
      const saved = await saveLearnerState(() => {
        learnerState.enrollmentRequests = [...requests, ...learnerState.enrollmentRequests];
        learnerState.cart = learnerState.cart.filter((courseId) => !requestedCourses.some((item) => item.id === courseId));
        addActivity("▤", "violet", "Enrollment requested", requestedCourses.map((item) => item.title).join(", "));
      }, "Enrollment request saved to your account. No payment was made.");
      if (saved) closeLearnerModal();
      break;
    }
    case "toggle-lesson": updateCourseProgress(id, Number(element.dataset.lesson), element.getAttribute("aria-pressed") !== "true"); break;
    case "assignment": if (course && ownsCourse(id)) assignmentModal(course); else notify("Enroll in this course to submit its assignment.", "error"); break;
    case "quiz": if (course && ownsCourse(id)) quizModal(course); else notify("Enroll in this course to access quizzes.", "error"); break;
    case "announcements": showAnnouncements(); break;
    case "copy-referral": {
      if (!referralCenter.summary?.code) { notify("Your referral code is not available.", "error"); return; }
      const url = new URL("auth.html", window.location.href);
      url.searchParams.set("mode", "register");
      url.searchParams.set("ref", referralCenter.summary.code);
      try {
        await navigator.clipboard.writeText(url.href);
        notify("Referral link copied.");
      } catch (error) {
        notify(`Could not copy the referral link: ${error.message || "Clipboard access is unavailable."}`, "error");
      }
      break;
    }
    case "refresh-referrals": {
      referralCenter.summary = null;
      referralCenter.error = "";
      void ensureReferralCenterLoaded();
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
      if (!certificateCourse || !ownsCourse(id) || !progress.completed || !progress.certificateId) { notify("Complete this enrolled course to unlock its certificate.", "error"); return; }
      openCertificate(certificateCourse, progress);
      break;
    }
    case "download-certificate": downloadCertificate(id); break;
    case "share-certificate": shareCertificate(id); break;
    case "export-purchases": exportPurchases(); break;
    default: break;
  }
}

function openCertificate(course, progress) {
  const verifyURL = verificationURL(progress.certificateId);
  openLearnerModal("Course certificate", `<div class="certificate-tile" style="text-align:center;padding:25px"><span class="certificate-seal" style="margin-inline:auto">✦</span><p style="letter-spacing:1px;font-size:12px;font-weight:700;color:#9a8b48">CERTIFICATE OF COMPLETION</p><h3 style="font-size:17px">Awarded to ${escapeLearner(learnerState.profile.name)}</h3><p>For successfully completing<br><strong>${escapeLearner(course.title)}</strong></p><p>Instructor: ${escapeLearner(course.instructor)} · ${learnerDate(learnerDay())}</p><p>Verification code: <strong>${escapeLearner(progress.certificateId)}</strong></p></div><div class="learner-notice" style="margin-top:10px"><span>ⓘ</span><div>This preview is saved in your learner account, but is not an official credential. Public verification is not connected.</div></div><div class="modal-actions"><button class="learner-button learner-button-soft" data-action="share-certificate" data-id="${escapeLearner(course.id)}">Copy verification link</button><button class="learner-button learner-button-primary" data-action="download-certificate" data-id="${escapeLearner(course.id)}">Download certificate</button></div>`);
}

function downloadCertificate(courseId) {
  const course = getCourse(courseId);
  const progress = course && getProgress(courseId);
  if (!course || !progress.completed || !progress.certificateId) return;
  const text = `SKILL UP HUB CERTIFICATE OF COMPLETION\n\nAwarded to: ${learnerState.profile.name}\nCourse: ${course.title}\nInstructor: ${course.instructor}\nCompleted: ${learnerDate(learnerDay())}\nVerification code: ${progress.certificateId}\n\nPREVIEW — not an official credential.`;
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
document.querySelector(".learner-top-avatar").addEventListener("click", () => navigateLearner("profile"));
learnerContent.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { navigateLearner(viewButton.dataset.view); return; }
  const category = event.target.closest("[data-category]");
  if (category) { courseCategory = category.dataset.category; renderLearnerView(); return; }
  const actionElement = event.target.closest("[data-action]");
  if (actionElement) handleLearnerAction(actionElement.dataset.action, actionElement.dataset.id, actionElement);
});
learnerContent.addEventListener("toggle", (event) => {
  const details = event.target.closest("[data-course-material-preview]");
  if (details?.open) void loadLessonMaterialPreview(details);
}, true);
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
  if (kind === "payout-account") {
    const account = {
      account_holder_name: String(values.account_holder_name || "").trim(),
      bank_name: String(values.bank_name || "").trim(),
      account_number: String(values.account_number || "").trim()
    };
    if (account.account_holder_name.length < 2 || account.bank_name.length < 2 ||
        !/^[0-9]{6,20}$/.test(account.account_number)) {
      notify("Enter a valid account holder name, bank name and account number.", "error");
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      await supabaseClient.saveReferralPayoutAccount(LEARNER_ID, account);
      await refreshReferralCenter();
      referralCenter.error = "";
      renderLearnerView();
      notify("Referral payout account saved securely.");
    } catch (error) {
      if (submitButton?.isConnected) submitButton.disabled = false;
      notify(`Could not save your payout account: ${error.message}`, "error");
    }
    return;
  }
  if (kind === "referral-withdrawal") {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > (referralCenter.summary?.commission || 0)) {
      notify("Enter an amount within your available referral balance.", "error");
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      await supabaseClient.requestReferralWithdrawal(amount);
      await refreshReferralCenter();
      referralCenter.error = "";
      renderLearnerView();
      notify("Withdrawal request submitted. The amount is reserved while an administrator reviews it.");
    } catch (error) {
      if (submitButton?.isConnected) submitButton.disabled = false;
      notify(`Could not request a withdrawal: ${error.message}`, "error");
    }
    return;
  }
  if (kind === "privacy-request") {
    try {
      const request = await supabaseClient.createPrivacyRequest(LEARNER_ID, form.dataset.type, String(values.details || "").trim());
      securityCenter.requests = [request, ...securityCenter.requests];
      closeLearnerModal();
      notify(`${privacyRequestName(request.request_type)} submitted.`);
      if (activeLearnerView === "profile") renderLearnerView();
    } catch (error) {
      notify(`Could not submit your privacy request: ${error.message}`, "error");
    }
    return;
  }
  if (kind === "password-change") {
    if (values.password.length < 8 || values.password !== values.confirmation) {
      notify(values.password !== values.confirmation ? "The new passwords do not match." : "Use at least eight characters for your password.", "error");
      return;
    }
    try {
      const { error } = await supabaseClient.client.auth.updateUser({ password: values.password });
      if (error) throw error;
      closeLearnerModal();
      notify("Your password was updated.");
    } catch (error) {
      notify(`Could not update your password: ${error.message}`, "error");
    }
    return;
  }
  if (kind === "mfa-verify") {
    const mfa = supabaseClient.client.auth.mfa;
    const factorId = form.dataset.factor;
    const purpose = form.dataset.purpose;
    try {
      let challengeId = form.dataset.challenge;
      if (!challengeId) {
        const { data, error } = await mfa.challenge({ factorId });
        if (error) throw error;
        challengeId = data.id;
      }
      const { error: verifyError } = await mfa.verify({ factorId, challengeId, code: String(values.code).trim() });
      if (verifyError) throw verifyError;
      if (purpose === "remove") {
        const { error } = await mfa.unenroll({ factorId });
        if (error) throw error;
      }
      securityCenter.pendingFactor = null;
      await refreshMfaFactors();
      closeLearnerModal();
      notify(purpose === "remove" ? "Two-factor authentication was turned off." : "Two-factor authentication is enabled.");
    } catch (error) {
      notify(`Could not verify the authenticator code: ${supabaseClient.formatAuthenticatorError(error)}`, "error");
    }
    return;
  }
  if (kind === "booking") {
    if (!values.title.trim() || !values.date || !values.time || new Date(`${values.date}T${values.time}`) < new Date()) { notify("Choose a topic and a future date and time for the session request.", "error"); return; }
    saveLearnerState(() => {
      learnerState.sessions.unshift({ id: `LEARN-MNT-${Date.now()}`, title: values.title.trim(), mentor: values.mentor, courseId: values.courseId, date: values.date, time: values.time, type: values.mentor === "Group training" ? "Live training" : "1:1 mentorship", status: "Scheduled", link: "" });
      addActivity("↗", "violet", "Mentorship session requested", values.title.trim());
    }, "Session request saved to your account.");
    closeLearnerModal();
    return;
  }
  if (kind === "question") {
    if (!ownsCourse(values.courseId)) { notify("Select an enrolled course before asking for course support.", "error"); return; }
    if (!values.title.trim() || values.title.trim().length < 5) { notify("Please enter a little more detail about your question.", "error"); return; }
    saveLearnerState(() => {
      learnerState.questions.unshift({ id: `Q-${Date.now()}`, title: values.title.trim(), courseId: values.courseId, date: learnerDay(), status: "Pending response", answer: "" });
      addActivity("?", "violet", "Question saved", getCourse(values.courseId)?.title || "Course support");
    }, "Your question was saved to your account.");
    renderLearnerView();
    return;
  }
  if (kind === "assignment") {
    if (!ownsCourse(courseId) || !values.submission.trim() || values.submission.trim().length < 5) { notify("Submit a link or at least five characters of project notes.", "error"); return; }
    saveLearnerState(() => {
      learnerState.progress[courseId] ||= getProgress(courseId);
      learnerState.progress[courseId].assignment = values.submission.trim();
      learnerState.progress[courseId].assignmentDate = learnerDay();
      learnerState.progress[courseId].updatedAt = new Date().toISOString();
      learnerState.progress[courseId].feedback ||= "";
      addActivity("▤", "coral", "Assignment submitted", getCourse(courseId)?.title || "Course");
    }, "Assignment saved to your account.");
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
    const name = values.name.trim();
    if (name.length < 2) { notify("Enter a name with at least two characters.", "error"); return; }
    let updatedProfile;
    try {
      updatedProfile = await supabaseClient.updateProfile(currentUser.id, name);
    } catch (error) {
      notify(`Could not update your database profile: ${error.message}`, "error");
      return;
    }
    currentUser.name = updatedProfile.full_name;
    const saved = await saveLearnerState(() => {
      learnerState.profile.name = updatedProfile.full_name;
      learnerState.profile.email = updatedProfile.email;
      learnerState.profile.location = values.location.trim();
      learnerState.profile.bio = values.bio.trim();
      learnerState.profile.notifications = form.querySelector('[name="notifications"]').checked;
    }, "Learner profile saved.");
    if (!saved) {
      learnerState.profile.name = updatedProfile.full_name;
      learnerState.profile.email = updatedProfile.email;
      renderLearnerView();
    } else {
      try {
        securityCenter.preferences = {
          ...defaultPrivacyPreferences,
          ...await supabaseClient.savePrivacyPreferences(LEARNER_ID, {
            ...securityCenter.preferences,
            product_email: form.querySelector('[name="notifications"]').checked
          })
        };
        renderLearnerView();
      } catch (error) {
        notify(`Profile saved, but the learning-notification preference could not be saved: ${error.message}`, "error");
      }
    }
    return;
  }
});

learnerContent.addEventListener("change", async (event) => {
  if (event.target.matches("[data-billing-course]")) {
    billingCourseId = event.target.value;
    return;
  }
  const preference = event.target.dataset.privacyPreference;
  if (preference && Object.hasOwn(defaultPrivacyPreferences, preference)) {
    const previous = securityCenter.preferences[preference];
    event.target.disabled = true;
    try {
      const saved = await supabaseClient.savePrivacyPreferences(LEARNER_ID, { ...securityCenter.preferences, [preference]: event.target.checked });
      securityCenter.preferences = { ...defaultPrivacyPreferences, ...saved };
      securityCenter.error = "";
      notify("Privacy preference saved to your account.");
      renderLearnerView();
    } catch (error) {
      event.target.checked = previous;
      event.target.disabled = false;
      notify(`Could not save your privacy preference: ${error.message}`, "error");
    }
    return;
  }
  if (event.target.id !== "avatar-upload") return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 600 * 1024) { notify("Choose an image under 600 KB.", "error"); event.target.value = ""; return; }
  const reader = new FileReader();
  reader.addEventListener("load", () => saveLearnerState(() => { learnerState.profile.avatar = String(reader.result); }, "Profile photo saved."));
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

async function completeCoursePaymentFromCallback() {
  const parameters = new URLSearchParams(window.location.search);
  if (!["course", "bundle"].includes(parameters.get("payment")) || parameters.get("action") !== "verify") return;
  const reference = parameters.get("reference") || parameters.get("trxref");
  if (!reference) {
    notify("Paystack did not return a payment reference. No course access was changed.", "error");
    return;
  }
  try {
    const payment = await supabaseClient.verifyCoursePayment(reference);
    [courseAccess, courseBundleAccess] = await Promise.all([
      supabaseClient.loadCourseAccess(),
      supabaseClient.loadCourseBundleAccess()
    ]);
    const savedPurchase = {
      courseId: payment.courseId,
      plan: payment.plan,
      purchasedAt: new Date().toISOString(),
      amount: Number(payment.amount),
      status: "Successful",
      receipt: payment.reference,
      method: "Paystack"
    };
    const purchaseIndex = learnerState.purchases.findIndex((item) => item.receipt === payment.reference);
    if (purchaseIndex < 0) learnerState.purchases.push(savedPurchase);
    else learnerState.purchases[purchaseIndex] = { ...learnerState.purchases[purchaseIndex], ...savedPurchase };
    const cleanUrl = new URL(window.location.href);
    ["payment", "action", "reference", "trxref"].forEach((key) => cleanUrl.searchParams.delete(key));
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    certificateFocus = payment.courseId || "";
    activeLearnerView = payment.plan === "bundle" ? "catalog" : "course";
    renderLearnerView();
    notify(payment.plan === "bundle"
      ? "Payment confirmed. All current and future published courses are unlocked."
      : `Payment confirmed. Full access to ${getCourse(payment.courseId)?.title || "the course"} is unlocked.`);
  } catch (error) {
    notify(`Could not verify the course payment: ${error.message}. Keep your Paystack reference: ${reference}`, "error");
  }
}

const certificateQuery = new URLSearchParams(window.location.search).get("certificate");
if (certificateQuery) {
  const found = findLearnerCertificate(certificateQuery);
  activeLearnerView = "certificates";
  if (!found) window.setTimeout(() => notify("This verification code does not match a completed course in your learner account.", "error"), 100);
}
renderLearnerView();
void completeCoursePaymentFromCallback();
})();
