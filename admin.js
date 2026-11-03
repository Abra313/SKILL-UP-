(async () => {
const supabaseClient = window.skillUpSupabase;
if (!supabaseClient) {
  window.location.replace("auth.html?mode=login&admin=1");
  return;
}
const { data: { session } } = await supabaseClient.auth.getSession();
if (!session) {
  window.location.replace("auth.html?mode=login&admin=1");
  return;
}
const { data: adminProfile, error: profileError } = await supabaseClient
  .from("profiles")
  .select("role")
  .eq("id", session.user.id)
  .maybeSingle();
if (profileError || adminProfile?.role !== "admin") {
  await supabaseClient.auth.signOut();
  window.location.replace("auth.html?mode=login&admin=1");
  return;
}

const STORAGE_KEY = "skillup-admin-prototype-v1";
const WORKSPACE_ID = "main";
const mainContent = document.querySelector("#main-content");
const modalLayer = document.querySelector("#modal-layer");
const modalTitle = document.querySelector("#modal-title");
const modalBody = document.querySelector("#modal-body");
const sidebar = document.querySelector("#sidebar");
const navButtons = [...document.querySelectorAll(".nav-item")];
const pageNames = {
  dashboard: "Dashboard",
  courses: "Courses",
  students: "Students",
  finance: "Payments & finance",
  referrals: "Referrals",
  mentorship: "Mentorship",
  careers: "Careers & jobs",
  content: "Website content",
  settings: "Settings & security"
};
const today = new Date();
const day = (offset) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const initialState = () => ({
  courses: [
    { id: "c-fullstack", title: "Full Stack Development", category: "Development", price: 5000, instructor: "Tunde Adebayo", status: "Published", enrolled: 182, completion: 64, description: "Build complete websites and web applications with frontend, backend and database skills.", modules: "Web fundamentals\nFrontend foundations\nBackend APIs\nDatabases and deployment", materials: "https://example.com/fullstack-guide.pdf", requirements: "Complete all core modules and submit the portfolio project.", assignments: "Build and deploy a responsive portfolio website.", quizzes: "Web fundamentals quiz\nJavaScript and API quiz", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-120) },
    { id: "c-frontend", title: "Frontend Development", category: "Development", price: 5000, instructor: "Ada Okafor", status: "Published", enrolled: 146, completion: 71, description: "Master HTML, CSS and JavaScript to create beautiful, responsive websites.", modules: "HTML and accessibility\nCSS and responsive layouts\nJavaScript fundamentals\nModern frontend projects", materials: "", requirements: "Complete all core lessons and submit the final website project.", assignments: "Create a responsive product landing page.", quizzes: "HTML and accessibility quiz\nCSS layout quiz", thumbnail: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-105) },
    { id: "c-ai", title: "AI Automation", category: "Artificial Intelligence", price: 5000, instructor: "Ifeanyi Okoro", status: "Published", enrolled: 129, completion: 53, description: "Use AI tools and automation platforms to build intelligent workflows.", modules: "AI foundations\nWorkflow automation\nConnecting business tools\nBuild an automation project", materials: "", requirements: "Submit one working automation and complete the final quiz.", assignments: "Create an automated lead follow-up workflow.", quizzes: "Workflow automation fundamentals", thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-89) },
    { id: "c-voice", title: "AI Voice Agent", category: "Artificial Intelligence", price: 5000, instructor: "Chika Nwosu", status: "Published", enrolled: 87, completion: 46, description: "Create voice agents that communicate, help customers and automate conversations.", modules: "Voice AI fundamentals\nConversation design\nAgent integrations\nTesting and deployment", materials: "", requirements: "Build, test and document a working voice-agent prototype.", assignments: "Design a helpful customer-support voice agent.", quizzes: "Voice agent safety and conversation design", thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-70) },
    { id: "c-vibe", title: "Vibe Coding & Google AdSense", category: "Development", price: 5000, instructor: "Tunde Adebayo", status: "Published", enrolled: 94, completion: 39, description: "Build digital products with AI-assisted coding and explore website monetization.", modules: "AI-assisted prototyping\nCreate a web product\nContent and publishing\nMonetization basics", materials: "", requirements: "Publish a simple project and complete the monetization knowledge check.", assignments: "Build and publish a small useful website.", quizzes: "Content quality and AdSense policy quiz", thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-55) },
    { id: "c-ux", title: "UI/UX Design", category: "Design", price: 5000, instructor: "Ada Okafor", status: "Published", enrolled: 118, completion: 68, description: "Learn wireframing, prototyping and user-friendly digital product design.", modules: "Design thinking\nResearch and personas\nWireframes and prototypes\nUsability and handoff", materials: "", requirements: "Submit a case study and a clickable prototype.", assignments: "Redesign a familiar mobile app flow.", quizzes: "Accessibility and usability quiz", thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-44) },
    { id: "c-graphics", title: "Graphics Design", category: "Design", price: 5000, instructor: "Zainab Musa", status: "Published", enrolled: 103, completion: 62, description: "Develop creative skills in branding, social media graphics and visual communication.", modules: "Design fundamentals\nColor and typography\nBranding projects\nSocial media campaigns", materials: "", requirements: "Submit a mini brand kit with three design assets.", assignments: "Design a social media campaign for a local business.", quizzes: "Color, typography and visual hierarchy", thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-31) },
    { id: "c-mobile", title: "Mobile App Development", category: "Development", price: 5000, instructor: "Ifeanyi Okoro", status: "Draft", enrolled: 0, completion: 0, description: "Create mobile applications and turn ideas into functional Android and iOS experiences.", modules: "Mobile app foundations\nInterface and navigation\nConnect to APIs\nBuild and test an app", materials: "", requirements: "Complete the core lessons and submit a tested mobile app prototype.", assignments: "Build an app with navigation and one data-driven screen.", quizzes: "Mobile app fundamentals", thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-12) },
    { id: "c-cybersecurity", title: "Cybersecurity Fundamentals", category: "Cybersecurity", price: 5000, instructor: "Chika Nwosu", status: "Published", enrolled: 0, completion: 0, description: "Learn ethical, defensive security practices for protecting accounts, networks and digital information.", modules: "Security foundations and ethics\nThreat modeling and risk management\nIdentity, access and network defense\nSecure software and data protection\nIncident response and recovery\nSecurity awareness capstone", materials: "", requirements: "Complete the core lessons and submit a defensive security plan.", assignments: "Create a security awareness and incident response plan for a small organization.", quizzes: "Security foundations and safe practice", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(0) }
  ],
  categories: ["Development", "Artificial Intelligence", "Design", "Digital marketing"],
  students: [
    { id: "s-1001", name: "Amara Okafor", email: "amara.okafor@example.com", joined: day(-1), status: "Active", courses: ["c-fullstack", "c-frontend"], progress: 68, initials: "AO", certificate: "In progress", activity: "Completed a project lesson; last active today." },
    { id: "s-1002", name: "Emeka Nnamdi", email: "emeka.n@example.com", joined: day(-2), status: "Active", courses: ["c-ai"], progress: 42, initials: "EN", certificate: "In progress", activity: "Submitted an AI automation assignment." },
    { id: "s-1003", name: "Zainab Musa", email: "zainab.m@example.com", joined: day(-3), status: "Active", courses: ["c-ux", "c-graphics"], progress: 76, initials: "ZM", certificate: "Eligible", activity: "Completed a design portfolio lesson." },
    { id: "s-1004", name: "Daniel Eze", email: "daniel.eze@example.com", joined: day(-4), status: "Suspended", courses: ["c-fullstack"], progress: 23, initials: "DE", certificate: "Not eligible", activity: "Account suspended in sample data." },
    { id: "s-1005", name: "Kemi Balogun", email: "kemi.b@example.com", joined: day(-5), status: "Active", courses: ["c-vibe"], progress: 35, initials: "KB", certificate: "In progress", activity: "Viewed the latest course announcement." },
    { id: "s-1006", name: "Tobi Adeyemi", email: "tobi.a@example.com", joined: day(-7), status: "Active", courses: ["c-frontend"], progress: 89, initials: "TA", certificate: "Eligible", activity: "Completed the responsive website project." },
    { id: "s-1007", name: "Chinwe Obi", email: "chinwe.o@example.com", joined: day(-9), status: "Active", courses: ["c-ai", "c-voice"], progress: 51, initials: "CO", certificate: "In progress", activity: "Booked a mentorship session." },
    { id: "s-1008", name: "Bola Yusuf", email: "bola.y@example.com", joined: day(-12), status: "Active", courses: ["c-mobile"], progress: 8, initials: "BY", certificate: "Not eligible", activity: "Started the mobile app course." },
    { id: "s-1009", name: "Femi Johnson", email: "femi.j@example.com", joined: day(-16), status: "Active", courses: ["c-fullstack"], progress: 57, initials: "FJ", certificate: "In progress", activity: "Last signed in two days ago." },
    { id: "s-1010", name: "Ngozi Eze", email: "ngozi.e@example.com", joined: day(-22), status: "Active", courses: ["c-graphics"], progress: 92, initials: "NE", certificate: "Issued", activity: "Certificate issued after course completion." }
  ],
  opportunityInterests: [
    { id: "INT-01", student: "Amara Okafor", opportunity: "Junior Frontend Developer", date: day(-1) },
    { id: "INT-02", student: "Tobi Adeyemi", opportunity: "Product Design Internship", date: day(-2) }
  ],
  payments: [
    { id: "TXN-80421", studentId: "s-1001", courseId: "c-fullstack", amount: 5000, fee: 175, status: "Successful", date: day(0), method: "Card" },
    { id: "TXN-80420", studentId: "s-1002", courseId: "c-ai", amount: 5000, fee: 175, status: "Successful", date: day(0), method: "Transfer" },
    { id: "TXN-80419", studentId: "s-1003", courseId: "c-ux", amount: 5000, fee: 175, status: "Successful", date: day(-1), method: "Card" },
    { id: "TXN-80418", studentId: "s-1005", courseId: "c-vibe", amount: 5000, fee: 175, status: "Pending", date: day(-1), method: "Transfer" },
    { id: "TXN-80417", studentId: "s-1006", courseId: "c-frontend", amount: 5000, fee: 175, status: "Successful", date: day(-2), method: "Card" },
    { id: "TXN-80416", studentId: "s-1007", courseId: "c-voice", amount: 5000, fee: 175, status: "Failed", date: day(-2), method: "Card" },
    { id: "TXN-80415", studentId: "s-1008", courseId: "c-mobile", amount: 5000, fee: 175, status: "Successful", date: day(-3), method: "Transfer" },
    { id: "TXN-80414", studentId: "s-1009", courseId: "c-fullstack", amount: 5000, fee: 175, status: "Successful", date: day(-4), method: "Card" },
    { id: "TXN-80413", studentId: "s-1010", courseId: "c-graphics", amount: 5000, fee: 175, status: "Successful", date: day(-5), method: "Card" },
    { id: "TXN-80412", studentId: "s-1003", courseId: "c-graphics", amount: 5000, fee: 175, status: "Successful", date: day(-7), method: "Transfer" }
  ],
  referrals: [
    { id: "REF-2101", name: "Kemi Balogun", email: "kemi.b@example.com", code: "KEMI-LEARN", referrals: 18, conversions: 12, commission: 36000, status: "Active" },
    { id: "REF-2102", name: "Tobi Adeyemi", email: "tobi.a@example.com", code: "TOBI-SKILL", referrals: 11, conversions: 8, commission: 24000, status: "Active" },
    { id: "REF-2103", name: "Amara Okafor", email: "amara.okafor@example.com", code: "AMARA-UP", referrals: 7, conversions: 5, commission: 15000, status: "Active" },
    { id: "REF-2104", name: "Femi Johnson", email: "femi.j@example.com", code: "FEMI-TECH", referrals: 3, conversions: 1, commission: 3000, status: "Review" }
  ],
  withdrawals: [
    { id: "WDR-0931", partner: "Kemi Balogun", amount: 12000, requested: day(-1), status: "Pending", account: "•••• 4812" },
    { id: "WDR-0930", partner: "Tobi Adeyemi", amount: 8000, requested: day(-2), status: "Pending", account: "•••• 2901" },
    { id: "WDR-0929", partner: "Amara Okafor", amount: 5000, requested: day(-5), status: "Approved", account: "•••• 6673" }
  ],
  sessions: [
    { id: "MNT-301", title: "Getting started with frontend projects", mentor: "Ada Okafor", student: "Amara Okafor", date: day(1), time: "14:00", type: "1:1 mentorship", status: "Scheduled", link: "" },
    { id: "MNT-302", title: "AI automation: live Q&A", mentor: "Ifeanyi Okoro", student: "Group session", date: day(2), time: "16:30", type: "Live training", status: "Scheduled", link: "" },
    { id: "MNT-303", title: "Portfolio project review", mentor: "Tunde Adebayo", student: "Emeka Nnamdi", date: day(-1), time: "11:00", type: "Assignment review", status: "Completed", link: "" }
  ],
  reviews: [
    { id: "REV-401", type: "Assignment", title: "Responsive portfolio project", student: "Amara Okafor", course: "Frontend Development", submitted: day(-1), status: "Pending review", feedback: "" },
    { id: "REV-402", type: "Question", title: "How do I structure reusable API routes?", student: "Emeka Nnamdi", course: "Full Stack Development", submitted: day(-2), status: "Pending response", feedback: "" },
    { id: "REV-403", type: "Assignment", title: "Automation workflow project", student: "Chinwe Obi", course: "AI Automation", submitted: day(-3), status: "Reviewed", feedback: "Clear workflow. Add error handling for failed steps." }
  ],
  jobs: [
    { id: "JOB-501", title: "Junior Frontend Developer", company: "Northstar Digital", type: "Remote role", location: "Remote · Nigeria", verified: true, status: "Published", date: day(-2), link: "https://example.com/opportunity" },
    { id: "JOB-502", title: "Product Design Internship", company: "Open Canvas Studio", type: "Internship", location: "Remote · Africa", verified: true, status: "Published", date: day(-6), link: "https://example.com/internship" },
    { id: "JOB-503", title: "No-code Automation Project", company: "Community listing", type: "Freelance", location: "Remote", verified: false, status: "Draft", date: day(-1), link: "https://example.com/freelance" }
  ],
  resources: [
    { id: "RES-701", title: "CV template for early-career developers", category: "CV template", link: "https://example.com/cv-template", status: "Published" },
    { id: "RES-702", title: "Technical interview preparation guide", category: "Interview preparation", link: "https://example.com/interview-guide", status: "Published" },
    { id: "RES-703", title: "Freelance application checklist", category: "Application guide", link: "https://example.com/freelance-guide", status: "Draft" }
  ],
  faqs: [
    { id: "FAQ-01", question: "How do I get started?", answer: "Explore the courses, choose a skill that matches your goals and follow the enrolment steps to begin learning.", status: "Published" },
    { id: "FAQ-02", question: "Do I need previous experience?", answer: "Many of our courses can accommodate beginners. Check the individual course requirements before enrolling.", status: "Published" },
    { id: "FAQ-03", question: "Will I receive mentorship?", answer: "Mentorship and learning support are part of the SKILL-UP learning experience, according to the support arrangements for each programme.", status: "Published" },
    { id: "FAQ-04", question: "Can SKILL-UP help me secure remote jobs?", answer: "We provide career preparation and support for finding opportunities. Employment is not guaranteed.", status: "Published" }
  ],
  admins: [
    { id: "ADM-001", name: "Site Admin", email: "admin@skill-up.local", role: "Super admin", status: "Active" },
    { id: "ADM-002", name: "Content Manager", email: "content@skill-up.local", role: "Content admin", status: "Active" }
  ],
  testimonials: [
    { id: "TST-01", name: "Amara O.", quote: "The project feedback helped me understand how to improve my portfolio.", role: "Frontend learner", status: "Published" },
    { id: "TST-02", name: "Kemi B.", quote: "Having a clear learning path made it easier to keep moving forward.", role: "Digital skills learner", status: "Draft" }
  ],
  campaigns: [],
  announcements: [],
  siteContent: { headline: "Learn digital skills. Get mentored. Build your career.", announcement: "", bannerUrl: "", contactEmail: "hello@skill-up.ng", privacyPolicy: "", terms: "" },
  activity: [
    { id: "ACT-01", message: "Course published: UI/UX Design", by: "Site Admin", date: day(0) },
    { id: "ACT-02", message: "Withdrawal request submitted by Kemi Balogun", by: "Referral programme", date: day(-1) },
    { id: "ACT-03", message: "New mentorship session scheduled", by: "Ada Okafor", date: day(-1) }
  ],
  settings: { referralRate: 15, gateway: "Paystack (demo)", emailNotifications: true, maintenanceMode: false },
  audit: [{ id: "LOG-001", action: "Local demo workspace initialized", by: "Site Admin", date: day(0) }]
});

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function serializePublicContent(data) {
  return [
    { id: "homepage", kind: "homepage", status: "Published", data: data.siteContent },
    ...["faqs", "jobs", "resources", "testimonials", "announcements"].flatMap((key) => {
      const kind = { faqs: "faq", jobs: "job", resources: "resource", testimonials: "testimonial", announcements: "announcement" }[key];
      return (data[key] || []).map((item) => ({ id: `${kind}:${item.id}`, kind, status: item.status || "Draft", data: item }));
    })
  ];
}

async function readData() {
  const [
    { data: remoteWorkspace, error: workspaceError },
    { data: remoteCourses, error: coursesError },
    { data: remoteProfiles, error: profilesError },
    { data: remoteEnrollments, error: enrollmentsError },
    { data: remoteLearnerWorkspaces, error: learnerWorkspacesError },
    { data: remoteContent, error: contentError }
  ] = await Promise.all([
    supabaseClient.from("admin_workspaces").select("data").eq("id", WORKSPACE_ID).maybeSingle(),
    supabaseClient.from("courses").select("id,status,data"),
    supabaseClient.from("profiles").select("id,email,full_name,role,created_at"),
    supabaseClient.from("enrollments").select("user_id,course_id,status,purchased_at,amount,receipt"),
    supabaseClient.from("learner_workspaces").select("user_id,data"),
    supabaseClient.from("public_content").select("id,kind,status,data")
  ]);
  if (workspaceError) throw workspaceError;
  if (coursesError) throw coursesError;
  if (profilesError) throw profilesError;
  if (enrollmentsError) throw enrollmentsError;
  if (learnerWorkspacesError) throw learnerWorkspacesError;
  if (contentError) throw contentError;

  let legacyData = null;
  if (!remoteWorkspace) {
    try { legacyData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { legacyData = null; }
  }
  const defaults = initialState();
  const source = remoteWorkspace?.data || legacyData || defaults;
  const loaded = Object.fromEntries(Object.keys(defaults).map((key) => [key, source[key] ?? defaults[key]]));
  if (!remoteWorkspace && !legacyData) {
    ["students", "opportunityInterests", "payments", "referrals", "withdrawals", "sessions", "reviews", "jobs", "resources", "faqs", "admins", "testimonials", "campaigns", "announcements", "activity", "audit"].forEach((key) => { loaded[key] = []; });
    loaded.categories = [];
  }
  loaded.courses = remoteCourses.map((course) => ({ ...course.data, status: course.status }));
  const enrollmentsByUser = new Map();
  remoteEnrollments.forEach((enrollment) => {
    const courseIds = enrollmentsByUser.get(enrollment.user_id) || [];
    courseIds.push(enrollment.course_id);
    enrollmentsByUser.set(enrollment.user_id, courseIds);
  });
  loaded.students = remoteProfiles.filter((profile) => profile.role === "learner").map((profile) => ({
      id: profile.id,
      name: profile.full_name || profile.email,
      email: profile.email,
      joined: profile.created_at.slice(0, 10),
      status: "Active",
      courses: enrollmentsByUser.get(profile.id) || [],
      progress: 0,
      source: "supabase"
    }));
  loaded.payments = remoteEnrollments.map((enrollment) => ({
    id: enrollment.receipt || `${enrollment.user_id}:${enrollment.course_id}`,
    userId: enrollment.user_id,
    studentId: enrollment.user_id,
    courseId: enrollment.course_id,
    amount: Number(enrollment.amount),
    fee: 0,
    status: enrollment.status,
    date: enrollment.purchased_at,
    method: "Enrollment record"
  }));
  loaded.admins = remoteProfiles.filter((profile) => profile.role === "admin").map((profile) => ({
    id: profile.id,
    name: profile.full_name || profile.email,
    email: profile.email,
    role: "Administrator",
    status: "Active",
    source: "supabase"
  }));
  if (!remoteContent.length) {
    const seedContent = serializePublicContent(loaded);
    if (seedContent.length) {
      const { error } = await supabaseClient.from("public_content").upsert(seedContent);
      if (error) throw error;
      remoteContent.push(...seedContent);
    }
  }
  const contentByKind = (kind) => remoteContent.filter((item) => item.kind === kind).map((item) => item.data);
  loaded.siteContent = contentByKind("homepage")[0] || loaded.siteContent;
  loaded.faqs = contentByKind("faq");
  loaded.jobs = contentByKind("job");
  loaded.resources = contentByKind("resource");
  loaded.testimonials = contentByKind("testimonial");
  loaded.announcements = contentByKind("announcement");
  const profilesById = new Map(remoteProfiles.map((profile) => [profile.id, profile]));
  const workspaceEntries = remoteLearnerWorkspaces.map((entry) => ({
    userId: entry.user_id,
    profile: profilesById.get(entry.user_id),
    data: entry.data || {}
  }));
  const storedWithdrawals = new Map(loaded.withdrawals.map((request) => [request.id, request]));
  const learnerSessions = workspaceEntries.flatMap(({ userId, profile, data }) => (data.sessions || []).map((session) => ({
    ...session,
    id: `${userId}:${session.id}`,
    userId,
    sourceSessionId: session.id,
    student: session.student || profile?.full_name || profile?.email || "Learner",
    source: "learner"
  })));
  const learnerQuestions = workspaceEntries.flatMap(({ userId, profile, data }) => (data.questions || []).map((question) => ({
    id: `question:${question.id}`,
    userId,
    questionId: question.id,
    type: "Question",
    title: question.title,
    student: profile?.full_name || profile?.email || "Learner",
    course: loaded.courses.find((course) => course.id === question.courseId)?.title || "Course",
    submitted: question.date,
    status: question.answer ? "Responded" : question.status,
    feedback: question.answer || "",
    source: "learner"
  })));
  const learnerAssignments = workspaceEntries.flatMap(({ userId, profile, data }) => Object.entries(data.progress || {})
    .filter(([, progress]) => progress.assignment)
    .map(([courseId, progress]) => ({
      id: `assignment:${userId}:${courseId}`,
      userId,
      courseId,
      type: "Assignment",
      title: progress.assignment,
      student: profile?.full_name || profile?.email || "Learner",
      course: loaded.courses.find((course) => course.id === courseId)?.title || "Course",
      submitted: progress.assignmentDate || "",
      status: progress.feedback ? "Reviewed" : "Pending review",
      feedback: progress.feedback || "",
      source: "learner"
    })));
  const learnerReferrals = workspaceEntries.flatMap(({ profile, data }) => {
    const referral = data.referral;
    if (!profile || !referral?.active) return [];
    const stored = loaded.referrals.find((item) => item.email === profile.email || item.id === profile.id) || {};
    return [{
      id: profile.id,
      name: profile.full_name || profile.email,
      email: profile.email,
      code: referral.code || "",
      referrals: Number(referral.registrations) || 0,
      conversions: Number(referral.conversions) || 0,
      commission: Number(referral.commission) || 0,
      status: stored.status || "Active",
      source: "learner"
    }];
  });
  const learnerWithdrawals = workspaceEntries.flatMap(({ profile, data }) => (data.referral?.withdrawals || []).map((request) => ({
    ...request,
    id: request.id,
    partner: profile?.full_name || profile?.email || "Learner",
    requested: request.date,
    account: request.method,
    ...(storedWithdrawals.get(request.id) || {}),
    source: "learner"
  })));
  loaded.sessions = [...loaded.sessions.filter((session) => session.source !== "learner"), ...learnerSessions];
  loaded.reviews = [...loaded.reviews.filter((review) => review.source !== "learner"), ...learnerQuestions, ...learnerAssignments];
  loaded.referrals = [...loaded.referrals.filter((referral) => referral.source !== "learner"), ...learnerReferrals];
  loaded.withdrawals = [...loaded.withdrawals.filter((request) => request.source !== "learner"), ...learnerWithdrawals];

  if (!remoteWorkspace) {
    const { error } = await supabaseClient.from("admin_workspaces").upsert({ id: WORKSPACE_ID, data: loaded });
    if (error) throw error;
  }
  return loaded;
}

let state;
try {
  state = await readData();
} catch (error) {
  mainContent.innerHTML = `<section class="panel"><div class="panel-body"><h2>Could not connect to Supabase</h2><p>${escapeHTML(error.message || "Check the database schema and project configuration, then reload.")}</p></div></section>`;
  return;
}
let activeView = "dashboard";
let chartRange = "week";
let activeFilters = { search: "", status: "All" };
let modalPreviousFocus = null;

let persistQueue = Promise.resolve();
function persist() {
  const snapshot = JSON.parse(JSON.stringify(state));
  snapshot.students = snapshot.students.filter((student) => student.source !== "supabase");
  persistQueue = persistQueue.then(async () => {
    const { error: workspaceError } = await supabaseClient.from("admin_workspaces").upsert({ id: WORKSPACE_ID, data: snapshot });
    if (workspaceError) throw workspaceError;
    const { error: coursesError } = await supabaseClient.from("courses").upsert(snapshot.courses.map((course) => ({ id: course.id, status: course.status, data: course })));
    if (coursesError) throw coursesError;
    const publicContent = serializePublicContent(snapshot);
    const { error: publicContentError } = await supabaseClient.from("public_content").upsert(publicContent);
    if (publicContentError) throw publicContentError;
    const publicContentIds = new Set(publicContent.map((item) => item.id));
    const staleContent = (await supabaseClient.from("public_content").select("id")).data?.filter((item) => !publicContentIds.has(item.id)).map((item) => item.id) || [];
    if (staleContent.length) {
      const { error: deleteContentError } = await supabaseClient.from("public_content").delete().in("id", staleContent);
      if (deleteContentError) throw deleteContentError;
    }
    const { data: storedCourses, error: storedCoursesError } = await supabaseClient.from("courses").select("id");
    if (storedCoursesError) throw storedCoursesError;
    const activeIds = new Set(snapshot.courses.map((course) => course.id));
    const removedIds = storedCourses.filter((course) => !activeIds.has(course.id)).map((course) => course.id);
    if (removedIds.length) {
      const { error: deleteError } = await supabaseClient.from("courses").delete().in("id", removedIds);
      if (deleteError) throw deleteError;
    }
  }).catch((error) => notify(`Supabase could not save this change: ${error.message || "Database request failed."}`, "error"));
  return true;
}

function commit(mutator, message) {
  const previous = JSON.stringify(state);
  mutator();
  if (!persist()) {
    state = JSON.parse(previous);
    render();
    return false;
  }
  render();
  if (message) notify(message);
  return true;
}

async function updateLearnerSession(session, remove = false) {
  const { data: workspace, error: readError } = await supabaseClient.from("learner_workspaces").select("data").eq("user_id", session.userId).maybeSingle();
  if (readError) throw readError;
  if (!workspace) throw new Error("The learner workspace for this session no longer exists.");
  const learnerData = workspace.data || {};
  const sessions = learnerData.sessions || [];
  const sessionIndex = sessions.findIndex((item) => item.id === session.sourceSessionId);
  if (sessionIndex < 0) throw new Error("The learner session could not be found.");
  if (remove) sessions.splice(sessionIndex, 1);
  else sessions[sessionIndex].status = "Completed";
  learnerData.sessions = sessions;
  const { error: saveError } = await supabaseClient.from("learner_workspaces").upsert({ user_id: session.userId, data: learnerData });
  if (saveError) throw saveError;
}

function notify(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.textContent = message;
  document.querySelector("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function money(value) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function compact(value) {
  return new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function dateLabel(value) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? escapeHTML(value) : new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function relativeDate(value) {
  if (!value) return "";
  const days = Math.round((new Date(`${value}T00:00:00`) - new Date(`${day(0)}T00:00:00`)) / 86400000);
  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  return days < 0 ? `${Math.abs(days)} days ago` : `In ${days} days`;
}

function statusBadge(status) {
  const className = String(status).toLowerCase().replace(/[^a-z]+/g, "-");
  return `<span class="status-badge status-${escapeHTML(className)}">${escapeHTML(status)}</span>`;
}

function initials(name) {
  return String(name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function avatar(name, variant = "") {
  return `<span class="avatar ${variant}">${escapeHTML(initials(name))}</span>`;
}

function courseById(id) { return state.courses.find((item) => item.id === id); }
function studentById(id) { return state.students.find((item) => item.id === id); }
function courseName(id) { return courseById(id)?.title || "Course unavailable"; }
function studentName(id) { return studentById(id)?.name || "Student unavailable"; }

function heading(title, description, actions = "") {
  return `<div class="page-heading"><div><p class="heading-eyebrow">SKILL-UP ADMIN WORKSPACE</p><h1>${escapeHTML(title)}</h1><p>${description}</p></div><div class="page-actions">${actions}</div></div>`;
}

function tableShell(toolbar, columns, rows, emptyMessage = "Nothing to show yet.") {
  return `<div class="panel data-panel"><div class="table-toolbar">${toolbar}</div><div class="table-wrap"><table class="data-table"><thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="${columns.length}">${emptyMessage}</td></tr>`}</tbody></table></div></div>`;
}

function chartValues() {
  const count = chartRange === "day" ? 12 : chartRange === "week" ? 7 : 12;
  const monthDates = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (11 - index), 1);
    return date;
  });
  const labels = chartRange === "day"
    ? ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p"]
    : chartRange === "week"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : monthDates.map((date) => new Intl.DateTimeFormat("en-NG", { month: "short" }).format(date));
  const values = Array.from({ length: count }, (_, index) => {
    if (chartRange === "month") {
      const month = monthDates[index];
      return state.payments.filter((payment) => {
        const paymentDate = new Date(`${payment.date}T00:00:00`);
        return payment.status === "Successful" && paymentDate.getFullYear() === month.getFullYear() && paymentDate.getMonth() === month.getMonth();
      }).reduce((sum, payment) => sum + payment.amount, 0);
    }
    const date = new Date(today);
    date.setDate(date.getDate() + (chartRange === "day" ? 0 : index - 6));
    if (chartRange === "day") {
      return index === count - 1
        ? state.payments.filter((payment) => payment.status === "Successful" && payment.date === day(0)).reduce((sum, payment) => sum + payment.amount, 0)
        : 0;
    }
    return state.payments.filter((payment) => payment.status === "Successful" && payment.date === date.toISOString().slice(0, 10)).reduce((sum, payment) => sum + payment.amount, 0);
  });
  return { labels, values };
}

function chartMarkup() {
  const { labels, values } = chartValues();
  const maximum = Math.max(10000, ...values);
  const width = 620, height = 190, pad = { left: 36, right: 12, top: 12, bottom: 24 };
  const plotWidth = width - pad.left - pad.right, plotHeight = height - pad.top - pad.bottom;
  const points = values.map((value, index) => ({
    x: pad.left + (values.length < 2 ? plotWidth / 2 : (index * plotWidth) / (values.length - 1)),
    y: pad.top + plotHeight - (value / maximum) * plotHeight
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1).x},${pad.top + plotHeight} L${points[0].x},${pad.top + plotHeight} Z`;
  const grid = [0, 1, 2, 3].map((index) => {
    const y = pad.top + index * (plotHeight / 3);
    return `<line class="chart-gridline" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line><text class="chart-label" x="0" y="${y + 3}">${compact(Math.round(maximum * (1 - index / 3)))}</text>`;
  }).join("");
  const labelMarkup = labels.map((label, index) => `<text class="chart-label" text-anchor="middle" x="${points[index].x}" y="${height - 3}">${escapeHTML(label)}</text>`).join("");
  const circles = points.map((point) => `<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="3.2"></circle>`).join("");
  return `<svg class="revenue-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Revenue trend chart for the selected period"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#00a88f" stop-opacity=".2"></stop><stop offset="100%" stop-color="#00a88f" stop-opacity="0"></stop></linearGradient></defs>${grid}<path class="chart-area" d="${area}"></path><path class="chart-path" d="${line}"></path>${circles}${labelMarkup}</svg>`;
}

function renderDashboard() {
  const activeStudents = state.students.filter((item) => item.status === "Active").length;
  const revenue = state.payments.filter((item) => item.status === "Successful").reduce((sum, item) => sum + item.amount, 0);
  const commission = state.referrals.reduce((sum, item) => sum + item.commission, 0);
  const pendingWithdrawals = state.withdrawals.filter((item) => item.status === "Pending").length;
  const successfulPayments = state.payments.filter((item) => item.status === "Successful").length;
  const statData = [
    ["Registered students", state.students.length, "♙", "Active learner accounts", ""],
    ["Active students", activeStudents, "↗", `${state.students.length ? Math.round((activeStudents / state.students.length) * 100) : 0}% of registered learners`, "coral"],
    ["Referral partners", state.referrals.length, "◎", "Registered partner accounts", "violet"],
    ["Available courses", state.courses.filter((item) => item.status === "Published").length, "▤", `${state.courses.length} total in course library`, "amber"],
    ["Course purchases", successfulPayments, "⌑", "Successful transactions", ""],
    ["Revenue generated", money(revenue), "↗", "Gross successful sales", "coral"],
    ["Referral commissions", money(commission), "✳", "Recorded partner commissions", "violet"],
    ["Pending withdrawals", pendingWithdrawals, "◷", "Requests awaiting review", "amber"]
  ];
  const stats = statData.map(([label, value, icon, foot, color]) => `<article class="stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${color}">${icon}</span></div><strong class="stat-value">${value}</strong><div class="stat-foot"><span>${foot}</span></div></article>`).join("");
  const transactions = state.payments.slice(0, 5).map((payment, index) => `<div class="activity-item">${avatar(studentName(payment.studentId), ["", "avatar-rose", "avatar-blue", "avatar-violet", "avatar-amber"][index])}<div class="activity-copy"><strong>${escapeHTML(studentName(payment.studentId))} · ${escapeHTML(courseName(payment.courseId))}</strong><small>${escapeHTML(payment.id)} · ${relativeDate(payment.date)}</small></div><span class="activity-amount">${payment.status === "Successful" ? money(payment.amount) : statusBadge(payment.status)}</span></div>`).join("");
  const registrations = [...state.students].sort((a, b) => b.joined.localeCompare(a.joined)).slice(0, 5).map((student, index) => `<div class="activity-item">${avatar(student.name, ["avatar-blue", "avatar-rose", "avatar-violet", "avatar-amber", ""][index])}<div class="activity-copy"><strong>${escapeHTML(student.name)}</strong><small>${escapeHTML(student.email)}</small></div><span class="muted">${relativeDate(student.joined)}</span></div>`).join("");
  const rangeLabel = { day: "Today", week: "This week", month: "This month" }[chartRange];
  return `${heading("Dashboard overview", "Welcome back. Here's what's happening across your learning platform today.", `<button class="button button-soft" data-action="export-report"><span class="button-icon">↓</span> Export report</button>`)}
    <div class="inline-note"><span>ⓘ</span><div><strong>Supabase workspace.</strong> Workspace edits are saved to the database. The displayed payment, activity, and learner metrics remain sample records, not verified platform analytics.</div></div>
    <section class="stats-grid" aria-label="Platform totals">${stats}</section>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><h2>Revenue analytics</h2><p>${rangeLabel} performance · gross successful sales</p></div><div class="chart-controls" role="group" aria-label="Chart time range">${["day", "week", "month"].map((range) => `<button class="chart-range${chartRange === range ? " active" : ""}" data-range="${range}">${{ day: "Daily", week: "Weekly", month: "Monthly" }[range]}</button>`).join("")}</div></div><div class="panel-body"><div class="chart-legend"><span><i class="legend-dot"></i>Course revenue</span><span class="muted">NGN</span></div><div class="chart-wrap">${chartMarkup()}</div></div></section>
      <section class="panel"><div class="panel-header"><div><h2>Performance snapshot</h2><p>${rangeLabel} platform health</p></div></div><div class="panel-body"><div class="insights-list">
        <div class="insight-row"><span>Successful sales</span><strong>${successfulPayments}</strong></div><div class="insight-row"><span>Pending payments</span><strong>${state.payments.filter((item) => item.status === "Pending").length}</strong></div><div class="insight-row"><span>Failed payments</span><strong>${state.payments.filter((item) => item.status === "Failed").length}</strong></div><div class="insight-row"><span>Average course progress</span><strong>${state.students.length ? Math.round(state.students.reduce((sum, item) => sum + item.progress, 0) / state.students.length) : 0}%</strong></div><div class="insight-row"><span>Published opportunities</span><strong>${state.jobs.filter((item) => item.status === "Published").length}</strong></div></div><div class="insight-note"><b>↗</b><span>Course purchases are shown as demo records. A payment gateway integration is required for verified financial reporting.</span></div></div></section>
    </div>
    <div class="two-panels">
      <section class="panel"><div class="panel-header"><div><h2>Recent transactions</h2><p>Latest payment activity</p></div><button class="view-all" data-view="finance">View all →</button></div><div class="panel-body"><div class="activity-list">${transactions || `<div class="empty-state">No transactions recorded yet.</div>`}</div></div></section>
      <section class="panel"><div class="panel-header"><div><h2>New student registrations</h2><p>Latest learner accounts</p></div><button class="view-all" data-view="students">View all →</button></div><div class="panel-body"><div class="activity-list">${registrations || `<div class="empty-state">No students registered yet.</div>`}</div></div></section>
    </div>`;
}

function renderCourses() {
  const categories = state.categories;
  const search = activeFilters.search.toLowerCase();
  const filtered = state.courses.filter((course) => (`${course.title} ${course.category} ${course.instructor}`).toLowerCase().includes(search)
    && (activeFilters.status === "All" || course.status === activeFilters.status));
  const cards = filtered.map((course) => `<article class="course-admin-card"><div class="course-banner">${course.banner || course.thumbnail ? `<img src="${escapeHTML(course.banner || course.thumbnail)}" alt="" loading="lazy">` : ""}${statusBadge(course.status)}</div><div class="course-card-body"><div class="course-card-meta"><span>${escapeHTML(course.category)}</span><strong>${money(course.price)}</strong></div><h3>${escapeHTML(course.title)}</h3><p>${escapeHTML(course.description)}</p><div class="course-card-stats"><span>Enrolled <strong>${course.enrolled}</strong></span><span>Avg. progress <strong>${course.completion}%</strong></span></div><div class="course-card-meta"><span>Instructor</span><strong>${escapeHTML(course.instructor)}</strong></div><div class="course-card-actions"><button class="text-button" data-action="course-details" data-id="${course.id}">Details</button><button class="text-button" data-action="edit-course" data-id="${course.id}">Edit</button><button class="text-button" data-action="toggle-course" data-id="${course.id}">${course.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="archive-course" data-id="${course.id}">${course.status === "Archived" ? "Delete" : "Archive"}</button></div></div></article>`).join("");
  const toolbar = `<div class="toolbar-left"><div class="search-field"><input type="search" data-filter="search" placeholder="Search courses…" value="${escapeHTML(activeFilters.search)}" aria-label="Search courses"></div><select class="field-control" data-filter="status" aria-label="Filter course status"><option>All</option>${["Published", "Draft", "Archived"].map((item) => `<option${activeFilters.status === item ? " selected" : ""}>${item}</option>`).join("")}</select></div><div class="toolbar-right"><span class="muted">${filtered.length} courses shown · ${categories.length} categories</span></div>`;
  return `${heading("Course management", "Create and organize your courses, learning materials, instructors and publishing status.", `<button class="button button-soft" data-action="add-category"><span class="button-icon">＋</span> Add category</button><button class="button button-primary" data-action="add-course"><span class="button-icon">＋</span> Create course</button>`)}
    <div class="inline-note"><span>ⓘ</span><div>Course changes are saved in this browser only. Uploads are stored as local data and are not hosted or available to other users.</div></div>
    <div class="panel data-panel"><div class="table-toolbar">${toolbar}</div></div>
    <div class="course-list">${cards || `<div class="panel empty-state"><strong>No matching courses</strong>Try a different search or create a course.</div>`}</div>`;
}

function renderStudents() {
  const search = activeFilters.search.toLowerCase();
  const filtered = state.students.filter((student) => (`${student.name} ${student.email} ${student.id}`).toLowerCase().includes(search)
    && (activeFilters.status === "All" || student.status === activeFilters.status));
  const rows = filtered.map((student) => `<tr><td><div class="cell-primary">${avatar(student.name)}<span><strong>${escapeHTML(student.name)}</strong><small>${escapeHTML(student.source === "supabase" ? "Supabase account" : student.id)}</small></span></div></td><td>${escapeHTML(student.email)}</td><td>${dateLabel(student.joined)}</td><td>${student.courses.length}</td><td><strong>${student.progress}%</strong></td><td>${statusBadge(student.status)}</td><td><div class="table-actions"><button class="text-button" data-action="student-details" data-id="${escapeHTML(student.id)}">Profile</button>${student.source === "supabase" ? `<span class="muted">Auth-managed</span>` : `<button class="text-button${student.status === "Active" ? " danger" : ""}" data-action="toggle-student" data-id="${escapeHTML(student.id)}">${student.status === "Active" ? "Suspend" : "Reactivate"}</button>`}</div></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><div class="search-field"><input type="search" data-filter="search" placeholder="Search students…" value="${escapeHTML(activeFilters.search)}" aria-label="Search students"></div><select class="field-control" data-filter="status" aria-label="Filter student status"><option>All</option><option${activeFilters.status === "Active" ? " selected" : ""}>Active</option><option${activeFilters.status === "Suspended" ? " selected" : ""}>Suspended</option></select></div><div class="toolbar-right"><button class="button button-soft button-small" data-action="export-students">↓ Export CSV</button></div>`;
  return `${heading("Student management", "Review registered Supabase learners and sample records from the existing finance demo.", `<span class="button button-soft">${state.students.length} records</span>`)}
    <div class="summary-cards"><div class="summary-card"><span>Total learner records</span><strong>${state.students.length}</strong><small>${state.students.filter((student) => student.source === "supabase").length} Supabase accounts</small></div><div class="summary-card"><span>Active learners</span><strong>${state.students.filter((student) => student.status === "Active").length}</strong><small>Supabase accounts and sample records</small></div><div class="summary-card"><span>Average progress</span><strong>${state.students.length ? Math.round(state.students.reduce((sum, student) => sum + student.progress, 0) / state.students.length) : 0}%</strong><small>Real learner progress is not yet normalized</small></div></div>
    ${tableShell(toolbar, ["Student", "Email", "Joined", "Courses", "Progress", "Status", "Actions"], rows, "No students match these filters.")}`;
}

function renderFinance() {
  const successful = state.payments.filter((payment) => payment.status === "Successful");
  const totals = [
    ["Gross sales", money(successful.reduce((sum, payment) => sum + payment.amount, 0)), `${successful.length} successful payments`],
    ["Gateway charges", money(successful.reduce((sum, payment) => sum + payment.fee, 0)), "Demo estimate · not verified"],
    ["Refunded", money(state.payments.filter((payment) => payment.status === "Refunded").reduce((sum, payment) => sum + payment.amount, 0)), "Recorded in this browser"]
  ];
  const search = activeFilters.search.toLowerCase();
  const filtered = state.payments.filter((payment) => (`${payment.id} ${studentName(payment.studentId)} ${courseName(payment.courseId)} ${payment.method}`).toLowerCase().includes(search)
    && (activeFilters.status === "All" || payment.status === activeFilters.status));
  const rows = filtered.map((payment) => `<tr><td><strong>${escapeHTML(payment.id)}</strong></td><td>${escapeHTML(studentName(payment.studentId))}<small class="muted"><br>${escapeHTML(studentById(payment.studentId)?.email || "")}</small></td><td>${escapeHTML(courseName(payment.courseId))}</td><td><strong>${money(payment.amount)}</strong></td><td>${money(payment.fee)}</td><td>${escapeHTML(payment.method)}</td><td>${dateLabel(payment.date)}</td><td>${statusBadge(payment.status)}</td><td><div class="table-actions">${payment.status === "Successful" ? `<button class="text-button danger" data-action="refund-payment" data-id="${payment.id}">Mark refunded</button>` : "—"}</div></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><div class="search-field"><input type="search" data-filter="search" placeholder="Search transactions…" value="${escapeHTML(activeFilters.search)}" aria-label="Search transactions"></div><select class="field-control" data-filter="status" aria-label="Filter payment status"><option>All</option>${["Successful", "Pending", "Failed", "Refunded"].map((item) => `<option${activeFilters.status === item ? " selected" : ""}>${item}</option>`).join("")}</select></div><div class="toolbar-right"><button class="button button-soft button-small" data-action="export-payments">↓ Financial CSV</button></div>`;
  return `${heading("Payments & finance", "Review payment records, transaction statuses and course revenue.", `<span class="button button-soft">Demo records only</span>`)}
    <div class="inline-note"><span>ⓘ</span><div><strong>Demo finance controls.</strong> Payments, gateway fees and refunds here are sample records. Refund actions only change local status; no real charge or refund is processed. Webhook verification requires a server integration.</div></div>
    <div class="summary-cards">${totals.map(([label, value, foot]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong><small>${foot}</small></div>`).join("")}</div>
    ${tableShell(toolbar, ["Transaction", "Student", "Course", "Amount", "Gateway fee", "Method", "Date", "Status", "Action"], rows, "No transactions match these filters.")}`;
}

function renderReferrals() {
  const rows = [...state.referrals].sort((a, b) => b.conversions - a.conversions).map((referral) => `<tr><td><div class="cell-primary">${avatar(referral.name)}<span><strong>${escapeHTML(referral.name)}</strong><small>${escapeHTML(referral.email)}</small></span></div></td><td><strong>${escapeHTML(referral.code)}</strong></td><td>${referral.referrals}</td><td>${referral.conversions}</td><td><strong>${money(referral.commission)}</strong></td><td>${statusBadge(referral.status)}</td><td><div class="table-actions"><button class="text-button" data-action="referral-details" data-id="${referral.id}">Details</button><button class="text-button" data-action="adjust-commission" data-id="${referral.id}">Adjust</button></div></td></tr>`).join("");
  const withdrawals = state.withdrawals.map((request) => `<tr><td><strong>${escapeHTML(request.id)}</strong></td><td>${escapeHTML(request.partner)}</td><td><strong>${money(request.amount)}</strong></td><td>${escapeHTML(request.account)}</td><td>${dateLabel(request.requested)}</td><td>${statusBadge(request.status)}</td><td><div class="table-actions">${request.status === "Pending" ? `<button class="text-button" data-action="approve-withdrawal" data-id="${request.id}">Approve</button><button class="text-button danger" data-action="reject-withdrawal" data-id="${request.id}">Reject</button>` : "—"}</div></td></tr>`).join("");
  const campaigns = state.campaigns.map((campaign) => `<tr><td><strong>${escapeHTML(campaign.name)}</strong><small class="muted"><br>${escapeHTML(campaign.id)}</small></td><td>${campaign.rate}%</td><td>${dateLabel(campaign.createdAt)}</td><td>${statusBadge(campaign.status)}</td><td><div class="table-actions"><button class="text-button" data-action="toggle-campaign" data-id="${campaign.id}">${campaign.status === "Active" ? "Pause" : "Activate"}</button><button class="text-button danger" data-action="delete-campaign" data-id="${campaign.id}">Delete</button></div></td></tr>`).join("");
  const totalCommission = state.referrals.reduce((sum, referral) => sum + referral.commission, 0);
  return `${heading("Referral management", "Monitor partner referrals, commission totals and withdrawal requests.", `<button class="button button-primary" data-action="referral-campaign"><span class="button-icon">＋</span> New campaign</button>`)}
    <div class="inline-note"><span>ⓘ</span><div>Commission approvals, adjustments and withdrawals are local demonstrations only. Verify partner identity and qualifying purchases before using a real payout system.</div></div>
    <div class="summary-cards"><div class="summary-card"><span>Referral partners</span><strong>${state.referrals.length}</strong><small>Registered demo accounts</small></div><div class="summary-card"><span>Successful referrals</span><strong>${state.referrals.reduce((sum, referral) => sum + referral.conversions, 0)}</strong><small>Sample course conversions</small></div><div class="summary-card"><span>Commissions recorded</span><strong>${money(totalCommission)}</strong><small>Unverified demo balance</small></div></div>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Referral partners & leaderboard</h2><p>Ranked by successful sample conversions</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Partner</th><th>Referral code</th><th>Clicks</th><th>Conversions</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="7">No referral partners yet.</td></tr>`}</tbody></table></div></section>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Referral campaigns</h2><p>Local campaign rules and commission rate</p></div><span class="muted">Current default: ${state.settings.referralRate}%</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Campaign</th><th>Commission</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>${campaigns || `<tr><td class="table-empty" colspan="5">No campaigns created. Add one to configure the default rate.</td></tr>`}</tbody></table></div></section>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Withdrawal requests</h2><p>${state.withdrawals.filter((request) => request.status === "Pending").length} awaiting review</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Request</th><th>Partner</th><th>Amount</th><th>Account</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>${withdrawals || `<tr><td class="table-empty" colspan="7">No withdrawal requests.</td></tr>`}</tbody></table></div></section>`;
}

function renderMentorship() {
  const rows = state.sessions.map((session) => `<tr><td><strong>${escapeHTML(session.title)}</strong><small class="muted"><br>${escapeHTML(session.type)}</small></td><td>${escapeHTML(session.mentor)}</td><td>${escapeHTML(session.student)}</td><td>${dateLabel(session.date)}<small class="muted"><br>${escapeHTML(session.time)}</small></td><td>${session.link ? `<a class="view-all" href="${escapeHTML(session.link)}" target="_blank" rel="noopener noreferrer">Open link ↗</a>` : "—"}</td><td>${statusBadge(session.status)}</td><td><div class="table-actions">${session.status === "Scheduled" ? `<button class="text-button" data-action="complete-session" data-id="${session.id}">Complete</button>` : ""}<button class="text-button danger" data-action="delete-session" data-id="${session.id}">Remove</button></div></td></tr>`).join("");
  const reviewRows = state.reviews.map((review) => `<tr><td>${statusBadge(review.type)}</td><td><strong>${escapeHTML(review.title)}</strong><small class="muted"><br>${escapeHTML(review.course)}</small></td><td>${escapeHTML(review.student)}</td><td>${dateLabel(review.submitted)}</td><td>${statusBadge(review.status)}</td><td><button class="text-button" data-action="review-submission" data-id="${review.id}">${review.status === "Reviewed" || review.status === "Responded" ? "View feedback" : review.type === "Question" ? "Respond" : "Review"}</button></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><span class="muted">${state.sessions.filter((session) => session.status === "Scheduled").length} scheduled sessions · ${state.sessions.filter((session) => session.status === "Completed").length} completed</span></div>`;
  return `${heading("Mentorship management", "Schedule mentor sessions, live training and assignment-review appointments.", `<button class="button button-primary" data-action="add-session"><span class="button-icon">＋</span> Schedule session</button>`)}
    <div class="inline-note"><span>ⓘ</span><div>Session records and links are stored locally in this browser. Live calls, learner messaging and assignment file review need connected services.</div></div>
    ${tableShell(toolbar, ["Session", "Mentor", "Student / group", "Date & time", "Session link", "Status", "Actions"], rows, "No mentorship sessions scheduled.")}
    <section class="panel data-panel"><div class="panel-header"><div><h2>Student questions & assignment reviews</h2><p>Respond to learner questions and review practical submissions</p></div><button class="button button-soft button-small" data-action="add-review">＋ Add submission</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Type</th><th>Submission</th><th>Student</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>${reviewRows || `<tr><td class="table-empty" colspan="6">No submissions waiting for review.</td></tr>`}</tbody></table></div></section>`;
}

function renderCareers() {
  const rows = state.jobs.map((job) => `<tr><td><strong>${escapeHTML(job.title)}</strong><small class="muted"><br>${escapeHTML(job.id)}</small></td><td>${escapeHTML(job.company)}</td><td>${escapeHTML(job.type)}</td><td>${escapeHTML(job.location)}</td><td>${job.verified ? statusBadge("Verified") : statusBadge("External listing")}</td><td>${statusBadge(job.status)}</td><td>${dateLabel(job.date)}</td><td><div class="table-actions"><button class="text-button" data-action="edit-job" data-id="${job.id}">Edit</button><button class="text-button" data-action="toggle-job" data-id="${job.id}">${job.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-job" data-id="${job.id}">Delete</button></div></td></tr>`).join("");
  const resourceRows = state.resources.map((resource) => `<tr><td><strong>${escapeHTML(resource.title)}</strong></td><td>${escapeHTML(resource.category)}</td><td>${resource.link ? `<a class="view-all" href="${escapeHTML(resource.link)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : "—"}</td><td>${statusBadge(resource.status)}</td><td><div class="table-actions"><button class="text-button" data-action="edit-resource" data-id="${resource.id}">Edit</button><button class="text-button" data-action="toggle-resource" data-id="${resource.id}">${resource.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-resource" data-id="${resource.id}">Delete</button></div></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><span class="muted">${state.jobs.filter((job) => job.status === "Published").length} published opportunities</span></div><div class="toolbar-right"><span class="muted">Vacancies must be verified before publishing</span></div>`;
  const interests = state.opportunityInterests.map((item) => `<tr><td>${escapeHTML(item.student)}</td><td>${escapeHTML(item.opportunity)}</td><td>${dateLabel(item.date)}</td></tr>`).join("");
  return `${heading("Careers & opportunities", "Manage remote roles, internships, freelance opportunities and career resources.", `<button class="button button-primary" data-action="add-job"><span class="button-icon">＋</span> Add opportunity</button>`)}
    <div class="inline-note"><span>ⓘ</span><div><strong>Publish genuine opportunities only.</strong> Verify each vacancy and clearly distinguish confirmed opportunities from external listings. Sample entries below are illustrative and are not live vacancies.</div></div>
    ${tableShell(toolbar, ["Opportunity", "Organization", "Type", "Location", "Verification", "Status", "Added", "Actions"], rows, "No career opportunities added yet.")}
    <section class="panel data-panel"><div class="panel-header"><div><h2>Career resources</h2><p>CV templates, interview prep and application guides</p></div><button class="button button-soft button-small" data-action="add-resource">＋ Add resource</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Resource</th><th>Category</th><th>Link</th><th>Status</th><th>Actions</th></tr></thead><tbody>${resourceRows || `<tr><td class="table-empty" colspan="5">No career resources added.</td></tr>`}</tbody></table></div></section>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Student interest</h2><p>Sample interest in listed opportunities—not submitted job applications</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Opportunity</th><th>Interest recorded</th></tr></thead><tbody>${interests || `<tr><td class="table-empty" colspan="3">No student interest recorded.</td></tr>`}</tbody></table></div></section>`;
}

function renderContent() {
  const faqRows = state.faqs.map((faq) => `<article class="faq-content-item"><strong>${escapeHTML(faq.question)}</strong><p>${escapeHTML(faq.answer)}</p><div class="table-actions"><button class="text-button" data-action="edit-faq" data-id="${faq.id}">Edit</button><button class="text-button" data-action="toggle-faq" data-id="${faq.id}">${faq.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-faq" data-id="${faq.id}">Delete</button>${statusBadge(faq.status)}</div></article>`).join("");
  const recentAnnouncements = state.announcements.slice(0, 5).map((item) => `<div class="activity-item"><span class="stat-icon">✉</span><div class="activity-copy"><strong>${escapeHTML(item.title)}</strong><small>${dateLabel(item.date)} · ${escapeHTML(item.status)}</small><p>${escapeHTML(item.body)}</p></div></div>`).join("");
  const testimonials = state.testimonials.map((item) => `<article class="faq-content-item"><strong>${escapeHTML(item.name)} · ${escapeHTML(item.role)}</strong><p>“${escapeHTML(item.quote)}”</p><div class="table-actions"><button class="text-button" data-action="edit-testimonial" data-id="${item.id}">Edit</button><button class="text-button" data-action="toggle-testimonial" data-id="${item.id}">${item.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-testimonial" data-id="${item.id}">Delete</button>${statusBadge(item.status)}</div></article>`).join("");
  return `${heading("Website & content", "Update website FAQs and draft platform announcements.", `<button class="button button-primary" data-action="add-faq"><span class="button-icon">＋</span> Add FAQ</button>`)}
    <div class="inline-note"><span>ⓘ</span><div>Published FAQs and announcements sync to the public website through Supabase. Email delivery is not connected.</div></div>
    <div class="content-grid"><section class="panel"><div class="panel-header"><div><h2>Homepage content</h2><p>Hero, banner and contact information</p></div><button class="button button-soft button-small" data-action="edit-homepage">Edit content</button></div><div class="panel-body"><div class="detail-block"><h3>Hero headline</h3><p>${escapeHTML(state.siteContent.headline)}</p></div><div class="detail-block"><h3>Announcement banner</h3><p>${escapeHTML(state.siteContent.announcement || "No announcement banner.")}</p></div><div class="detail-block"><h3>Promotional banner image</h3><p>${escapeHTML(state.siteContent.bannerUrl || "No promotional banner image.")}</p></div><div class="detail-block"><h3>Contact email</h3><p>${escapeHTML(state.siteContent.contactEmail)}</p></div><div class="detail-block"><h3>Privacy policy & terms</h3><p>${state.siteContent.privacyPolicy || state.siteContent.terms ? "Policy content saved locally." : "No legal page content saved."}</p><div class="table-actions"><button class="text-button" data-action="edit-legal">Edit legal pages</button></div></div></div></section>
    <section class="panel"><div class="panel-header"><div><h2>Frequently asked questions</h2><p>${state.faqs.length} content items</p></div><button class="button button-soft button-small" data-action="add-faq">＋ Add FAQ</button></div><div class="panel-body">${faqRows || `<div class="empty-state">No FAQs have been added.</div>`}</div></section>
    <section class="panel"><div class="panel-header"><div><h2>Testimonials</h2><p>Manage learner stories and publishing status</p></div><button class="button button-soft button-small" data-action="add-testimonial">＋ Add testimonial</button></div><div class="panel-body">${testimonials || `<div class="empty-state">No testimonials have been added.</div>`}</div></section>
    <section class="panel"><div class="panel-header"><div><h2>Announcements</h2><p>Published notices on the website; no email is sent</p></div><button class="button button-soft button-small" data-action="announcement">＋ Publish</button></div><div class="panel-body"><div class="activity-list">${recentAnnouncements || `<div class="empty-state">No announcements published.</div>`}</div></div></section></div>`;
}

function renderSettings() {
  const admins = state.admins.map((admin) => `<tr><td><strong>${escapeHTML(admin.name)}</strong><small class="muted"><br>${escapeHTML(admin.email)}</small></td><td>${escapeHTML(admin.role)}</td><td>${statusBadge(admin.status)}</td><td><div class="table-actions"><button class="text-button danger" data-action="remove-admin" data-id="${admin.id}">Remove</button></div></td></tr>`).join("");
  const audit = state.audit.slice(0, 8).map((item) => `<div class="activity-item"><span class="stat-icon violet">◷</span><div class="activity-copy"><strong>${escapeHTML(item.action)}</strong><small>${escapeHTML(item.by)} · ${dateLabel(item.date)}</small></div></div>`).join("");
  const switchRow = (title, description, key) => `<div class="setting-row"><div><strong>${title}</strong><small>${description}</small></div><button class="switch" type="button" role="switch" aria-checked="${state.settings[key]}" data-action="toggle-setting" data-key="${key}" aria-label="${title}"></button></div>`;
  return `${heading("Settings & security", "Configure the local demo workspace, review roles and inspect the activity log.", `<button class="button button-soft" data-action="reset-demo">Reset sample data</button>`)}
    <div class="inline-note"><span>ⓘ</span><div><strong>Local storage is not secure authentication.</strong> These demo roles do not protect access. Never store real passwords, payment credentials, identity documents or sensitive learner data in this browser-only prototype.</div></div>
    <div class="settings-grid">
      <section class="settings-card"><h2>Platform configuration</h2><p>Values below are local demonstration settings and do not connect to payment or email services.</p>
        <div class="setting-row"><div><strong>Referral commission rate</strong><small>Percent on eligible demo purchases</small></div><strong>${Number(state.settings.referralRate)}%</strong></div>
        <div class="setting-row"><div><strong>Payment gateway</strong><small>Integration status</small></div><strong>${escapeHTML(state.settings.gateway)}</strong></div>
        ${switchRow("Email notifications", "Toggle demo notification preference", "emailNotifications")}
        ${switchRow("Maintenance mode", "Visual prototype setting only", "maintenanceMode")}
      </section>
      <section class="settings-card"><h2>Administrator accounts</h2><p>Sample role list. Account creation, login and permissions are not enforced in this local prototype.</p>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Administrator</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${admins || `<tr><td class="table-empty" colspan="4">No administrator records.</td></tr>`}</tbody></table></div>
        <div class="page-actions" style="margin-top:12px"><button class="button button-soft button-small" data-action="add-admin">＋ Add admin record</button></div>
      </section>
      <section class="settings-card"><h2>Security & integration checklist</h2><p>These controls require a trusted server before production use.</p>
        ${["Server-side authentication and role permissions", "Verified payment gateway and webhook signatures", "Secure media storage and upload scanning", "Protected audit log and admin activity tracking"].map((item) => `<div class="setting-row"><div><strong>${item}</strong><small>Not configured in this static prototype</small></div>${statusBadge("Not connected")}</div>`).join("")}
      </section>
      <section class="settings-card"><h2>Local activity log</h2><p>Recent actions recorded in this browser.</p><div class="activity-list">${audit || `<div class="empty-state">No activity recorded yet.</div>`}</div></section>
    </div>`;
}

function render() {
  document.querySelector("#current-page").textContent = pageNames[activeView];
  navButtons.forEach((button) => {
    const active = button.dataset.view === activeView;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  activeFilters.search = activeFilters.search || "";
  mainContent.innerHTML = ({
    dashboard: renderDashboard,
    courses: renderCourses,
    students: renderStudents,
    finance: renderFinance,
    referrals: renderReferrals,
    mentorship: renderMentorship,
    careers: renderCareers,
    content: renderContent,
    settings: renderSettings
  })[activeView]();
}

function navigate(view) {
  if (!pageNames[view]) return;
  activeView = view;
  activeFilters = { search: "", status: "All" };
  sidebar.classList.remove("open");
  document.querySelector(".mobile-menu").setAttribute("aria-expanded", "false");
  render();
  mainContent.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(title, content) {
  modalPreviousFocus = document.activeElement;
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modalLayer.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => modalBody.querySelector("input, select, textarea, button")?.focus(), 0);
}

function closeModal() {
  modalLayer.hidden = true;
  document.body.style.overflow = "";
  modalBody.replaceChildren();
  modalPreviousFocus?.focus?.();
}

function field(label, name, value = "", options = {}) {
  const { type = "text", full = false, required = false, placeholder = "", help = "", choices = [], rows = 4, min, max, step } = options;
  const labelMarkup = `<label for="field-${name}">${label}${required ? " *" : ""}</label>`;
  let input;
  if (type === "select") {
    input = `<select id="field-${name}" name="${name}"${required ? " required" : ""}>${choices.map((choice) => `<option value="${escapeHTML(choice)}"${String(value) === String(choice) ? " selected" : ""}>${escapeHTML(choice)}</option>`).join("")}</select>`;
  } else if (type === "textarea") {
    input = `<textarea id="field-${name}" name="${name}" rows="${rows}" placeholder="${escapeHTML(placeholder)}"${required ? " required" : ""}>${escapeHTML(value)}</textarea>`;
  } else {
    input = `<input id="field-${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" placeholder="${escapeHTML(placeholder)}"${required ? " required" : ""}${min !== undefined ? ` min="${min}"` : ""}${max !== undefined ? ` max="${max}"` : ""}${step !== undefined ? ` step="${step}"` : ""}>`;
  }
  return `<div class="form-field${full ? " full" : ""}">${labelMarkup}${input}${help ? `<span class="help-text">${help}</span>` : ""}</div>`;
}

function formModal(title, kind, id, fields, submitText = "Save changes") {
  openModal(title, `<form data-form="${kind}" data-id="${escapeHTML(id || "")}"><div class="form-grid">${fields}</div><div class="form-actions"><button type="button" class="button button-soft" data-close-modal>Cancel</button><button type="submit" class="button button-primary">${submitText}</button></div></form>`);
}

function courseForm(course = {}) {
  return [
    field("Course title", "title", course.title || "", { required: true }),
    field("Category", "category", course.category || state.categories[0] || "", { required: true, placeholder: "Create or select a category" }),
    field("Price (NGN)", "price", course.price ?? 5000, { type: "number", min: 0, required: true }),
    field("Instructor", "instructor", course.instructor || "", { required: true }),
    field("Status", "status", course.status || "Draft", { type: "select", choices: ["Draft", "Published"] }),
    field("Thumbnail image", "thumbnailFile", "", { type: "file", full: true, help: "Optional image upload, stored as a small data URL in this browser. Maximum 1 MB." }),
    field("Thumbnail URL", "thumbnail", course.thumbnail || "", { type: "url", full: true, placeholder: "https://…" }),
    field("Banner image URL", "banner", course.banner || "", { type: "url", full: true, placeholder: "https://…" }),
    field("Course description", "description", course.description || "", { type: "textarea", full: true, required: true, rows: 3 }),
    field("Modules and lessons", "modules", course.modules || "", { type: "textarea", full: true, rows: 4, placeholder: "One module or lesson per line" }),
    field("Assignments", "assignments", course.assignments || "", { type: "textarea", full: true, rows: 2, placeholder: "One assignment per line" }),
    field("Quizzes", "quizzes", course.quizzes || "", { type: "textarea", full: true, rows: 2, placeholder: "One quiz per line" }),
    field("Completion requirements", "requirements", course.requirements || "", { type: "textarea", full: true, rows: 2 }),
    field("Learning materials / video links", "materials", course.materials || "", { type: "textarea", full: true, rows: 3, placeholder: "Add resource URLs, one per line", help: "This prototype stores links only. It does not host video or PDF files." })
  ].join("");
}

function studentDetails(student) {
  const purchased = state.payments.filter((payment) => payment.studentId === student.id);
  const courses = student.courses.map((id) => {
    const course = courseById(id);
    return course ? `<div class="insight-row"><span>${escapeHTML(course.title)}</span><strong>${student.progress}%</strong></div>` : "";
  }).join("");
  const payments = purchased.map((payment) => `<div class="insight-row"><span>${escapeHTML(payment.id)} · ${dateLabel(payment.date)}</span><strong>${money(payment.amount)} · ${escapeHTML(payment.status)}</strong></div>`).join("");
  openModal("Student profile", `<div class="detail-grid"><div class="detail-cell"><span>Name</span><strong>${escapeHTML(student.name)}</strong></div><div class="detail-cell"><span>Email</span><strong>${escapeHTML(student.email)}</strong></div><div class="detail-cell"><span>Account status</span><strong>${escapeHTML(student.status)}</strong></div><div class="detail-cell"><span>Joined</span><strong>${dateLabel(student.joined)}</strong></div><div class="detail-cell"><span>Enrolled courses</span><strong>${student.courses.length}</strong></div><div class="detail-cell"><span>Learning progress</span><strong>${student.progress}% average</strong></div></div><div class="detail-block"><h3>Courses & progress</h3>${courses || `<p>No course enrollments recorded.</p>`}</div><div class="detail-block"><h3>Payment history</h3>${payments || `<p>No payments associated with this learner in the sample records.</p>`}</div><div class="detail-block"><h3>Recent learner activity</h3><p>${escapeHTML(student.activity || "No activity recorded in this sample profile.")}</p></div><div class="detail-block"><h3>Certificate status</h3><p>${escapeHTML(student.certificate || "Not eligible")}</p><div class="table-actions"><button class="text-button" data-action="toggle-certificate" data-id="${student.id}">Update certificate status</button></div></div><div class="form-actions"><button class="button button-soft" data-close-modal>Close</button><button class="button ${student.status === "Active" ? "button-danger" : "button-primary"}" data-action="toggle-student" data-id="${student.id}">${student.status === "Active" ? "Suspend account" : "Reactivate account"}</button><button class="button button-soft" data-action="reset-access" data-id="${student.id}">Reset access</button></div>`);
}

function courseDetails(course) {
  const lessons = (course.modules || "").split("\n").filter(Boolean).map((item) => `<div class="insight-row"><span>${escapeHTML(item)}</span><strong>Lesson</strong></div>`).join("");
  openModal("Course overview", `<div class="detail-grid"><div class="detail-cell"><span>Category</span><strong>${escapeHTML(course.category)}</strong></div><div class="detail-cell"><span>Price</span><strong>${money(course.price)}</strong></div><div class="detail-cell"><span>Instructor</span><strong>${escapeHTML(course.instructor)}</strong></div><div class="detail-cell"><span>Publishing status</span><strong>${escapeHTML(course.status)}</strong></div><div class="detail-cell"><span>Enrolled students</span><strong>${course.enrolled}</strong></div><div class="detail-cell"><span>Average progress</span><strong>${course.completion}%</strong></div></div><div class="detail-block"><h3>Description</h3><p>${escapeHTML(course.description)}</p></div><div class="detail-block"><h3>Modules & lessons</h3>${lessons || `<p>No modules added.</p>`}</div><div class="detail-block"><h3>Assignments</h3><p>${escapeHTML(course.assignments || "No assignments added.")}</p></div><div class="detail-block"><h3>Quizzes</h3><p>${escapeHTML(course.quizzes || "No quizzes added.")}</p></div><div class="detail-block"><h3>Completion requirements</h3><p>${escapeHTML(course.requirements || "No completion requirements set.")}</p></div><div class="detail-block"><h3>Materials and links</h3><p>${escapeHTML(course.materials || "No resource links added.")}</p></div>`);
}

function addAudit(action) {
  state.audit.unshift({ id: `LOG-${Date.now()}`, action, by: "Site Admin", date: day(0) });
  state.audit = state.audit.slice(0, 50);
  state.activity.unshift({ id: `ACT-${Date.now()}`, message: action, by: "Site Admin", date: day(0) });
  state.activity = state.activity.slice(0, 30);
}

function exportCsv(filename, headers, rows) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const contents = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  notify(`${filename} downloaded.`);
}

function confirmAction(message) {
  return window.confirm(message);
}

async function handleAction(action, id, element) {
  const course = state.courses.find((item) => item.id === id);
  const student = state.students.find((item) => item.id === id);
  const payment = state.payments.find((item) => item.id === id);
  const withdrawal = state.withdrawals.find((item) => item.id === id);
  const session = state.sessions.find((item) => item.id === id);
  const job = state.jobs.find((item) => item.id === id);
  const faq = state.faqs.find((item) => item.id === id);
  const referral = state.referrals.find((item) => item.id === id);

  switch (action) {
    case "add-course": formModal("Create a course", "course", "", courseForm(), "Create course"); break;
    case "add-category": formModal("Add course category", "category", "", field("Category name", "name", "", { required: true, full: true }), "Add category"); break;
    case "edit-course": if (course) formModal("Edit course", "course", id, courseForm(course)); break;
    case "course-details": if (course) courseDetails(course); break;
    case "toggle-course":
      if (course) commit(() => { course.status = course.status === "Published" ? "Draft" : "Published"; addAudit(`${course.title} ${course.status === "Published" ? "published" : "unpublished"}`); }, `Course ${course.status === "Published" ? "published" : "unpublished"}.`);
      break;
    case "archive-course":
      if (course && confirmAction(course.status === "Archived" ? "Permanently remove this archived course from the local demo?" : "Archive this course? Its sample enrollment records will remain.")) {
        if (course.status === "Archived") commit(() => { state.courses = state.courses.filter((item) => item.id !== id); addAudit(`Course removed: ${course.title}`); }, "Course removed from local data.");
        else commit(() => { course.status = "Archived"; addAudit(`Course archived: ${course.title}`); }, "Course archived.");
      }
      break;
    case "toggle-student":
      if (student) commit(() => { student.status = student.status === "Active" ? "Suspended" : "Active"; addAudit(`${student.name} account ${student.status.toLowerCase()}`); }, `Student account ${student.status.toLowerCase()}.`);
      if (modalLayer.hidden === false && student) closeModal();
      break;
    case "student-details": if (student) studentDetails(student); break;
    case "reset-access": if (student && confirmAction(`Reset access for ${student.name}? This demo only records the requested action.`)) commit(() => addAudit(`Demo access reset requested for ${student.name}`), "Demo access reset request recorded. No credentials were changed."); break;
    case "toggle-certificate":
      if (student) {
        const statuses = ["Not eligible", "In progress", "Eligible", "Issued"];
        const next = statuses[(statuses.indexOf(student.certificate || "Not eligible") + 1) % statuses.length];
        commit(() => { student.certificate = next; addAudit(`Certificate status for ${student.name}: ${next}`); }, `Certificate marked ${next.toLowerCase()} in local records.`);
        studentDetails(student);
      }
      break;
    case "refund-payment":
      if (payment && confirmAction(`Mark this enrollment as refunded? This revokes course access but does not process a payment refund.`)) {
        const { error } = await supabaseClient.from("enrollments").update({ status: "Refunded" }).eq("user_id", payment.userId).eq("course_id", payment.courseId);
        if (error) { notify(`Could not update the enrollment: ${error.message}`, "error"); break; }
        commit(() => { payment.status = "Refunded"; addAudit(`Enrollment marked refunded: ${payment.id}`); }, "Enrollment status updated. No payment refund was processed.");
      }
      break;
    case "export-payments":
      exportCsv("skill-up-demo-financial-report.csv", ["Transaction ID", "Student", "Course", "Amount NGN", "Gateway fee NGN", "Method", "Date", "Status"], state.payments.map((item) => [item.id, studentName(item.studentId), courseName(item.courseId), item.amount, item.fee, item.method, item.date, item.status]));
      break;
    case "export-students":
      exportCsv("skill-up-demo-students.csv", ["Student ID", "Name", "Email", "Joined", "Status", "Courses", "Progress"], state.students.map((item) => [item.id, item.name, item.email, item.joined, item.status, item.courses.map(courseName).join("; "), `${item.progress}%`]));
      break;
    case "export-report":
      exportCsv("skill-up-demo-dashboard.csv", ["Metric", "Value"], [["Registered students", state.students.length], ["Active students", state.students.filter((item) => item.status === "Active").length], ["Published courses", state.courses.filter((item) => item.status === "Published").length], ["Successful payments", state.payments.filter((item) => item.status === "Successful").length], ["Demo gross revenue NGN", state.payments.filter((item) => item.status === "Successful").reduce((sum, item) => sum + item.amount, 0)], ["Pending demo withdrawals", state.withdrawals.filter((item) => item.status === "Pending").length]]);
      break;
    case "approve-withdrawal":
    case "reject-withdrawal":
      if (withdrawal && confirmAction(`${action === "approve-withdrawal" ? "Approve" : "Reject"} ${withdrawal.id} in local demo data? No payout will be made.`)) commit(() => { withdrawal.status = action === "approve-withdrawal" ? "Approved" : "Rejected"; addAudit(`Demo withdrawal ${withdrawal.status.toLowerCase()}: ${withdrawal.id}`); }, `Withdrawal marked ${withdrawal.status.toLowerCase()} in local records only.`);
      break;
    case "referral-details":
      if (referral) openModal("Referral partner", `<div class="detail-grid"><div class="detail-cell"><span>Partner</span><strong>${escapeHTML(referral.name)}</strong></div><div class="detail-cell"><span>Email</span><strong>${escapeHTML(referral.email)}</strong></div><div class="detail-cell"><span>Referral code</span><strong>${escapeHTML(referral.code)}</strong></div><div class="detail-cell"><span>Conversions</span><strong>${referral.conversions}</strong></div><div class="detail-cell"><span>Referral visits</span><strong>${referral.referrals}</strong></div><div class="detail-cell"><span>Commission</span><strong>${money(referral.commission)}</strong></div></div><div class="detail-block"><h3>Campaigns & activity</h3><p>Campaign attribution and suspicious activity checks need verified server-side event data. No live tracking is connected to this local demo.</p></div>`);
      break;
    case "adjust-commission":
      if (referral) formModal("Adjust demo commission", "commission", id, field("Adjustment amount (NGN)", "amount", 0, { type: "number", required: true }) + field("Reason", "reason", "", { full: true, required: true, placeholder: "Explain the adjustment" }), "Record adjustment");
      break;
    case "referral-campaign":
      formModal("Create referral campaign", "campaign", "", field("Campaign name", "name", "", { required: true }) + field("Commission rate (%)", "rate", state.settings.referralRate, { type: "number", min: 0, max: 100, required: true }) + field("Campaign notes", "notes", "", { type: "textarea", full: true }), "Save campaign");
      break;
    case "toggle-campaign": {
      const campaign = state.campaigns.find((item) => item.id === id);
      if (campaign) commit(() => { campaign.status = campaign.status === "Active" ? "Paused" : "Active"; addAudit(`Referral campaign ${campaign.status.toLowerCase()}: ${campaign.name}`); }, `Campaign ${campaign.status.toLowerCase()}.`);
      break;
    }
    case "delete-campaign": {
      const campaign = state.campaigns.find((item) => item.id === id);
      if (campaign && confirmAction(`Delete referral campaign "${campaign.name}" from local data?`)) commit(() => { state.campaigns = state.campaigns.filter((item) => item.id !== id); addAudit(`Referral campaign deleted: ${campaign.name}`); }, "Campaign deleted.");
      break;
    }
    case "add-session": formModal("Schedule mentorship session", "session", "", sessionForm(), "Schedule session"); break;
    case "add-review": formModal("Add student question or assignment", "review", "", reviewForm(), "Add to review queue"); break;
    case "review-submission": {
      const review = state.reviews.find((item) => item.id === id);
      if (review) {
        const isQuestion = review.type === "Question";
        openModal(isQuestion ? "Respond to student question" : "Review assignment", `<div class="detail-grid"><div class="detail-cell"><span>Student</span><strong>${escapeHTML(review.student)}</strong></div><div class="detail-cell"><span>Course</span><strong>${escapeHTML(review.course)}</strong></div><div class="detail-cell"><span>Type</span><strong>${escapeHTML(review.type)}</strong></div><div class="detail-cell"><span>Submitted</span><strong>${dateLabel(review.submitted)}</strong></div></div><div class="detail-block"><h3>${escapeHTML(review.title)}</h3><p>${escapeHTML(review.feedback || "Sample submission. Attachments are not connected in this prototype.")}</p></div><form data-form="review-feedback" data-id="${review.id}">${field("Mentor feedback / response", "feedback", review.feedback || "", { type: "textarea", full: true, required: true, rows: 5 })}<div class="form-actions"><button type="button" class="button button-soft" data-close-modal>Close</button><button type="submit" class="button button-primary">Save feedback</button></div></form>`);
      }
      break;
    }
    case "complete-session":
      if (session) {
        try {
          if (session.source === "learner") await updateLearnerSession(session);
          commit(() => { session.status = "Completed"; addAudit(`Mentorship session completed: ${session.title}`); }, "Session marked completed.");
        } catch (error) { notify(`Could not update the session: ${error.message}`, "error"); }
      }
      break;
    case "delete-session":
      if (session && confirmAction(`Remove the session "${session.title}"?`)) {
        try {
          if (session.source === "learner") await updateLearnerSession(session, true);
          commit(() => { state.sessions = state.sessions.filter((item) => item.id !== id); addAudit(`Session removed: ${session.title}`); }, "Session removed.");
        } catch (error) { notify(`Could not remove the session: ${error.message}`, "error"); }
      }
      break;
    case "add-job": formModal("Add career opportunity", "job", "", jobForm(), "Save opportunity"); break;
    case "edit-job": if (job) formModal("Edit career opportunity", "job", id, jobForm(job)); break;
    case "toggle-job":
      if (job) commit(() => { job.status = job.status === "Published" ? "Draft" : "Published"; addAudit(`Opportunity ${job.status.toLowerCase()}: ${job.title}`); }, `Opportunity ${job.status.toLowerCase()}.`);
      break;
    case "delete-job":
      if (job && confirmAction(`Delete "${job.title}" from local demo records?`)) commit(() => { state.jobs = state.jobs.filter((item) => item.id !== id); addAudit(`Opportunity deleted: ${job.title}`); }, "Opportunity deleted.");
      break;
    case "add-resource": formModal("Add career resource", "resource", "", resourceForm(), "Save resource"); break;
    case "edit-resource": {
      const resource = state.resources.find((item) => item.id === id);
      if (resource) formModal("Edit career resource", "resource", id, resourceForm(resource));
      break;
    }
    case "toggle-resource": {
      const resource = state.resources.find((item) => item.id === id);
      if (resource) commit(() => { resource.status = resource.status === "Published" ? "Draft" : "Published"; addAudit(`Career resource ${resource.status.toLowerCase()}: ${resource.title}`); }, `Resource ${resource.status.toLowerCase()}.`);
      break;
    }
    case "delete-resource": {
      const resource = state.resources.find((item) => item.id === id);
      if (resource && confirmAction(`Delete the resource "${resource.title}" from local data?`)) commit(() => { state.resources = state.resources.filter((item) => item.id !== id); addAudit(`Career resource deleted: ${resource.title}`); }, "Career resource deleted.");
      break;
    }
    case "add-faq": formModal("Add FAQ", "faq", "", faqForm(), "Add FAQ"); break;
    case "edit-faq": if (faq) formModal("Edit FAQ", "faq", id, faqForm(faq)); break;
    case "toggle-faq":
      if (faq) commit(() => { faq.status = faq.status === "Published" ? "Draft" : "Published"; addAudit(`FAQ ${faq.status.toLowerCase()}: ${faq.question}`); }, `FAQ ${faq.status.toLowerCase()}.`);
      break;
    case "delete-faq":
      if (faq && confirmAction("Delete this FAQ from local content records?")) commit(() => { state.faqs = state.faqs.filter((item) => item.id !== id); addAudit(`FAQ deleted: ${faq.question}`); }, "FAQ deleted.");
      break;
    case "edit-homepage":
      formModal("Edit homepage content", "homepage", "", field("Hero headline", "headline", state.siteContent.headline, { full: true, required: true }) + field("Announcement banner", "announcement", state.siteContent.announcement, { full: true, placeholder: "Leave blank to hide the banner" }) + field("Banner image URL", "bannerUrl", state.siteContent.bannerUrl || "", { type: "url", full: true, placeholder: "https://…" }) + field("Contact email", "contactEmail", state.siteContent.contactEmail, { type: "email", required: true }), "Save homepage content");
      break;
    case "edit-legal":
      formModal("Edit privacy policy & terms", "legal", "", field("Privacy policy", "privacyPolicy", state.siteContent.privacyPolicy, { type: "textarea", full: true, rows: 6 }) + field("Terms and conditions", "terms", state.siteContent.terms, { type: "textarea", full: true, rows: 6 }), "Save legal content");
      break;
    case "add-testimonial": formModal("Add testimonial", "testimonial", "", testimonialForm(), "Save testimonial"); break;
    case "edit-testimonial": {
      const testimonial = state.testimonials.find((item) => item.id === id);
      if (testimonial) formModal("Edit testimonial", "testimonial", id, testimonialForm(testimonial));
      break;
    }
    case "toggle-testimonial": {
      const testimonial = state.testimonials.find((item) => item.id === id);
      if (testimonial) commit(() => { testimonial.status = testimonial.status === "Published" ? "Draft" : "Published"; addAudit(`Testimonial ${testimonial.status.toLowerCase()}: ${testimonial.name}`); }, `Testimonial ${testimonial.status.toLowerCase()}.`);
      break;
    }
    case "delete-testimonial": {
      const testimonial = state.testimonials.find((item) => item.id === id);
      if (testimonial && confirmAction(`Delete testimonial from ${testimonial.name}?`)) commit(() => { state.testimonials = state.testimonials.filter((item) => item.id !== id); addAudit(`Testimonial deleted: ${testimonial.name}`); }, "Testimonial deleted.");
      break;
    }
    case "announcement": formModal("Draft announcement", "announcement", "", field("Announcement title", "title", "", { required: true }) + field("Message", "message", "", { type: "textarea", full: true, required: true, rows: 5 }) + `<div class="inline-note full">Draft only. Email sending is not configured.</div>`, "Save draft"); break;
    case "toggle-setting": {
      const key = element.dataset.key;
      if (Object.hasOwn(state.settings, key)) commit(() => { state.settings[key] = !state.settings[key]; addAudit(`Setting changed: ${key}`); }, "Local setting updated.");
      break;
    }
    case "add-admin": formModal("Add administrator record", "admin", "", field("Name", "name", "", { required: true }) + field("Email", "email", "", { type: "email", required: true }) + field("Role", "role", "Content admin", { type: "select", choices: ["Content admin", "Course manager", "Support admin", "Finance reviewer"] }) + `<div class="inline-note full">This adds a local record only; it does not create an account or grant protected permissions.</div>`, "Add record"); break;
    case "remove-admin": {
      const admin = state.admins.find((item) => item.id === id);
      if (admin && admin.role !== "Super admin" && confirmAction(`Remove ${admin.name} from the local admin list?`)) commit(() => { state.admins = state.admins.filter((item) => item.id !== id); addAudit(`Local admin record removed: ${admin.email}`); }, "Administrator record removed.");
      else if (admin?.role === "Super admin") notify("The super admin record cannot be removed.", "error");
      break;
    }
    case "reset-demo":
      if (confirmAction("Reset all SKILL-UP local demo data to the original sample records? This cannot be undone.")) {
        state = initialState();
        if (persist()) { activeFilters = { search: "", status: "All" }; render(); notify("Sample data restored."); }
      }
      break;
    default: break;
  }
}

function sessionForm(session = {}) {
  const mentors = [...new Set(["Ada Okafor", "Tunde Adebayo", "Ifeanyi Okoro", "Zainab Musa", ...state.courses.map((course) => course.instructor)])];
  const students = ["Group session", ...state.students.map((student) => student.name)];
  return [
    field("Session title", "title", session.title || "", { required: true, full: true }),
    field("Mentor", "mentor", session.mentor || mentors[0], { type: "select", choices: mentors }),
    field("Student / group", "student", session.student || students[0], { type: "select", choices: students }),
    field("Session type", "type", session.type || "1:1 mentorship", { type: "select", choices: ["1:1 mentorship", "Live training", "Assignment review", "Group Q&A"] }),
    field("Date", "date", session.date || day(1), { type: "date", required: true }),
    field("Time", "time", session.time || "14:00", { type: "time", required: true }),
    field("Meeting link", "link", session.link || "", { type: "url", full: true, placeholder: "https://…" })
  ].join("");
}

function jobForm(job = {}) {
  return [
    field("Opportunity title", "title", job.title || "", { required: true }),
    field("Organization", "company", job.company || "", { required: true }),
    field("Opportunity type", "type", job.type || "Remote role", { type: "select", choices: ["Remote role", "Freelance", "Internship", "External listing"] }),
    field("Location / work mode", "location", job.location || "Remote", { required: true }),
    field("Application link", "link", job.link || "", { type: "url", full: true, required: true }),
    field("Verification", "verified", job.verified === false ? "External listing" : "Verified", { type: "select", choices: ["Verified", "External listing"], full: true }),
    field("Status", "status", job.status || "Draft", { type: "select", choices: ["Draft", "Published"] })
  ].join("");
}

function faqForm(faq = {}) {
  return field("Question", "question", faq.question || "", { required: true, full: true })
    + field("Answer", "answer", faq.answer || "", { type: "textarea", full: true, required: true, rows: 5 })
    + field("Status", "status", faq.status || "Draft", { type: "select", choices: ["Draft", "Published"], full: true });
}

function resourceForm(resource = {}) {
  return field("Resource title", "title", resource.title || "", { full: true, required: true })
    + field("Category", "category", resource.category || "CV template", { type: "select", choices: ["CV template", "Interview preparation", "Application guide", "Career resource"] })
    + field("Status", "status", resource.status || "Draft", { type: "select", choices: ["Draft", "Published"] })
    + field("Resource link", "link", resource.link || "", { type: "url", full: true, required: true, placeholder: "https://…" });
}

function testimonialForm(testimonial = {}) {
  return field("Learner name", "name", testimonial.name || "", { required: true })
    + field("Learner role", "role", testimonial.role || "", { required: true })
    + field("Testimonial", "quote", testimonial.quote || "", { type: "textarea", full: true, rows: 4, required: true })
    + field("Status", "status", testimonial.status || "Draft", { type: "select", choices: ["Draft", "Published"], full: true });
}

function reviewForm() {
  return field("Submission type", "type", "Assignment", { type: "select", choices: ["Assignment", "Question"] })
    + field("Student", "student", state.students[0]?.name || "", { type: "select", choices: state.students.map((student) => student.name), required: true })
    + field("Course", "course", state.courses[0]?.title || "", { type: "select", choices: state.courses.map((course) => course.title), required: true })
    + field("Title / question", "title", "", { full: true, required: true })
    + field("Submission details", "feedback", "", { type: "textarea", full: true, rows: 4, placeholder: "Optional context. File uploads are not connected." });
}

async function handleFormSubmit(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const kind = form.dataset.form;
  const id = form.dataset.id;
  const existing = (list) => list.find((item) => item.id === id);

  if (kind === "course") {
    const current = existing(state.courses);
    const file = form.querySelector('[name="thumbnailFile"]').files[0];
    if (file && (!file.type.startsWith("image/") || file.size > 1024 * 1024)) {
      notify("Choose an image file under 1 MB to fit local browser storage.", "error");
      return;
    }
    const save = (uploadedImage = "") => {
      const courseData = {
        title: values.title.trim(), category: values.category, price: Number(values.price),
        instructor: values.instructor.trim(), status: values.status, thumbnail: uploadedImage || values.thumbnail.trim(),
        banner: values.banner.trim(), description: values.description.trim(), modules: values.modules.trim(),
        materials: values.materials.trim(), assignments: values.assignments.trim(), quizzes: values.quizzes.trim(),
        requirements: values.requirements.trim()
      };
      if (!courseData.title || !courseData.instructor || !courseData.description || !Number.isFinite(courseData.price) || courseData.price < 0) {
        notify("Complete the required course fields with a valid price.", "error");
        return;
      }
      const saved = commit(() => {
        if (current) Object.assign(current, courseData);
        else state.courses.unshift({ ...courseData, id: `CRS-${Date.now()}`, enrolled: 0, completion: 0, createdAt: day(0) });
          if (!state.categories.includes(courseData.category)) state.categories.push(courseData.category);
          addAudit(`${current ? "Course updated" : "Course created"}: ${courseData.title}`);
      }, current ? "Course changes saved on this device." : "Course created on this device.");
      if (saved) closeModal();
    };
    if (file) {
      const reader = new FileReader();
      reader.addEventListener("load", () => save(String(reader.result)));
      reader.addEventListener("error", () => notify("Could not read this image file.", "error"));
      reader.readAsDataURL(file);
    } else save();
    return;
  }
  if (kind === "session") {
    const sessionData = { title: values.title.trim(), mentor: values.mentor, student: values.student, type: values.type, date: values.date, time: values.time, link: values.link.trim(), status: "Scheduled" };
    if (!sessionData.title || !sessionData.date || !sessionData.time) { notify("Complete the required session details.", "error"); return; }
    if (commit(() => { state.sessions.unshift({ ...sessionData, id: `MNT-${Date.now()}` }); addAudit(`Mentorship session scheduled: ${sessionData.title}`); }, "Session saved on this device.")) closeModal();
    return;
  }
  if (kind === "job") {
    const current = existing(state.jobs);
    const jobData = { title: values.title.trim(), company: values.company.trim(), type: values.type, location: values.location.trim(), link: values.link.trim(), verified: values.verified === "Verified", status: values.status, date: current?.date || day(0) };
    if (!jobData.title || !jobData.company || !jobData.location || !jobData.link) { notify("Complete the required opportunity fields.", "error"); return; }
    if (jobData.status === "Published" && !jobData.verified && !confirmAction("This is an external listing and is not marked verified. Clearly label it as external when published. Continue?")) return;
    if (commit(() => { if (current) Object.assign(current, jobData); else state.jobs.unshift({ ...jobData, id: `JOB-${Date.now()}` }); addAudit(`${current ? "Opportunity updated" : "Opportunity added"}: ${jobData.title}`); }, "Opportunity saved on this device.")) closeModal();
    return;
  }
  if (kind === "faq") {
    const current = existing(state.faqs);
    const faqData = { question: values.question.trim(), answer: values.answer.trim(), status: values.status };
    if (!faqData.question || !faqData.answer) { notify("Enter both a question and an answer.", "error"); return; }
    if (commit(() => { if (current) Object.assign(current, faqData); else state.faqs.unshift({ ...faqData, id: `FAQ-${Date.now()}` }); addAudit(`${current ? "FAQ updated" : "FAQ added"}: ${faqData.question}`); }, "FAQ saved on this device.")) closeModal();
    return;
  }
  if (kind === "category") {
    const name = values.name.trim();
    if (!name) { notify("Enter a category name.", "error"); return; }
    if (state.categories.some((category) => category.toLowerCase() === name.toLowerCase())) { notify("That category already exists.", "error"); return; }
    if (commit(() => { state.categories.push(name); addAudit(`Course category added: ${name}`); }, "Course category added.")) closeModal();
    return;
  }
  if (kind === "resource") {
    const current = existing(state.resources);
    const resourceData = { title: values.title.trim(), category: values.category, link: values.link.trim(), status: values.status };
    if (!resourceData.title || !resourceData.link) { notify("Complete the resource title and link.", "error"); return; }
    if (commit(() => { if (current) Object.assign(current, resourceData); else state.resources.unshift({ ...resourceData, id: `RES-${Date.now()}` }); addAudit(`Career resource ${current ? "updated" : "added"}: ${resourceData.title}`); }, "Career resource saved on this device.")) closeModal();
    return;
  }
  if (kind === "testimonial") {
    const current = existing(state.testimonials);
    const item = { name: values.name.trim(), role: values.role.trim(), quote: values.quote.trim(), status: values.status };
    if (!item.name || !item.role || !item.quote) { notify("Complete the testimonial fields.", "error"); return; }
    if (commit(() => { if (current) Object.assign(current, item); else state.testimonials.unshift({ ...item, id: `TST-${Date.now()}` }); addAudit(`Testimonial ${current ? "updated" : "added"}: ${item.name}`); }, "Testimonial saved locally.")) closeModal();
    return;
  }
  if (kind === "homepage") {
    const content = { headline: values.headline.trim(), announcement: values.announcement.trim(), bannerUrl: values.bannerUrl.trim(), contactEmail: values.contactEmail.trim(), privacyPolicy: state.siteContent.privacyPolicy, terms: state.siteContent.terms };
    if (!content.headline || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.contactEmail)) { notify("Enter a homepage headline and valid contact email.", "error"); return; }
    if (commit(() => { state.siteContent = content; addAudit("Homepage copy updated locally"); }, "Homepage content saved locally.")) closeModal();
    return;
  }
  if (kind === "legal") {
    if (commit(() => { state.siteContent.privacyPolicy = values.privacyPolicy.trim(); state.siteContent.terms = values.terms.trim(); addAudit("Privacy policy and terms updated locally"); }, "Legal page content saved locally.")) closeModal();
    return;
  }
  if (kind === "commission") {
    const referral = existing(state.referrals);
    const amount = Number(values.amount);
    if (!referral || !Number.isFinite(amount) || !values.reason.trim()) { notify("Enter a valid adjustment amount and reason.", "error"); return; }
    if (commit(() => { referral.commission = Math.max(0, referral.commission + amount); addAudit(`Demo commission adjustment for ${referral.name}: ${money(amount)} (${values.reason.trim()})`); }, "Commission adjustment recorded locally.")) closeModal();
    return;
  }
  if (kind === "campaign") {
    const rate = Number(values.rate);
    if (!values.name.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) { notify("Enter a campaign name and a commission rate from 0 to 100.", "error"); return; }
    if (commit(() => { state.settings.referralRate = rate; state.campaigns.unshift({ id: `CMP-${Date.now()}`, name: values.name.trim(), rate, notes: values.notes.trim(), status: "Active", createdAt: day(0) }); addAudit(`Demo referral campaign created: ${values.name.trim()} (${rate}%)`); }, "Campaign configuration saved locally.")) closeModal();
    return;
  }
  if (kind === "review-feedback") {
    const review = existing(state.reviews);
    if (!review || !values.feedback.trim()) { notify("Add feedback before saving this review.", "error"); return; }
    if (review.source === "learner" && review.userId) {
      const { data: workspace, error: readError } = await supabaseClient.from("learner_workspaces").select("data").eq("user_id", review.userId).maybeSingle();
      if (readError) { notify(`Could not load the learner submission: ${readError.message}`, "error"); return; }
      if (!workspace) { notify("The learner workspace for this submission no longer exists.", "error"); return; }
      const learnerData = workspace.data || {};
      if (review.type === "Question") {
        const question = (learnerData.questions || []).find((item) => item.id === review.questionId);
        if (!question) { notify("The learner question could not be found.", "error"); return; }
        question.answer = values.feedback.trim();
        question.status = "Answered";
      } else {
        const progress = learnerData.progress?.[review.courseId];
        if (!progress) { notify("The learner assignment could not be found.", "error"); return; }
        progress.feedback = values.feedback.trim();
        progress.feedbackDate = day(0);
      }
      const { error: saveError } = await supabaseClient.from("learner_workspaces").upsert({ user_id: review.userId, data: learnerData });
      if (saveError) { notify(`Could not save feedback to the learner workspace: ${saveError.message}`, "error"); return; }
    }
    if (commit(() => { review.feedback = values.feedback.trim(); review.status = review.type === "Question" ? "Responded" : "Reviewed"; addAudit(`${review.type} ${review.status.toLowerCase()}: ${review.title}`); }, "Feedback saved in the local review record.")) closeModal();
    return;
  }
  if (kind === "review") {
    const student = state.students.find((item) => item.name === values.student);
    const course = state.courses.find((item) => item.title === values.course);
    if (!student || !course || !values.title.trim()) { notify("Complete the submission details.", "error"); return; }
    const type = values.type;
    if (commit(() => { state.reviews.unshift({ id: `REV-${Date.now()}`, type, title: values.title.trim(), student: student.name, course: course.title, submitted: day(0), status: type === "Question" ? "Pending response" : "Pending review", feedback: values.feedback.trim() }); addAudit(`${type} added to review queue: ${values.title.trim()}`); }, "Item added to the mentorship review queue.")) closeModal();
    return;
  }
  if (kind === "announcement") {
    if (!values.title.trim() || !values.message.trim()) { notify("Enter an announcement title and message.", "error"); return; }
    if (commit(() => { state.announcements.unshift({ id: `ANN-${Date.now()}`, title: values.title.trim(), body: values.message.trim(), date: day(0), status: "Published" }); addAudit(`Announcement published: ${values.title.trim()}`); }, "Announcement published to the website. No email was sent.")) closeModal();
    return;
  }
  if (kind === "admin") {
    const email = values.email.trim().toLowerCase();
    if (!values.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify("Enter a name and a valid email address.", "error"); return; }
    if (state.admins.some((admin) => admin.email.toLowerCase() === email)) { notify("An administrator record with that email already exists.", "error"); return; }
    if (commit(() => { state.admins.push({ id: `ADM-${Date.now()}`, name: values.name.trim(), email, role: values.role, status: "Active" }); addAudit(`Local administrator record added: ${email}`); }, "Administrator record added. No login account was created.")) closeModal();
  }
}

navButtons.forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
document.querySelector("#main-content").addEventListener("click", (event) => {
  const navigation = event.target.closest("[data-view]");
  if (navigation) {
    navigate(navigation.dataset.view);
    return;
  }
  const range = event.target.closest("[data-range]");
  if (range) {
    chartRange = range.dataset.range;
    render();
    return;
  }
  const actionElement = event.target.closest("[data-action]");
  if (actionElement) handleAction(actionElement.dataset.action, actionElement.dataset.id, actionElement);
});

mainContent.addEventListener("input", (event) => {
  if (event.target.dataset.filter === "search") {
    activeFilters.search = event.target.value;
    const start = event.target.selectionStart;
    const current = event.target.value;
    render();
    const replacement = mainContent.querySelector('[data-filter="search"]');
    replacement?.focus();
    replacement?.setSelectionRange(start, start);
    if (replacement && replacement.value !== current) replacement.value = current;
  }
});

mainContent.addEventListener("change", (event) => {
  if (event.target.dataset.filter === "status") {
    activeFilters.status = event.target.value;
    render();
  }
});

modalLayer.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) closeModal();
});

modalLayer.addEventListener("submit", (event) => {
  if (event.target.matches("[data-form]")) {
    event.preventDefault();
    handleFormSubmit(event.target);
  }
});

document.querySelector(".mobile-menu").addEventListener("click", (event) => {
  const isOpen = sidebar.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
  event.currentTarget.setAttribute("aria-label", isOpen ? "Close admin navigation" : "Open admin navigation");
});

document.querySelector("#topbar-date").title = new Intl.DateTimeFormat("en-NG", { dateStyle: "full" }).format(today);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalLayer.hidden) closeModal();
  if (event.key === "Escape") sidebar.classList.remove("open");
});

document.querySelector("#admin-logout").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.replace("auth.html?mode=login&admin=1");
});

render();
})();
