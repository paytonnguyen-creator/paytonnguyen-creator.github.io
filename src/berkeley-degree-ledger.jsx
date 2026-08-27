import React, { useState, useEffect, useMemo, useRef } from "react";

/* ============================================================
   Berkeley Degree Ledger
   A requirement tracker for L&S majors, CDSS minors, transfer
   students (IGETC / Cal-GETC), and simultaneous degrees.
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.bdl { --ink:#101F30; --blue:#00325F; --slate:#4A5B6E; --line:#C9D2DB;
  --paper:#E9EDF1; --card:#FFFFFF; --gold:#B8860B; --gold-soft:#F2E3BC;
  --pine:#1B6A56; --pine-soft:#DDEDE7; --brick:#9E332C; --brick-soft:#F6E0DE;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
  --sans:'IBM Plex Sans',system-ui,sans-serif;
  --serif:'Instrument Serif',Georgia,serif;
  background:var(--paper); color:var(--ink); font-family:var(--sans);
  font-size:15px; line-height:1.5; min-height:100vh; -webkit-font-smoothing:antialiased; }
.bdl *,.bdl *::before,.bdl *::after { box-sizing:border-box; }
.bdl button { font:inherit; color:inherit; cursor:pointer; }
.bdl input,.bdl select,.bdl textarea { font:inherit; color:inherit; }
.bdl :focus-visible { outline:2px solid var(--gold); outline-offset:2px; }

/* ---- masthead ---- */
.bdl-top { background:var(--blue); color:#fff; padding:22px 24px 0; }
.bdl-top-in { max-width:1180px; margin:0 auto; }
.bdl-title { font-family:var(--serif); font-size:38px; line-height:1; margin:0; letter-spacing:-.01em; }
.bdl-title em { font-style:italic; color:var(--gold-soft); }
.bdl-sub { font-size:12.5px; color:#B9CBDD; margin:8px 0 16px; max-width:60ch; }
/* the spine: one tick per requirement block, the signature element */
.bdl-spine { display:flex; gap:2px; align-items:flex-end; height:26px; padding-bottom:0; overflow-x:auto; }
.bdl-tick { flex:1 1 4px; min-width:4px; height:9px; background:#1B4F7E; border:0; padding:0;
  border-radius:1px; transition:height .18s ease, background .18s ease; }
.bdl-tick.on { background:var(--gold); height:22px; }
.bdl-tick.part { background:#6E86A0; height:15px; }
.bdl-tick:hover { height:26px; }
.bdl-spine-label { display:flex; justify-content:space-between; font-family:var(--mono);
  font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:#9FB8CE; padding:6px 0 14px; }

/* ---- tabs ---- */
.bdl-tabs { display:flex; gap:0; overflow-x:auto; border-top:1px solid #1B4F7E; }
.bdl-tab { background:none; border:0; border-bottom:3px solid transparent; color:#B9CBDD;
  padding:11px 15px; font-size:13px; white-space:nowrap; letter-spacing:.01em; }
.bdl-tab.sel { color:#fff; border-bottom-color:var(--gold); }
.bdl-tab .n { font-family:var(--mono); font-size:10.5px; opacity:.75; margin-left:6px; }

/* ---- layout ---- */
.bdl-wrap { max-width:1180px; margin:0 auto; padding:26px 24px 90px; }
.bdl-cols { display:grid; grid-template-columns:1fr 300px; gap:26px; align-items:start; }
@media (max-width:900px){ .bdl-cols { grid-template-columns:1fr; } }

/* ---- section heads ---- */
.bdl-eyebrow { font-family:var(--mono); font-size:10.5px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--slate); margin:0 0 4px; }
.bdl-h2 { font-family:var(--serif); font-size:27px; line-height:1.15; margin:0 0 4px; }
.bdl-note { font-size:13px; color:var(--slate); margin:0 0 18px; max-width:72ch; }

/* ---- requirement block ---- */
.bdl-block { background:var(--card); border:1px solid var(--line); border-left:3px solid var(--line);
  border-radius:2px; margin-bottom:12px; }
.bdl-block.done { border-left-color:var(--pine); }
.bdl-block.part { border-left-color:var(--gold); }
.bdl-bhead { display:flex; align-items:baseline; gap:10px; padding:12px 15px; width:100%;
  background:none; border:0; text-align:left; }
.bdl-glyph { font-family:var(--mono); font-size:12px; color:var(--slate); flex:0 0 auto; }
.bdl-block.done .bdl-glyph { color:var(--pine); }
.bdl-bname { font-weight:600; font-size:14.5px; flex:1 1 auto; }
.bdl-count { font-family:var(--mono); font-size:11.5px; color:var(--slate); flex:0 0 auto; }
.bdl-body { padding:0 15px 14px; border-top:1px solid #EDF1F4; }
.bdl-hint { font-size:12.5px; color:var(--slate); margin:11px 0 9px; }

/* ---- option rows ---- */
.bdl-opts { display:flex; flex-direction:column; gap:1px; margin-top:10px; }
.bdl-opt { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:2px;
  border:1px solid transparent; background:none; text-align:left; width:100%; }
.bdl-opt:hover { background:#F3F6F8; }
.bdl-opt.hit { background:var(--pine-soft); border-color:#BEDCD3; }
.bdl-opt.pin { background:var(--gold-soft); border-color:#E3CE95; }
.bdl-code { font-family:var(--mono); font-size:12.5px; font-weight:500; flex:0 0 auto; }
.bdl-ctitle { font-size:12.5px; color:var(--slate); flex:1 1 auto; overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap; }
.bdl-mark { font-family:var(--mono); font-size:11px; color:var(--pine); flex:0 0 auto; }
.bdl-more { font-family:var(--mono); font-size:11px; color:var(--blue); background:none;
  border:0; padding:6px 8px; text-align:left; text-decoration:underline; }

/* ---- chips / flags ---- */
.bdl-chip { display:inline-flex; align-items:center; gap:5px; font-family:var(--mono);
  font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; padding:2px 6px;
  border-radius:2px; background:#EEF2F5; color:var(--slate); }
.bdl-chip.ok { background:var(--pine-soft); color:var(--pine); }
.bdl-chip.warn { background:var(--gold-soft); color:#7A5A05; }
.bdl-chip.bad { background:var(--brick-soft); color:var(--brick); }
.bdl-flag { display:flex; gap:9px; padding:10px 12px; border-radius:2px; font-size:13px;
  background:var(--gold-soft); color:#6B4E04; margin-bottom:9px; align-items:flex-start; }
.bdl-flag.bad { background:var(--brick-soft); color:var(--brick); }
.bdl-flag.ok { background:var(--pine-soft); color:var(--pine); }
.bdl-flag b { font-weight:600; }

/* ---- side panel ---- */
.bdl-side { position:sticky; top:14px; display:flex; flex-direction:column; gap:12px; }
@media (max-width:900px){ .bdl-side { position:static; } }
.bdl-card { background:var(--card); border:1px solid var(--line); border-radius:2px; padding:14px; }
.bdl-card h3 { font-family:var(--mono); font-size:10.5px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--slate); margin:0 0 11px; font-weight:500; }
.bdl-stat { display:flex; justify-content:space-between; align-items:baseline;
  padding:5px 0; border-bottom:1px dotted var(--line); font-size:13px; }
.bdl-stat:last-child { border-bottom:0; }
.bdl-stat b { font-family:var(--mono); font-size:13px; font-weight:500; }
.bdl-meter { height:6px; background:#E4E9ED; border-radius:3px; overflow:hidden; margin:9px 0 4px; }
.bdl-meter i { display:block; height:100%; background:var(--blue); transition:width .3s ease; }
.bdl-meter i.full { background:var(--pine); }

/* ---- forms ---- */
.bdl-field { display:block; margin-bottom:11px; }
.bdl-label { display:block; font-family:var(--mono); font-size:10.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--slate); margin-bottom:4px; }
.bdl-in, .bdl-sel { width:100%; padding:7px 9px; border:1px solid var(--line); border-radius:2px;
  background:#fff; font-size:13.5px; }
.bdl-in.mono { font-family:var(--mono); text-transform:uppercase; }
.bdl-ta { width:100%; min-height:130px; padding:9px; border:1px solid var(--line);
  border-radius:2px; font-family:var(--mono); font-size:12px; line-height:1.5; }
.bdl-btn { border:1px solid var(--blue); background:var(--blue); color:#fff; padding:7px 14px;
  border-radius:2px; font-size:13px; font-weight:500; }
.bdl-btn:hover { background:#00427C; }
.bdl-btn.ghost { background:none; color:var(--blue); }
.bdl-btn.ghost:hover { background:#E4EBF1; }
.bdl-btn.tiny { padding:3px 8px; font-size:11.5px; font-family:var(--mono); }
.bdl-btn.danger { border-color:var(--brick); color:var(--brick); background:none; }
.bdl-btn:disabled { opacity:.45; cursor:not-allowed; }
.bdl-row { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; }
.bdl-switch { display:flex; gap:0; border:1px solid var(--line); border-radius:2px; overflow:hidden; }
.bdl-switch button { flex:1 1 auto; background:#fff; border:0; padding:7px 12px; font-size:13px; color:var(--slate); }
.bdl-switch button.sel { background:var(--blue); color:#fff; }
.bdl-check { display:flex; gap:9px; align-items:flex-start; padding:8px 0;
  border-bottom:1px dotted var(--line); font-size:13.5px; }
.bdl-check:last-child { border-bottom:0; }
.bdl-check input { margin-top:3px; width:15px; height:15px; accent-color:var(--pine); flex:0 0 auto; }
.bdl-check span small { display:block; color:var(--slate); font-size:12px; margin-top:2px; }

/* ---- course table ---- */
.bdl-tbl { width:100%; border-collapse:collapse; font-size:13px; }
.bdl-tbl th { font-family:var(--mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--slate); text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); font-weight:500; }
.bdl-tbl td { padding:7px 8px; border-bottom:1px dotted var(--line); vertical-align:top; }
.bdl-tbl tr.dim td { color:var(--slate); }
.bdl-applied { font-size:11.5px; color:var(--slate); }
.bdl-applied span { font-family:var(--mono); }
.bdl-empty { text-align:center; padding:32px 16px; color:var(--slate); font-size:13.5px;
  border:1px dashed var(--line); border-radius:2px; background:#fff; }

/* ---- searching a long option list ---- */
.bdl-find { width:100%; padding:6px 9px; border:1px solid var(--line); border-radius:2px;
  font-size:12.5px; margin:9px 0 2px; }
.bdl-optbar { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin:9px 0 3px;
  font-family:var(--mono); font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--slate); }
.bdl-optbar button { background:none; border:1px solid var(--line); border-radius:2px; padding:2px 7px;
  font-family:var(--mono); font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--slate); }
.bdl-optbar button.sel { background:var(--blue); border-color:var(--blue); color:#fff; }
.bdl-code { min-width:96px; }
.bdl-ud { font-family:var(--mono); font-size:9.5px; letter-spacing:.06em; color:var(--slate);
  border:1px solid var(--line); border-radius:2px; padding:1px 4px; flex:0 0 auto; }
/* second line inside an option row, naming everywhere else the course counts */
.bdl-where { flex:1 0 100%; font-size:11.5px; color:var(--slate); margin-top:3px; padding-left:2px; }
.bdl-where b { font-weight:600; color:var(--blue); }
.bdl-none { font-size:12.5px; color:var(--slate); padding:10px 2px; }

/* ---- overlap ledger ---- */
.bdl-ovl { display:flex; align-items:baseline; gap:9px; padding:7px 0; border-bottom:1px dotted var(--line);
  flex-wrap:wrap; font-size:13px; }
.bdl-ovl:last-child { border-bottom:0; }
.bdl-ovl .c { font-family:var(--mono); font-size:12.5px; font-weight:500; min-width:96px; }
.bdl-ovl .w { flex:1 1 200px; color:var(--slate); font-size:12.5px; }

/* ---- one-click clearance buttons ---- */
.bdl-big { display:flex; gap:8px; flex-wrap:wrap; }
.bdl-big > button { flex:1 1 165px; text-align:left; padding:11px 13px; border:1px solid var(--line);
  background:#fff; border-radius:2px; }
.bdl-big > button:hover { border-color:#9FB0C2; }
.bdl-big > button.sel { border-color:var(--pine); background:var(--pine-soft); }
.bdl-big b { display:block; font-size:13.5px; font-weight:600; margin-bottom:2px; }
.bdl-big small { display:block; color:var(--slate); font-size:12px; line-height:1.4; }
.bdl-big > button.sel small { color:#2E6656; }
.bdl-ledgerlist { list-style:none; margin:9px 0 0; padding:0; font-size:12.5px; color:var(--slate); }
.bdl-ledgerlist li { padding:3px 0 3px 16px; position:relative; }
.bdl-ledgerlist li::before { content:"✓"; position:absolute; left:0; color:var(--pine); font-family:var(--mono); }
.bdl-ledgerlist.no li::before { content:"—"; color:var(--slate); }
.bdl-foot { max-width:1180px; margin:0 auto; padding:0 24px 40px; font-size:12px; color:var(--slate); }
.bdl-foot a { color:var(--blue); }
@media (prefers-reduced-motion:reduce){ .bdl * { transition:none !important; } }
`;

/* ---------- course code utilities ---------- */

const SUBJECTS = ("AFRICAM AGRS AMERSTD ANTHRO ART ASTRON BIOENG CHEM CHMENG CIVENG CMPBIO COGSCI " +
  "COMPSCI CPH CYPLAN DATA DEMOG DIGHUM ECON EDUC EECS ELENG ENERES ENGIN ENGLISH ENVECON EPS ESPM " +
  "FILM GEOG HISTART HISTORY IAS INDENG INFO INTEGBI ISF JOURN LDARCH LEGALST LINGUIS LS MATH MCELLBI " +
  "MECENG MEDIAST MELC MUSIC NATAMST NEUROSC NEU NUCENG NUSCTX NWMEDIA PBHLTH PHILOS PHYSICS PLANTBI " +
  "POLECON POLSCI PSYCH PUBPOL RHETOR SLAVIC SOCIOL SPANISH STAT STS UGBA UGIS VISSCI XMATH")
  .split(" ").sort((a, b) => b.length - a.length);

const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function splitCode(code) {
  const c = norm(code);
  const subj = SUBJECTS.find((s) => c.startsWith(s));
  if (!subj) return { subject: c, number: "" };
  return { subject: subj, number: c.slice(subj.length) };
}
const pretty = (code) => {
  const { subject, number } = splitCode(code);
  return number ? `${subject} ${number}` : subject;
};
/* numeric part of a course number, ignoring N/C/W/X prefixes and letter suffixes */
const courseNum = (code) => {
  const m = splitCode(code).number.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};
const isUpperDiv = (code) => courseNum(code) >= 100 && courseNum(code) < 200;

const PASSING = ["A+","A","A-","B+","B","B-","C+","C","C-","P"];
const GRADES = ["", ...PASSING, "D+","D","D-","F","NP","IP"];
const isPassing = (g) => !g || PASSING.includes(g) || g === "IP";
const isLetter = (g) => !!g && g !== "P" && g !== "NP" && g !== "IP";

/* ---------- shared course titles ---------- */
const T = {
  COMPSCI61A:"The Structure and Interpretation of Computer Programs",
  COMPSCIC88C:"Computational Structures in Data Science", DATAC88C:"Computational Structures in Data Science",
  ENGIN7:"Introduction to Computer Programming and Numerical Methods",
  ENGINW7:"Introduction to Computer Programming for Scientists and Engineers",
  MATH51:"Calculus I", XMATH51:"Calculus I", MATH16A:"Analytic Geometry and Calculus",
  XMATH16A:"Analytic Geometry and Calculus", MATH1A:"Calculus", MATHN1A:"Calculus",
  DATAC8:"Foundations of Data Science", COMPSCIC8:"Foundations of Data Science",
  INFOC8:"Foundations of Data Science", STATC8:"Foundations of Data Science",
  STAT2:"Introduction to Statistics", STAT20:"Introduction to Probability and Statistics",
  COMPSCI70:"Discrete Mathematics and Probability Theory", MATH55:"Discrete Mathematics",
  MATHN55:"Discrete Mathematics", MCELLBI61:"Brain, Mind, and Behavior", NEU61:"Brain, Mind, and Behavior",
  NEUC61:"Brain, Mind, and Behavior", PSYCHC61:"Brain, Mind, and Behavior",
  NEUC64:"Exploring the Brain: Introduction to Neuroscience",
  PSYCHC64:"Exploring the Brain: Introduction to Neuroscience",
  PSYCH110:"Introduction to Biological Psychology", PSYCHN110:"Introduction to Biological Psychology",
  COGSCIN1:"Introduction to Cognitive Science", COGSCI1:"Introduction to Cognitive Science",
  COGSCI1B:"Introduction to Cognitive Science", ANTHRO107:"Evolution of the Human Brain",
  COGSCI132:"Rhythms of the Brain: from Neuronal Communication to Function",
  COGSCI170:"Brain Damage", COGSCI171:"Genetic Factors in Neuropsychology",
  COGSCI172:"Clinical Applications in Cognitive Neuroscience", COGSCIC126:"Perception",
  PSYCHC126:"Perception", COGSCIC127:"Cognitive Neuroscience", PSYCHC127:"Cognitive Neuroscience",
  NEU128:"Cognitive Neuroscience", NEU162:"Learning and Memory", NEU164:"Neurodevelopment",
  PSYCH114:"Biology of Learning", PSYCH117:"Human Neuropsychology", PSYCHN117:"Human Neuropsychology",
  PSYCH133:"Psychology of Sleep", PSYCHN133:"Psychology of Sleep",
  COGSCI115:"Neuropsychology of Happiness", COGSCI146:"Music, Language, and Cognition",
  COGSCI181:"The Cognitive Unconscious", COGSCI182:"The Cognitive Psychology of Concept and Idea Formation",
  COGSCIC100:"Basic Issues in Cognition", COGSCIN100:"Basic Issues in Cognition",
  PSYCHC120:"Basic Issues in Cognition", PSYCHN120:"Basic Issues in Cognition",
  LINGUISC146:"Language Acquisition", LINGUIS146:"Language Acquisition", PSYCHC143:"Language Acquisition",
  PSYCH125:"The Developing Brain", PSYCH140:"Developmental Psychology",
  PSYCHN140:"Developmental Psychology", PSYCH147:"Methods in Cognitive Development",
  PSYCH164:"Social Cognition", COGSCIC131:"Computational Models of Cognition",
  COGSCI131:"Computational Models of Cognition", PSYCHC123:"Computational Models of Cognition",
  COGSCI190:"Special Topics in Cognitive Science", COMPSCI188:"Introduction to Artificial Intelligence",
  COGSCI144:"Cognitive Science of Language", COGSCIC101:"Cognitive Linguistics",
  LINGUISC105:"Cognitive Linguistics", COGSCIC142:"Language and Thought",
  LINGUISC142:"Language and Thought", COGSCIC147:"Language Disorders", LINGUISC147:"Language Disorders",
  LINGUIS100:"Introduction to Linguistic Science", LINGUIS108:"Psycholinguistics",
  AGRS36:"Greek Philosophy", COGSCI180:"Mind, Brain, and Identity",
  PHILOSW12A:"Introduction to Logic", PHILOS12A:"Introduction to Logic", PHILOS3:"The Nature of Mind",
  PHILOS25A:"Ancient Philosophy", PHILOS25B:"Modern Philosophy", PHILOS122:"Theory of Knowledge",
  PHILOS132:"Philosophy of Mind", PHILOS133:"Philosophy of Language", PHILOS135:"Theory of Meaning",
  PHILOS136:"Philosophy of Perception", AFRICAM115:"Language and Social Issues in Africa",
  ANTHRO149:"Psychological Anthropology", ANTHRO166:"Language, Culture, and Society",
  COGSCIC103:"History of Information", INFO103:"History of Information", INFOC103:"History of Information",
  HISTORYC192:"History of Information", MEDIASTC104C:"History of Information",
  COGSCIC104:"The Mind, Language, and Politics", LINGUISC104:"The Mind, Language, and Politics",
  ECON119:"Psychology and Economics", EDUC132:"Language Learning in Chicanx/Latinx Communities",
  EDUC140A:"The Art of Making Meaning", EDUC140AC:"The Art of Making Meaning",
  EDUCC130:"Knowing and Learning in Mathematics and Science", LINGUIS109:"Bilingualism",
  LINGUIS150:"Sociolinguistics", LINGUIS150A:"Concepts, Theories, and Methodologies of Sociolinguistics",
  PSYCH160:"Social Psychology", PSYCHN160:"Social Psychology", SOCIOL150:"Social Psychology",
  PSYCH166:"Socialization and Personality", PSYCH166AC:"Cultural Psychology",
  CIVENG93:"Engineering Data Analysis", DATAC140:"Probability for Data Science",
  STATC140:"Probability for Data Science", DATAC88S:"Probability and Mathematical Statistics in Data Science",
  STATC88S:"Probability and Mathematical Statistics in Data Science",
  DATA89:"Mathematical and Graphical Foundations of Probability",
  EECS126:"Probability and Random Processes", INDENG172:"Probability and Risk Analysis for Engineers",
  MATH10B:"Methods of Mathematics: Calculus, Statistics, and Combinatorics",
  MATHN10B:"Methods of Mathematics: Calculus, Statistics, and Combinatorics",
  MATH106:"Mathematical Probability Theory", STAT134:"Concepts of Probability",
  COMPSCIC100:"Principles & Techniques of Data Science", DATAC100:"Principles & Techniques of Data Science",
  STATC100:"Principles & Techniques of Data Science",
  DATAC131A:"Statistical Methods for Data Science", STATC131A:"Statistical Methods for Data Science",
  STAT133:"Concepts in Computing with Data", AFRICAMC134:"Information Technology and Society",
  AFRICAM134:"Information Technology and Society", AMERSTDC134:"Information Technology and Society",
  BIOENG100:"Ethics in Science and Engineering", CYPLAN101:"Introduction to Urban Data Analytics",
  DATAC104:"Human Contexts and Ethics of Data", HISTORYC184D:"Human Contexts and Ethics of Data",
  STSC104D:"Human Contexts and Ethics of Data", DIGHUM100:"Theory and Method in the Digital Humanities",
  ESPMC167:"Environmental Health and Development", PBHLTHC160:"Environmental Health and Development",
  INFO188:"Behind the Data: Humans and Values", ISF100J:"The Social Life of Computing",
  NWMEDIA151AC:"Transforming Tech: Issues and Interventions in STEM and Silicon Valley",
  PHILOS121:"Moral Questions of Data Science",
  POLECON159:"Digital Technology, Political Economy, and Justice",
};
const titleOf = (code) => T[norm(code)] || "";

/* ---------- requirement builders ---------- */
const opt = (s) => ({ codes: s.split("/").map(norm) });
const G = (id, name, need, list, extra = {}) => ({
  kind: "courses", id, name, need, options: (list || []).map(opt), ...extra,
});
const CK = (id, name, checks, extra = {}) => ({
  kind: "check", id, name, need: checks.length, checks, ...extra,
});

/* ============ University + campus requirements ============ */
const UNIVERSITY = {
  id: "univ", type: "univ", name: "University & campus requirements",
  note: "Everyone who graduates from Berkeley clears these, whether they started here or transferred in.",
  sections: [
    { id: "uc", name: "University of California", groups: [
      CK("elwr", "Entry Level Writing", [
        { id: "elwr", label: "Entry Level Writing Requirement (ELWR) satisfied",
          desc: "Cleared by an approved exam score, a UC-transferable English composition course with a C or better, or College Writing R1A.", igetc: true },
      ]),
      CK("ahi", "American History & Institutions", [
        { id: "ahi", label: "American History and Institutions (AH&I) satisfied",
          desc: "One approved U.S. history or government course, an AP/IB score, or high school coursework. A U.S. history course used for IGETC/Cal-GETC Area 4 usually clears it too." },
      ]),
      CK("gpa", "Minimum cumulative GPA", [
        { id: "gpa", label: "Cumulative UC GPA of at least 2.0", desc: "Tracked from the GPA you enter under Setup.", auto: "gpa" },
      ]),
    ]},
    { id: "campus", name: "Berkeley campus", groups: [
      G("ac", "American Cultures", 1, [], { open: true,
        hint: "One approved American Cultures course, taken at Berkeley or transferred from an approved list. IGETC/Cal-GETC certification does not cover this one. Add the course under My courses, then pick it here." }),
      CK("units120", "Minimum total units", [
        { id: "units120", label: "120 total units earned", desc: "Counts everything on this ledger: Berkeley courses, transfer work, and exam credit.", auto: "units120" },
      ]),
      CK("pnp", "One-third passed-grade limit", [
        { id: "pnp", label: "No more than one third of total units taken P/NP", desc: "Courses graded P count here. Major and minor courses must be letter-graded anyway.", auto: "pnp" },
      ]),
      CK("senres", "Senior residence", [
        { id: "senres", label: "24 of the final 30 units completed in L&S at Berkeley",
          desc: "Study abroad and UCEAP have their own arrangements. Summer terms can be used for a modified senior residence with an adviser's approval." },
      ]),
    ]},
  ],
};

/* ============ College of Letters & Science ============ */
const LS_COLLEGE = {
  id: "ls", type: "college", name: "Letters & Science requirements",
  note: "Full IGETC or Cal-GETC certification clears Essential Skills and all seven breadth courses at once. Turn certification on under Setup and these blocks close themselves.",
  sections: [
    { id: "essential", name: "Essential skills", groups: [
      CK("rc", "Reading & Composition", [
        { id: "rca", label: "R&C Part A", desc: "C- or better. Berkeley expects Part A finished by the end of your second semester here.", igetc: true },
        { id: "rcb", label: "R&C Part B", desc: "C- or better, and it has to come after Part A.", igetc: true },
      ]),
      CK("qr", "Quantitative Reasoning", [
        { id: "qr", label: "Quantitative Reasoning satisfied", desc: "An approved course, an AP/IB score, or the math placement exam.", igetc: true },
      ]),
      CK("lang", "Foreign Language", [
        { id: "lang", label: "Foreign Language satisfied", desc: "Through the second semester of college-level study, or an equivalent exam or proficiency demonstration.", igetc: true },
      ]),
    ]},
    { id: "breadth", name: "Seven-course breadth", note: "One course in each area. Courses used for your major or minor can also count here.", groups: [
      CK("b7", "Breadth areas", [
        { id: "b_arts", label: "Arts & Literature", igetc: true },
        { id: "b_bio", label: "Biological Science", igetc: true },
        { id: "b_hist", label: "Historical Studies", igetc: true },
        { id: "b_intl", label: "International Studies", igetc: true },
        { id: "b_phil", label: "Philosophy & Values", igetc: true },
        { id: "b_phys", label: "Physical Science", igetc: true },
        { id: "b_soc", label: "Social & Behavioral Sciences", igetc: true },
      ]),
    ]},
    { id: "guide", name: "Unit rules & guidelines", note: "Unit ceilings change from time to time. Confirm the current numbers with your college adviser before you file to graduate.", groups: [
      CK("lsunits", "Unit limits", [
        { id: "ud36", label: "At least 36 upper-division units", desc: "Courses numbered 100–199. Tracked from My courses.", auto: "ud36" },
        { id: "pe4", label: "No more than 4 units of Physical Education counted" },
        { id: "sp16", label: "No more than 16 units of Special Studies (98/99/197/198/199) counted" },
        { id: "ccc70", label: "No more than 70 units transferred from community colleges", desc: "Transfer students only. Berkeley still gives subject credit for work above the ceiling.", transferOnly: true, auto: "ccc70" },
      ]),
      CK("lsgen", "General guidelines", [
        { id: "declared", label: "Major declared (and minor declared before your final semester begins)" },
        { id: "lettergrade", label: "All major and minor courses taken for a letter grade" },
        { id: "c-minus", label: "C- or better in every major and minor course", auto: "cminus" },
        { id: "majgpa", label: "At least a 2.0 GPA in major coursework, and in minor coursework" },
      ]),
    ]},
  ],
};

/* What a filed certification actually clears, in the College's own terms.
   Every block carrying `igetc: true` above closes itself when certification is
   set to full; this is the same claim written out in words, so the student can
   see what the button did rather than trusting it. */
const CERT_CLEARS = [
  "Entry Level Writing",
  "Reading & Composition, Parts A and B",
  "Quantitative Reasoning",
  "Foreign Language",
  "All seven breadth courses",
];
const CERT_LEAVES = [
  "American Cultures — Berkeley's own requirement, never covered by certification",
  "Major and minor prerequisites — matched course by course through ASSIST",
  "The 120-unit total and the 36 upper-division units",
  "Senior residence",
];

/* The ten IGETC / Cal-GETC areas, for students who are partially certified.
   These are ticked by hand rather than mapped onto L&S blocks automatically:
   partial certification is evaluated course by course by the College, and a
   guessed mapping in a graduation tracker is worse than no mapping. */
const CERT_AREAS = [
  { id: "a1a", label: "Area 1A — English Composition" },
  { id: "a1b", label: "Area 1B — Critical Thinking / English Composition" },
  { id: "a1c", label: "Area 1C — Oral Communication" },
  { id: "a2", label: "Area 2 — Mathematical Concepts & Quantitative Reasoning" },
  { id: "a3a", label: "Area 3A — Arts" },
  { id: "a3b", label: "Area 3B — Humanities" },
  { id: "a4", label: "Area 4 — Social & Behavioral Sciences" },
  { id: "a5a", label: "Area 5A — Physical Science" },
  { id: "a5b", label: "Area 5B — Biological Science" },
  { id: "a6", label: "Area 6 — Language Other Than English" },
];

/* ============ Cognitive Science, B.A. ============ */
const COGSCI = {
  id: "cogsci", type: "major", name: "Cognitive Science", degree: "B.A.",
  dept: ["COGSCI"], college: "Letters & Science",
  sections: [
    { id: "prereq", name: "Prerequisites", groups: [
      G("cs", "Computer Science", 1, ["COMPSCI61A", "COMPSCIC88C/DATAC88C", "ENGIN7"]),
      G("math", "Mathematics", 1, ["MATH51/XMATH51", "MATH16A/XMATH16A", "MATH1A/MATHN1A"], {
        exams: ["AP Calculus BC, score 3+", "AP Calculus AB, score 3+", "IB HL Math: Analysis & Approaches, score 5+",
          "IB HL Mathematics, score 5+", "IB HL Further Mathematics, score 6+", "A-Level Mathematics", "A-Level Further Mathematics"],
      }),
      G("statthink", "Statistical Thinking", 1, ["COMPSCIC8/DATAC8/INFOC8/STATC8", "STAT2", "STAT20"], {
        exams: ["AP Statistics, score 3+"],
      }),
    ]},
    { id: "lower", name: "Lower division", groups: [
      G("quant", "Quantitative", 1, ["COMPSCI70", "MATH55/MATHN55"]),
      G("bio", "Biology", 1, ["MCELLBI61/NEU61/NEUC61/PSYCHC61", "NEUC64/PSYCHC64", "PSYCH110/PSYCHN110"]),
      G("intro", "Cognitive Science", 1, ["COGSCIN1", "COGSCI1", "COGSCI1B"]),
    ]},
    { id: "upper", name: "Upper division areas", note: "One course from each area below, and a single course can only close one area. Six areas are encoded here; confirm the list against the Academic Guide for your catalog year before you count on it.", groups: [
      G("area_cn", "Cognitive Neuroscience", 1, ["ANTHRO107","COGSCI132","COGSCI170","COGSCI171","COGSCI172",
        "COGSCIC126/PSYCHC126","COGSCIC127/PSYCHC127","NEU128","NEU162","NEU164","PSYCH114",
        "PSYCH117/PSYCHN117","PSYCH133/PSYCHN133"]),
      G("area_cp", "Cognitive Psychology", 1, ["COGSCI115","COGSCI146","COGSCI181","COGSCI182","COGSCIC100",
        "COGSCIC126/PSYCHC126","COGSCIN100/PSYCHC120","LINGUISC146/LINGUIS146/PSYCHC143","PSYCH125",
        "PSYCH140","PSYCH147","PSYCH164","PSYCHN120","PSYCHN140"]),
      G("area_cm", "Computational Modeling", 1, ["COGSCIC131/COGSCI131/PSYCHC123","COGSCI132","COGSCI190","COMPSCI188"]),
      G("area_ln", "Linguistics", 1, ["COGSCI144","COGSCIC101/LINGUISC105","COGSCIC142/LINGUISC142",
        "COGSCIC147/LINGUISC147","LINGUIS100","LINGUIS108"]),
      G("area_ph", "Philosophy", 1, ["AGRS36","COGSCI180","COGSCI181","PHILOSW12A","PHILOS3","PHILOS12A",
        "PHILOS25A","PHILOS25B","PHILOS122","PHILOS132","PHILOS133","PHILOS135","PHILOS136"]),
      G("area_sc", "Society, Culture, and Cognition", 1, ["AFRICAM115","ANTHRO149","ANTHRO166","COGSCI181",
        "COGSCIC103/INFO103/INFOC103/HISTORYC192/MEDIASTC104C","COGSCIC104/LINGUISC104","ECON119","EDUC132",
        "EDUC140A/EDUC140AC","EDUCC130","LINGUIS109","LINGUIS150","LINGUIS150A","PSYCH160","PSYCH166",
        "PSYCH164","PSYCH166AC","PSYCHN160/SOCIOL150"]),
    ]},
    { id: "elect", name: "Electives", note: "Three more courses from the approved list. Anything already counted for an area above cannot be reused here.", groups: [
      G("electives", "Approved electives", 3, ("AFRICAM115 AFRICAMC134 AMERSTDC134 ANTHRO107 ANTHRO111 ANTHRO149 ANTHRO160AC ANTHRO161 " +
        "ANTHRO166 ART178 BIOENGC171 COGSCI115 COGSCI131 COGSCI132 COGSCI144 COGSCI146 COGSCI150 COGSCI170 COGSCI171 " +
        "COGSCI172 COGSCI180 COGSCI181 COGSCI182 COGSCIC100 COGSCIC101 COGSCIC103 COGSCIC104 COGSCIC124 COGSCIC126 " +
        "COGSCIC127 COGSCIC131 COGSCIC140 COGSCIC142 COGSCIC147 COGSCIN100 COMPSCI160 COMPSCI170 COMPSCI176 COMPSCI186 " +
        "COMPSCI188 COMPSCI189 COMPSCI287 COMPSCI288 COMPSCIC100 COMPSCIC280 DATAC100 DATAC104 DATAC140 ECON119 ECONC110 " +
        "EDUC130 EDUC132 EDUC140A EDUC140AC EDUC224A EDUCC229A ENGLISH172 ESPM161 FILM179 HISTORYC182C HISTORYC184D " +
        "HISTORYC192 INDENG170 INFO103 INFO146 INFO159 INFO188 INFO213 INFO232 INFO290 INFO290A INFOC103 INFOC262 INFOC265 " +
        "INTEGBI139 INTEGBIC143A ISF100J ISFC100G JOURNC141 LEGALST181 LEGALST183 LINGUIS100 LINGUIS106 LINGUIS108 " +
        "LINGUIS109 LINGUIS110 LINGUIS115 LINGUIS120 LINGUIS121 LINGUIS123 LINGUIS124 LINGUIS125 LINGUIS130 LINGUIS146 " +
        "LINGUIS150 LINGUIS150A LINGUIS151 LINGUIS158 LINGUIS170 LINGUIS181 LINGUIS187 LINGUISC104 LINGUISC105 LINGUISC139 " +
        "LINGUISC142 LINGUISC146 LINGUISC147 LINGUISC160 LS124 LSC160T MATH110 MCELLBI163 MECENGC205 MEDIAST101 MEDIAST102 " +
        "MEDIAST103 MEDIAST104B MEDIAST111 MEDIAST111B MEDIAST111C MEDIAST112 MEDIASTC103 MEDIASTC104C MELC156 MUSIC108 " +
        "MUSIC108M MUSIC109 MUSIC109M NATAMST151 NEU100A NEU100B NEU128 NEU152 NEU162 NEU164 NEU165 NEU171L NEU173L NEUC121 " +
        "NEUC124 NEUC125 NEUC126 NEUROSCC129 NWMEDIA190 NWMEDIAC203 NWMEDIAC262 NWMEDIAC265 PBHLTHC129 PHILOS107 PHILOS110 " +
        "PHILOS122 PHILOS125 PHILOS126 PHILOS128 PHILOS132 PHILOS133 PHILOS135 PHILOS136 PHILOS138 PHILOS140A PHILOS140B " +
        "PHILOS141 PHILOS151 PHILOS153 PHILOS154 PHILOS170 PHILOS176 PHILOS178 PHILOS185 PHILOS186 PHILOS186B PHILOS188 " +
        "PHILOSC132 PHILOSW12A POLSCI161 POLSCI164A POLSCIC135 PSYCH101 PSYCH114 PSYCH115 PSYCH117 PSYCH121 PSYCH124 " +
        "PSYCH125 PSYCH128 PSYCH130 PSYCH131 PSYCH133 PSYCH134 PSYCH135 PSYCH136 PSYCH137 PSYCH140 PSYCH144 PSYCH147 " +
        "PSYCH150 PSYCH156 PSYCH160 PSYCH163 PSYCH164 PSYCH166AC PSYCH167AC PSYCH169 PSYCHC111 PSYCHC113 PSYCHC115C " +
        "PSYCHC116 PSYCHC120 PSYCHC123 PSYCHC124 PSYCHC126 PSYCHC127 PSYCHC143 PSYCHC223 PSYCHN117 PSYCHN120 PSYCHN130 " +
        "PSYCHN133 PSYCHN140 PSYCHN150 PSYCHN160 PSYCHN162 RHETOR103A RHETOR103B RHETOR110 RHETOR170 SLAVICC139 SOCIOL150 " +
        "SOCIOL166 SOCIOL167 SPANISH100 SPANISH166 STAT133 STAT134 STAT155 STATC100 STATC140 STSC100 STSC104D UGBA105 " +
        "UGBA136F UGBA143 UGBA160 UGBA167 UGBA177 UGBA192AC UGIS120 VISSCI265 VISSCIC280").split(/\s+/)),
    ]},
  ],
};

/* ============ Data Science minor (CDSS) ============ */
const DS_ELECTIVES = ("ART172 ASTRON128 BIOENG145 BIOENGC131 BIOENGC142 BIOENGC146 CHEM121 CHEM179 CHEMC142 " +
  "CHEMC191 CHMENG143 CIVENG191 CMPBIOC131 CMPBIO156 CMPBIOC146 COMPSCI161 COMPSCI162 COMPSCI164 COMPSCI168 " +
  "COMPSCI169 COMPSCI170 COMPSCI186 COMPSCI188 COMPSCI189 COMPSCIC182 COMPSCIC191 COGSCI131 COGSCI132 COGSCIC131 " +
  "COGSCIC140 CPHC100 CPHC146 CYPLAN101 DATA144 DATAC102 DATAC140 DATAC146 DATAC182 DEMOG110 DEMOG130 DEMOG180 " +
  "DEMOGC126 DEMOGC175 DIGHUM100 DIGHUM150A DIGHUM150B DIGHUM150C ECON140 ECON141 ECON143 ECON144 ECON148 ECONC142 " +
  "ECONC175 EECS126 EECS127 EECS183 ELENG120 ELENG122 ELENG123 ENERES131 ENGIN150 ENVECON105 ENVECON153 ENVECONC115 " +
  "ENVECONC118 EPS101 EPS109 ESPM157 ESPM172 ESPM173 ESPM174 ESPMC104 ESPMC167 GEOG187 GEOGC188 HISTART192DH IASC118 " +
  "INDENG115 INDENG135 INDENG142 INDENG142A INDENG142B INDENG156 INDENG160 INDENG162 INDENG164 INDENG165 INDENG166 " +
  "INDENG172 INDENG173 INDENG174 INFO154 INFO159 INTEGBI111 INTEGBI120 INTEGBI134L JOURN124 LDARCHC188 LEGALST122 " +
  "LEGALST123 LINGUISC160 MATH127 MCELLBI149 MCELLBIC146 MECENG100 MECENG135 MELC110 MUSIC158A NEU172L NUCENG130 " +
  "NUCENG155 NUCENG175 NUSCTX121 PBHLTH132 PBHLTH142 PBHLTH145 PBHLTH150A PBHLTH167 PBHLTH177A PBHLTHC160 PHYSICS188 " +
  "PHYSICSC191 PLANTBIC146 POLSCI132B POLSCI132C POLSCIC131A PSYCH101D PSYCHC123 PUBPOLC142 SOCIOL106 SOCIOL165 " +
  "SOCIOLC126 STAT134 STAT135 STAT150 STAT151A STAT152 STAT153 STAT154 STAT158 STAT159 STAT165 STATC102 STATC140 " +
  "UGBA104 UGBA134 UGBA161").split(/\s+/);

const DS_HCE = ["AFRICAMC134/AFRICAM134/AMERSTDC134", "BIOENG100", "CYPLAN101",
  "DATAC104/HISTORYC184D/STSC104D", "DIGHUM100", "ESPMC167/PBHLTHC160", "INFO188", "ISF100J",
  "NWMEDIA151AC", "PHILOS121", "POLECON159"];

const DATASCI_MINOR = {
  id: "dsminor", type: "minor", name: "Data Science", degree: "Minor",
  dept: ["DATA", "STAT", "COMPSCI", "INFO"], college: "Computing, Data Science, and Society",
  pathways: { id: "dsPath", label: "Upper division pathway",
    options: [{ id: "data", label: "Data 100 pathway" }, { id: "stats", label: "Statistics pathway" }] },
  rules: [
    "All minor courses must be taken for a letter grade, with a C- or better in each and a 2.0 GPA across the minor.",
    "At most one upper-division course may overlap with each of your majors.",
    "At most one course offered by or cross-listed with your major department may count toward the upper-division minor requirements, including any overlapping course.",
    "An upper-division course used to satisfy a lower-division requirement (say, STAT 134 for probability) does not count toward the four upper-division courses and does not use up your overlap.",
    "At most one course total between STAT 20, ENGIN 7, and ENGIN W7 may count.",
    "Declare the minor before the first day of classes of your expected graduation term.",
  ],
  sections: [
    { id: "lower", name: "Lower division", groups: [
      G("found", "Foundations", 1, ["DATAC8/COMPSCIC8/INFOC8/STATC8", "STAT20"]),
      G("prog", "Programming", 1, ["COMPSCI61A", "DATAC88C/COMPSCIC88C", "ENGIN7/ENGINW7"]),
      G("prob", "Probability", 1, ["CIVENG93","COMPSCI70","DATAC140/STATC140","DATAC88S/STATC88S","DATA89",
        "EECS126","INDENG172","MATH10B/MATHN10B","MATH55","MATH106","STAT134"]),
    ]},
    { id: "upper_data", name: "Upper division — Data 100 pathway", pathway: "data", groups: [
      G("gateway_d", "Gateway", 1, ["COMPSCIC100/DATAC100/STATC100"]),
      G("hce_d", "Human Contexts & Ethics", 1, DS_HCE),
      G("elect_d", "Electives", 2, DS_ELECTIVES),
    ]},
    { id: "upper_stats", name: "Upper division — Statistics pathway", pathway: "stats", groups: [
      G("gateway_s", "Gateway", 2, ["DATAC131A/STATC131A", "STAT133"], { all: true }),
      G("hce_s", "Human Contexts & Ethics", 1, DS_HCE),
      G("elect_s", "Electives", 1, DS_ELECTIVES),
    ]},
  ],
};

const CATALOG = { majors: [COGSCI], minors: [DATASCI_MINOR] };

/* ============================================================
   Parser: paste a Berkeley Academic Guide requirements page
   ============================================================ */
/* Guide pages phrase the same instruction a dozen ways — "Complete at least 2 of
   the following Courses:", "Select one of the following:", "Complete all of the
   following". Anything this misses is read as a heading instead, which shows up
   as a mis-named block rather than as lost courses. */
const NUMWORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const DIRECTIVE = /^(?:complete|select|choose|take)\s+(?:at\s+least\s+|any\s+|a\s+minimum\s+of\s+)?(\d+|all|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:of\s+)?(?:the\s+)?(?:following)?\s*(?:courses?|options?|units?)?\s*:?\s*$/i;
/* "Complete the following course:" — no count, means all of them. */
const DIRECTIVE_ALL = /^(?:complete|take)\s+the\s+following\s+courses?\s*:?\s*$/i;
const COURSE_LINE = /^(OR\s+)?([A-Z][A-Za-z]*\s?[A-Z]?\d+[A-Z]*)\s*[-–]\s*(.+)$/;
const BARE_CODE = /^([A-Z][A-Z]*)\s?([A-Z]?\d+[A-Z]*)$/;
const EXAM_LINE = /^(AP|IB|ALEVEL|A-LEVEL)\s*:\s*(.+)$/i;

function parseGuide(text, name) {
  const lines = String(text).split("\n").map((l) => l.trim()).filter(Boolean);
  const groups = [];
  let heading = "";
  let lastHeading = "";   // so a second block under one heading is not just "Requirement 2"
  let underHeading = 0;
  let i = 0;
  while (i < lines.length) {
    const d = lines[i].match(DIRECTIVE) || (DIRECTIVE_ALL.test(lines[i]) ? [lines[i], "all"] : null);
    if (!d) {
      if (!COURSE_LINE.test(lines[i]) && !BARE_CODE.test(lines[i])) {
        heading = lines[i].replace(/[:.]$/, "");
        lastHeading = heading;
        underHeading = 0;
      }
      i++;
      continue;
    }
    const word = String(d[1]).toLowerCase();
    const need = word === "all" ? -1 : (NUMWORD[word] || parseInt(word, 10));
    const options = [];
    const exams = [];
    i++;
    while (i < lines.length) {
      const line = lines[i];
      const cm = line.match(COURSE_LINE);
      const bm = !cm && line.match(BARE_CODE);
      const em = !cm && !bm && line.match(EXAM_LINE);
      if (cm) {
        const code = norm(cm[2]);
        if (cm[1] && options.length) options[options.length - 1].codes.push(code);
        else options.push({ codes: [code] });
        if (cm[3] && !T[code]) T[code] = cm[3].trim();
      } else if (bm) {
        options.push({ codes: [norm(line)] });
      } else if (em) {
        exams.push(line);
      } else break;
      i++;
    }
    if (options.length || exams.length) {
      groups.push({
        kind: "courses", id: "p" + groups.length + "_" + norm(heading).slice(0, 12),
        name: heading || (lastHeading ? `${lastHeading} (${underHeading + 1})` : "Requirement " + (groups.length + 1)),
        need: need === -1 ? options.length : need,
        all: need === -1, options, exams: exams.length ? exams : undefined,
      });
    }
    underHeading++;
    heading = "";
  }
  if (!groups.length) return null;
  return {
    id: "custom_" + Date.now(), type: "custom", custom: true,
    name: name || "Pasted program", degree: "", dept: [],
    sections: [{ id: "all", name: "Requirements", groups }],
  };
}

/* ============================================================
   Assignment engine
   ============================================================ */
function programGroups(program, pathway) {
  const out = [];
  for (const s of program.sections || []) {
    if (s.pathway && s.pathway !== pathway) continue;
    for (const g of s.groups) out.push({ ...g, sectionId: s.id, sectionName: s.name, sectionNote: s.note, programId: program.id });
  }
  return out;
}
const eligible = (g, c) => g.options && g.options.some((o) => o.codes.includes(c.norm));

function assignCourses(groups, courses, pins, excl) {
  const used = new Map();
  const byGroup = {};
  const cg = groups.filter((g) => g.kind === "courses");
  const skipped = (g, id) => ((excl && excl[g.id]) || []).includes(id);
  cg.forEach((g) => { byGroup[g.id] = []; });
  for (const g of cg) {
    for (const cid of pins[g.id] || []) {
      const c = courses.find((x) => x.id === cid);
      if (!c || used.has(cid) || byGroup[g.id].length >= g.need) continue;
      if (!g.open && !eligible(g, c)) continue;
      byGroup[g.id].push(cid); used.set(cid, g.id);
    }
  }
  const rest = cg
    .filter((g) => !g.open && byGroup[g.id].length < g.need)
    .map((g) => ({ g, pool: courses.filter((c) => eligible(g, c)).length }))
    .sort((a, b) => a.pool - b.pool)
    .map((x) => x.g);
  for (const g of rest) {
    for (const c of courses) {
      if (byGroup[g.id].length >= g.need) break;
      if (used.has(c.id) || skipped(g, c.id) || !isPassing(c.grade) || !eligible(g, c)) continue;
      byGroup[g.id].push(c.id); used.set(c.id, g.id);
    }
  }
  return { byGroup, used };
}

function groupProgress(g, byGroup, checkState, auto, igetcFull, entry) {
  if (g.kind === "check") {
    const items = g.checks.filter((c) => !c.transferOnly || entry === "transfer");
    const done = items.filter((c) => checkOn(c, checkState, auto, igetcFull)).length;
    return { done, need: items.length };
  }
  const n = (byGroup[g.id] || []).length + (checkState["exam:" + g.id] ? 1 : 0);
  return { done: Math.min(n, g.need), need: g.need };
}
function checkOn(item, checkState, auto, igetcFull) {
  if (item.auto) return !!auto[item.auto];
  if (item.igetc && igetcFull) return true;
  return !!checkState[item.id];
}

/* ============================================================
   Persistence
   ============================================================ */
const KEY = "berkeley-degree-ledger:v1";
const BLANK = {
  profile: { name: "", entry: "freshman", gpa: "", igetc: "none", simultaneous: false,
    secondCollege: "", dsPath: "data", majors: ["cogsci"], minors: ["dsminor"] },
  courses: [], pins: {}, excl: {}, checks: {}, customPrograms: [], certAreas: {},
};

function useStore() {
  const [state, setState] = useState(BLANK);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState("");
  const first = useRef(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        if (r && r.value) {
          const v = JSON.parse(r.value);
          setState({ ...BLANK, ...v, profile: { ...BLANK.profile, ...(v.profile || {}) } });
        }
      } catch (e) { /* nothing stored yet */ }
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(async () => {
      try {
        await window.storage.set(KEY, JSON.stringify(state));
        setSaved(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      } catch (e) { setSaved("not saved"); }
    }, 500);
    return () => clearTimeout(t);
  }, [state, ready]);
  return [state, setState, ready, saved];
}

/* ============================================================
   Small pieces
   ============================================================ */
const Chip = ({ tone, children }) => <span className={"bdl-chip " + (tone || "")}>{children}</span>;
const Flag = ({ tone, children }) => <div className={"bdl-flag " + (tone || "")}>{children}</div>;

function Meter({ done, need }) {
  const pct = need ? Math.min(100, (done / need) * 100) : 0;
  return <div className="bdl-meter"><i className={pct >= 100 ? "full" : ""} style={{ width: pct + "%" }} /></div>;
}

function CheckBlock({ group, state, setChecks, auto, igetcFull, entry }) {
  const items = group.checks.filter((c) => !c.transferOnly || entry === "transfer");
  const done = items.filter((c) => checkOn(c, state, auto, igetcFull)).length;
  const cls = done === items.length ? "done" : done ? "part" : "";
  return (
    <div className={"bdl-block " + cls} id={"blk-" + group.id}>
      <div className="bdl-bhead">
        <span className="bdl-glyph">{done === items.length ? "■" : done ? "◪" : "□"}</span>
        <span className="bdl-bname">{group.name}</span>
        <span className="bdl-count">{done}/{items.length}</span>
      </div>
      <div className="bdl-body">
        {items.map((it) => {
          const on = checkOn(it, state, auto, igetcFull);
          const locked = !!it.auto || (it.igetc && igetcFull);
          return (
            <label key={it.id} className="bdl-check">
              <input type="checkbox" checked={on} disabled={locked}
                onChange={(e) => setChecks(it.id, e.target.checked)} />
              <span>
                {it.label}{" "}
                {it.auto && <Chip tone={on ? "ok" : ""}>tracked</Chip>}
                {it.igetc && igetcFull && <Chip tone="ok">certified</Chip>}
                {it.desc && <small>{it.desc}</small>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* One requirement block: what closes it, and which of those courses you have.
   Long lists (the Cognitive Science electives run past two hundred) get a
   search box and a filter rather than a "show all" that dumps the lot. */
function CourseBlock({ group, courses, assigned, used, usage, onPin, onRelease, onQuickAdd, checks, setChecks }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const examOn = !!checks["exam:" + group.id];
  const done = Math.min(assigned.length + (examOn ? 1 : 0), group.need);
  const cls = done >= group.need ? "done" : done ? "part" : "";
  const byId = (id) => courses.find((c) => c.id === id);
  const takenFor = (o) => courses.find((c) => o.codes.includes(c.norm));

  const opts = group.options || [];
  /* Options you have taken first, then ones on your record counting elsewhere,
     then everything you have not taken. */
  const ranked = useMemo(() => {
    const score = (o) => {
      const c = takenFor(o);
      if (!c) return 2;
      return assigned.includes(c.id) ? 0 : 1;
    };
    return [...opts].sort((a, b) => score(a) - score(b));
  }, [opts, courses, assigned]);

  const onRecord = useMemo(() => ranked.filter((o) => takenFor(o)).length, [ranked, courses]);

  const filtered = useMemo(() => {
    const needle = q.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    let list = ranked;
    if (mineOnly) list = list.filter((o) => takenFor(o));
    if (needle) list = list.filter((o) =>
      o.codes.some((c) => c.includes(needle)) ||
      (titleOf(o.codes[0]) || "").toUpperCase().includes(q.trim().toUpperCase()));
    return list;
  }, [ranked, q, mineOnly, courses]);

  const searching = !!q.trim() || mineOnly;
  const shown = showAll || searching ? filtered : filtered.slice(0, 8);
  const searchable = ranked.length > 12;
  /* An upper-division tag on a list where everything is upper division is just
     noise on every row, so it only appears where the list actually mixes. */
  const mixedUD = useMemo(() => {
    const ud = shown.filter((o) => isUpperDiv(o.codes[0])).length;
    return ud > 0 && ud < shown.length;
  }, [shown]);

  /* Everywhere this course counts other than the block being drawn. */
  const elsewhere = (cid) => (usage && usage.get(cid) ? usage.get(cid) : []).filter((u) => u.groupId !== group.id);

  return (
    <div className={"bdl-block " + cls} id={"blk-" + group.id}>
      <button className="bdl-bhead" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="bdl-glyph">{done >= group.need ? "■" : done ? "◪" : "□"}</span>
        <span className="bdl-bname">{group.name}</span>
        {assigned.length > 0 && !open && (
          <span className="bdl-ctitle" style={{ flex: "0 1 auto", fontFamily: "var(--mono)", fontSize: 11.5 }}>
            {assigned.map((id) => pretty(byId(id) ? byId(id).code : "")).join(" · ")}
          </span>
        )}
        <span className="bdl-count">{done}/{group.need} {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="bdl-body">
          <p className="bdl-hint">
            {group.all ? "All of these are required." : `Pick ${group.need} of ${opts.length}.`}
            {onRecord > 0 && ` ${onRecord} ${onRecord === 1 ? "is" : "are"} on your record.`}
            {" Tap one to count it here; tap again to release it."}
          </p>
          {group.exams && group.exams.map((x, k) => (
            <label key={k} className="bdl-check">
              <input type="checkbox" checked={examOn && checks["exam:" + group.id] === x}
                onChange={(e) => setChecks("exam:" + group.id, e.target.checked ? x : false)} />
              <span>{x}</span>
            </label>
          ))}

          {searchable && (
            <>
              <input className="bdl-find" value={q} placeholder={`Search ${ranked.length} courses — code or title`}
                onChange={(e) => setQ(e.target.value)} />
              <div className="bdl-optbar">
                <button className={mineOnly ? "sel" : ""} onClick={() => setMineOnly(!mineOnly)}>
                  On my record{onRecord ? ` · ${onRecord}` : ""}
                </button>
                <span>{filtered.length} showing</span>
              </div>
            </>
          )}

          <div className="bdl-opts">
            {shown.map((o, k) => {
              const c = takenFor(o);
              const isHit = c && assigned.includes(c.id);
              const others = c ? elsewhere(c.id) : [];
              const ud = isUpperDiv(o.codes[0]);
              /* Built-in lists carry titles for only the courses worth naming;
                 anything the student typed in themselves fills the rest. */
              const title = titleOf(o.codes[0]) || (c && c.title) || "";
              return (
                <button key={k}
                  className={"bdl-opt " + (isHit ? "hit" : "")}
                  onClick={() => (isHit ? onRelease(group.id, c.id) : c ? onPin(group.id, c.id) : onQuickAdd(o.codes[0]))}>
                  <span className="bdl-code">{o.codes.map(pretty).join(" / ")}</span>
                  {title && <span className="bdl-ctitle">{title}</span>}
                  {!title && <span className="bdl-ctitle" />}
                  {ud && mixedUD && <span className="bdl-ud">UD</span>}
                  {isHit && <span className="bdl-mark">✓ {c.grade || "in progress"}</span>}
                  {!isHit && c && <Chip tone="warn">{others.length ? "counting elsewhere" : "on record"}</Chip>}
                  {!c && <span className="bdl-mark" style={{ color: "var(--slate)" }}>+ add</span>}
                  {others.length > 0 && (
                    <span className="bdl-where">
                      Also counting for {others.map((u, j) => (
                        <span key={j}>{j > 0 ? ", " : ""}<b>{u.progName}</b> · {u.groupName}</span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
            {shown.length === 0 && (
              <p className="bdl-none">
                Nothing matches{q.trim() ? ` “${q.trim()}”` : ""}{mineOnly ? " on your record" : ""}.
              </p>
            )}
          </div>

          {!searching && filtered.length > 8 && (
            <button className="bdl-more" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show fewer" : `Show all ${filtered.length} courses`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OpenBlock({ group, courses, assigned, onPin, onRelease }) {
  const byId = (id) => courses.find((c) => c.id === id);
  const done = assigned.length;
  const cls = done >= group.need ? "done" : "";
  return (
    <div className={"bdl-block " + cls} id={"blk-" + group.id}>
      <div className="bdl-bhead">
        <span className="bdl-glyph">{done >= group.need ? "■" : "□"}</span>
        <span className="bdl-bname">{group.name}</span>
        <span className="bdl-count">{done}/{group.need}</span>
      </div>
      <div className="bdl-body">
        <p className="bdl-hint">{group.hint}</p>
        {assigned.map((id) => (
          <div key={id} className="bdl-opt hit">
            <span className="bdl-code">{pretty(byId(id) ? byId(id).code : "")}</span>
            <span className="bdl-ctitle">{byId(id) ? byId(id).title : ""}</span>
            <button className="bdl-btn tiny ghost" onClick={() => onRelease(group.id, id)}>remove</button>
          </div>
        ))}
        {done < group.need && (
          <select className="bdl-sel" value="" onChange={(e) => e.target.value && onPin(group.id, e.target.value)}>
            <option value="">Choose from your courses…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{pretty(c.code)} — {c.title || "untitled"}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Views
   ============================================================ */
/* Turn a pasted or hand-built program into something the rules engine can use.
   `dept` drives the minor's "one course from your major department" rule, so it
   is guessed from whichever subject shows up most in the program's own course
   lists — shown back to the student as an editable field rather than hidden. */
function guessDept(prog) {
  const tally = {};
  for (const sec of prog.sections || [])
    for (const g of sec.groups || [])
      for (const o of g.options || [])
        for (const c of o.codes) {
          const sub = splitCode(c).subject;
          if (sub) tally[sub] = (tally[sub] || 0) + 1;
        }
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return best ? [best[0]] : [];
}

function AddProgram({ state, setState }) {
  const [mode, setMode] = useState("paste");
  const [pname, setPname] = useState("");
  const [ptype, setPtype] = useState("major");
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [bf, setBf] = useState({ name: "", need: "1", codes: "" });

  const commit = (prog) => {
    prog.type = ptype;
    prog.degree = ptype === "minor" ? "Minor" : ptype === "major" ? "Major" : "";
    prog.dept = guessDept(prog);
    setState((s) => ({ ...s, customPrograms: [...(s.customPrograms || []), prog] }));
    setPaste(""); setPname(""); setBlocks([]);
    const n = prog.sections[0].groups.length;
    setMsg(`Added ${prog.name} — ${n} requirement block${n === 1 ? "" : "s"}. It has its own tab now.`);
  };

  const addPasted = () => {
    const prog = parseGuide(paste, pname);
    if (!prog) { setMsg("Nothing parsed. Copy the Requirements tab of the Academic Guide page, blocks and all — the “Complete N of the following” lines are what the reader keys off."); return; }
    commit(prog);
  };

  const addBlock = () => {
    const codes = bf.codes.split(/[\s,]+/).map(norm).filter(Boolean);
    if (!bf.name.trim() || !codes.length) return;
    setBlocks((b) => [...b, { name: bf.name.trim(), need: Math.max(1, parseInt(bf.need, 10) || 1), codes }]);
    setBf({ name: "", need: "1", codes: "" });
  };
  const addBuilt = () => {
    if (!blocks.length) return;
    commit({
      id: "custom_" + Date.now(), custom: true, name: pname || "My program",
      sections: [{ id: "all", name: "Requirements",
        groups: blocks.map((b, i) => G("b" + i + "_" + norm(b.name).slice(0, 10), b.name, b.need, b.codes)) }],
    });
  };

  return (
    <div className="bdl-card">
      <h3>Any other program</h3>
      <p className="bdl-note">
        Every L&amp;S major and every CDSS minor works here. Only Cognitive Science and the Data Science minor
        ship with their course lists already typed in and checked; for anything else you load the requirements
        once and they stay on this device. Everything on the University, L&amp;S and Graduation tabs applies to
        you either way — those rules are the same for every major.
      </p>
      <div className="bdl-row" style={{ marginBottom: 11 }}>
        <label style={{ flex: "1 1 220px" }}>
          <span className="bdl-label">Program name</span>
          <input className="bdl-in" value={pname} placeholder="e.g. Psychology, B.A."
            onChange={(e) => setPname(e.target.value)} />
        </label>
        <label style={{ flex: "0 0 150px" }}>
          <span className="bdl-label">Counts as</span>
          <select className="bdl-sel" value={ptype} onChange={(e) => setPtype(e.target.value)}>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="custom">Something else</option>
          </select>
        </label>
      </div>
      <p className="bdl-note" style={{ fontSize: 12, marginBottom: 9 }}>
        Marking it a minor turns on the overlap rules: one shared course with each major, one course from your
        major's department, letter grades throughout.
      </p>

      <div className="bdl-switch" style={{ marginBottom: 11 }}>
        <button className={mode === "paste" ? "sel" : ""} onClick={() => setMode("paste")}>Paste from the Guide</button>
        <button className={mode === "build" ? "sel" : ""} onClick={() => setMode("build")}>Build blocks by hand</button>
      </div>

      {mode === "paste" ? (
        <>
          <p className="bdl-note" style={{ fontSize: 12.5 }}>
            Open your program in the{" "}
            <a href="https://guide.berkeley.edu/undergraduate/degree-programs/" target="_blank" rel="noopener noreferrer">
              Berkeley Academic Guide
            </a>, go to its Requirements tab, select the requirement blocks and paste them below. Block headings,
            course lists and OR cross-listings are read straight out of the text.
          </p>
          <textarea className="bdl-ta" value={paste}
            placeholder={"Lower Division\nComplete at least 1 of the following Courses:\nPSYCH 1 - General Psychology\nOR PSYCH N1 - General Psychology\n\nUpper Division\nComplete at least 2 of the following Courses:\nPSYCH 101 - Research Methods"}
            onChange={(e) => setPaste(e.target.value)} />
          <div className="bdl-row" style={{ marginTop: 9 }}>
            <button className="bdl-btn" onClick={addPasted} disabled={!paste.trim()}>Add program</button>
          </div>
        </>
      ) : (
        <>
          <p className="bdl-note" style={{ fontSize: 12.5 }}>
            One block per requirement: what it is called, how many courses close it, and which courses count.
            Codes can be typed however you like — <span style={{ fontFamily: "var(--mono)" }}>psych 101</span>,{" "}
            <span style={{ fontFamily: "var(--mono)" }}>PSYCH101</span>, separated by spaces or commas.
          </p>
          <div className="bdl-row">
            <label style={{ flex: "1 1 160px" }}>
              <span className="bdl-label">Block name</span>
              <input className="bdl-in" value={bf.name} placeholder="Upper-division core"
                onChange={(e) => setBf({ ...bf, name: e.target.value })} />
            </label>
            <label style={{ flex: "0 0 90px" }}>
              <span className="bdl-label">How many</span>
              <input className="bdl-in mono" value={bf.need} inputMode="numeric"
                onChange={(e) => setBf({ ...bf, need: e.target.value })} />
            </label>
          </div>
          <label className="bdl-field" style={{ marginTop: 9 }}>
            <span className="bdl-label">Courses that count</span>
            <input className="bdl-in mono" value={bf.codes} placeholder="PSYCH101 PSYCH110 PSYCH114"
              onChange={(e) => setBf({ ...bf, codes: e.target.value })} />
          </label>
          <div className="bdl-row">
            <button className="bdl-btn ghost tiny" onClick={addBlock}
              disabled={!bf.name.trim() || !bf.codes.trim()}>Add block</button>
          </div>
          {blocks.length > 0 && (
            <div style={{ marginTop: 11 }}>
              {blocks.map((b, i) => (
                <div key={i} className="bdl-stat">
                  <span>{b.name} <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--slate)" }}>
                    {b.need} of {b.codes.length}</span></span>
                  <button className="bdl-btn tiny danger"
                    onClick={() => setBlocks((x) => x.filter((_, j) => j !== i))}>remove</button>
                </div>
              ))}
              <div className="bdl-row" style={{ marginTop: 9 }}>
                <button className="bdl-btn" onClick={addBuilt}>Create program</button>
              </div>
            </div>
          )}
        </>
      )}

      {msg && <p className="bdl-note" style={{ marginTop: 10, marginBottom: 0 }}>{msg}</p>}

      {(state.customPrograms || []).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <span className="bdl-label">Loaded</span>
          {state.customPrograms.map((c) => (
            <div key={c.id} className="bdl-stat">
              <span>{c.name} <Chip>{c.type === "minor" ? "minor" : c.type === "major" ? "major" : "other"}</Chip></span>
              <button className="bdl-btn tiny danger"
                onClick={() => setState((s) => ({ ...s, customPrograms: s.customPrograms.filter((x) => x.id !== c.id) }))}>remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* The one-click clearances. Certification is the big one and it is real: a
   filed IGETC or Cal-GETC closes eleven blocks at once. Everything else here is
   a checkbox the student owns, because the College evaluates those case by
   case and a tracker that guesses is worse than one that asks. */
function Clearances({ p, setProfile, state, setState }) {
  const cert = p.igetc || "none";
  const areas = state.certAreas || {};
  const setArea = (id, v) => setState((s) => ({ ...s, certAreas: { ...(s.certAreas || {}), [id]: v } }));
  const areasOn = CERT_AREAS.filter((a) => areas[a.id]).length;

  if (p.entry !== "transfer") {
    return (
      <div className="bdl-card" style={{ marginBottom: 12 }}>
        <h3>Clearances</h3>
        <Flag>
          <span>
            <b>IGETC and Cal-GETC are for transfer students.</b> You started at Berkeley, so there is no
            certification to file — you clear Reading &amp; Composition, Quantitative Reasoning, Foreign Language
            and the seven breadth courses one at a time, and tick them off on the Letters &amp; Science tab as
            they land. Exam credit counts: an AP, IB or A-Level score can close Entry Level Writing,
            Quantitative Reasoning or Foreign Language outright, and the prerequisite blocks on your major tab
            each carry the exam scores that satisfy them.
          </span>
        </Flag>
        <p className="bdl-note" style={{ marginBottom: 0 }}>
          Berkeley expects Reading &amp; Composition Part A finished by the end of your second semester and
          Part B by the end of your fourth, so those two are worth closing early.
        </p>
      </div>
    );
  }

  return (
    <div className="bdl-card" style={{ marginBottom: 12 }}>
      <h3>General education certification</h3>
      <p className="bdl-note" style={{ fontSize: 12.5 }}>
        Cal-GETC replaced IGETC for students transferring from fall 2025 onward. Either one has to be certified
        by your community college — it is the college's filing that counts, not the coursework on its own.
      </p>
      <div className="bdl-big">
        <button className={cert === "full" ? "sel" : ""} onClick={() => setProfile("igetc", "full")}>
          <b>Fully certified</b>
          <small>My college filed a complete IGETC or Cal-GETC certification</small>
        </button>
        <button className={cert === "partial" ? "sel" : ""} onClick={() => setProfile("igetc", "partial")}>
          <b>Partially certified</b>
          <small>Some areas done, certification not complete</small>
        </button>
        <button className={cert === "none" ? "sel" : ""} onClick={() => setProfile("igetc", "none")}>
          <b>Not certified</b>
          <small>I'll clear L&amp;S requirements course by course</small>
        </button>
      </div>

      {cert === "full" && (
        <div style={{ marginTop: 13 }}>
          <Flag tone="ok">
            <span><b>Eleven blocks just closed.</b> They show a <em>certified</em> tag on the Letters &amp; Science
              and University tabs, and they cannot be un-ticked by hand while certification is set to full.</span>
          </Flag>
          <span className="bdl-label">Certification covers</span>
          <ul className="bdl-ledgerlist">{CERT_CLEARS.map((c) => <li key={c}>{c}</li>)}</ul>
          <span className="bdl-label" style={{ marginTop: 11, display: "block" }}>You still owe</span>
          <ul className="bdl-ledgerlist no">{CERT_LEAVES.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}

      {cert === "partial" && (
        <div style={{ marginTop: 13 }}>
          <Flag>
            <span>
              <b>Partial certification is read course by course.</b> L&amp;S decides which of its own requirements
              your finished areas satisfy, and the answer depends on the specific courses — so ticking an area
              here records what you have done rather than closing an L&amp;S block on your behalf. Close the
              blocks themselves on the Letters &amp; Science tab once your adviser confirms them.
            </span>
          </Flag>
          <span className="bdl-label">Areas completed {areasOn ? `— ${areasOn} of ${CERT_AREAS.length}` : ""}</span>
          {CERT_AREAS.map((a) => (
            <label key={a.id} className="bdl-check">
              <input type="checkbox" checked={!!areas[a.id]} onChange={(e) => setArea(a.id, e.target.checked)} />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      )}

      <p className="bdl-note" style={{ marginTop: 13, marginBottom: 0 }}>
        Add your community college work under <b>My courses</b> with the source set to Transfer, so the 70-unit
        ceiling and the unit totals come out right.
      </p>
    </div>
  );
}

function SetupView({ p, setProfile, state, setState }) {
  const majors = p.majors || [];
  const minors = p.minors || [];
  const setList = (k, i, v) => {
    const next = [...(p[k] || [])];
    if (v) next[i] = v; else next.splice(i, 1);
    setProfile(k, next.filter(Boolean));
  };

  return (
    <div>
      <p className="bdl-eyebrow">Step one</p>
      <h2 className="bdl-h2">Who's graduating</h2>
      <p className="bdl-note">Everything else on this page keys off these answers. Nothing here is sent anywhere; it stays on this device.</p>

      <div className="bdl-card" style={{ marginBottom: 12 }}>
        <h3>Student</h3>
        <label className="bdl-field">
          <span className="bdl-label">Name</span>
          <input className="bdl-in" value={p.name} placeholder="Optional"
            onChange={(e) => setProfile("name", e.target.value)} />
        </label>
        <div className="bdl-row">
          <div style={{ flex: "1 1 200px" }}>
            <span className="bdl-label">Path to Berkeley</span>
            <div className="bdl-switch">
              <button className={p.entry === "freshman" ? "sel" : ""} onClick={() => setProfile("entry", "freshman")}>Started as a freshman</button>
              <button className={p.entry === "transfer" ? "sel" : ""} onClick={() => setProfile("entry", "transfer")}>Transferred in</button>
            </div>
          </div>
          <label style={{ flex: "0 0 130px" }}>
            <span className="bdl-label">Cumulative GPA</span>
            <input className="bdl-in mono" value={p.gpa} placeholder="3.40" inputMode="decimal"
              onChange={(e) => setProfile("gpa", e.target.value)} />
          </label>
        </div>
      </div>

      <Clearances p={p} setProfile={setProfile} state={state} setState={setState} />

      <div className="bdl-card" style={{ marginBottom: 12 }}>
        <h3>Programs</h3>
        {majors.concat([""]).map((id, i) => (
          <label className="bdl-field" key={"maj" + i}>
            <span className="bdl-label">{i === 0 ? "Major" : "Second major"}</span>
            <select className="bdl-sel" value={id} onChange={(e) => setList("majors", i, e.target.value)}>
              <option value="">{i === 0 ? "No major loaded" : "Add another major…"}</option>
              {CATALOG.majors.map((m) => <option key={m.id} value={m.id}>{m.name}, {m.degree}</option>)}
            </select>
          </label>
        )).slice(0, Math.min(majors.length + 1, 3))}
        {minors.concat([""]).map((id, i) => (
          <label className="bdl-field" key={"min" + i}>
            <span className="bdl-label">{i === 0 ? "Minor" : "Second minor"}</span>
            <select className="bdl-sel" value={id} onChange={(e) => setList("minors", i, e.target.value)}>
              <option value="">{i === 0 ? "No minor" : "Add another minor…"}</option>
              {CATALOG.minors.map((m) => <option key={m.id} value={m.id}>{m.name} minor — {m.college}</option>)}
            </select>
          </label>
        )).slice(0, Math.min(minors.length + 1, 3))}
        <p className="bdl-note" style={{ fontSize: 12, marginTop: -4 }}>
          Only these two are typed in and checked against the Academic Guide. Load any other major or minor below —
          it gets its own tab and the same rules engine.
        </p>
        {minors.includes("dsminor") && (
          <label className="bdl-field">
            <span className="bdl-label">Data Science upper-division pathway</span>
            <div className="bdl-switch">
              <button className={p.dsPath === "data" ? "sel" : ""} onClick={() => setProfile("dsPath", "data")}>Data 100 pathway</button>
              <button className={p.dsPath === "stats" ? "sel" : ""} onClick={() => setProfile("dsPath", "stats")}>Statistics pathway</button>
            </div>
          </label>
        )}
        <label className="bdl-check" style={{ borderBottom: 0 }}>
          <input type="checkbox" checked={p.simultaneous} onChange={(e) => setProfile("simultaneous", e.target.checked)} />
          <span>I'm pursuing a simultaneous degree
            <small>Two bachelor's degrees at once, usually across two colleges. Adds the extra rules to the graduation check.</small></span>
        </label>
        {p.simultaneous && (
          <label className="bdl-field" style={{ marginTop: 10 }}>
            <span className="bdl-label">Second college or school</span>
            <input className="bdl-in" value={p.secondCollege} placeholder="e.g. Computing, Data Science, and Society"
              onChange={(e) => setProfile("secondCollege", e.target.value)} />
          </label>
        )}
      </div>

      <AddProgram state={state} setState={setState} />
    </div>
  );
}


function CoursesView({ courses, setState, audits }) {
  const [f, setF] = useState({ code: "", title: "", units: "4", grade: "", term: "", source: "berkeley" });
  const add = () => {
    if (!f.code.trim()) return;
    const code = norm(f.code);
    setState((s) => ({ ...s, courses: [...s.courses, {
      id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
      code, title: f.title || titleOf(code), units: parseFloat(f.units) || 0,
      grade: f.grade, term: f.term, source: f.source }] }));
    setF({ ...f, code: "", title: "", grade: "", units: "4" });
  };
  const edit = (id, k, v) => setState((s) => ({ ...s, courses: s.courses.map((c) => (c.id === id ? { ...c, [k]: v } : c)) }));
  const drop = (id) => setState((s) => ({ ...s, courses: s.courses.filter((c) => c.id !== id),
    pins: Object.fromEntries(Object.entries(s.pins).map(([k, v]) => [k, v.filter((x) => x !== id)])) }));

  const appliedTo = (cid) => {
    const out = [];
    for (const a of audits) for (const g of a.groups)
      if ((a.byGroup[g.id] || []).includes(cid)) out.push(`${a.prog.name} · ${g.name}`);
    return out;
  };

  return (
    <div>
      <p className="bdl-eyebrow">Your record</p>
      <h2 className="bdl-h2">My courses</h2>
      <p className="bdl-note">
        One row per course, however you earned it. Blocks fill themselves from this list, scarcest requirement first,
        and never count one course twice inside the same program. Leave the grade blank for anything still in progress.
      </p>

      <div className="bdl-card" style={{ marginBottom: 16 }}>
        <h3>Add a course</h3>
        <div className="bdl-row">
          <label style={{ flex: "1 1 120px" }}>
            <span className="bdl-label">Code</span>
            <input className="bdl-in mono" value={f.code} placeholder="COGSCI C126"
              onChange={(e) => setF({ ...f, code: e.target.value, title: titleOf(e.target.value) || f.title })}
              onKeyDown={(e) => e.key === "Enter" && add()} />
          </label>
          <label style={{ flex: "3 1 200px" }}>
            <span className="bdl-label">Title</span>
            <input className="bdl-in" value={f.title} placeholder="Optional" onChange={(e) => setF({ ...f, title: e.target.value })} />
          </label>
          <label style={{ flex: "0 0 74px" }}>
            <span className="bdl-label">Units</span>
            <input className="bdl-in mono" value={f.units} inputMode="decimal" onChange={(e) => setF({ ...f, units: e.target.value })} />
          </label>
          <label style={{ flex: "0 0 92px" }}>
            <span className="bdl-label">Grade</span>
            <select className="bdl-sel" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>
              {GRADES.map((g) => <option key={g} value={g}>{g || "—"}</option>)}
            </select>
          </label>
          <label style={{ flex: "0 0 110px" }}>
            <span className="bdl-label">Term</span>
            <input className="bdl-in" value={f.term} placeholder="Fa 25" onChange={(e) => setF({ ...f, term: e.target.value })} />
          </label>
          <label style={{ flex: "0 0 130px" }}>
            <span className="bdl-label">Source</span>
            <select className="bdl-sel" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
              <option value="berkeley">Berkeley</option>
              <option value="transfer">Transfer (CCC)</option>
              <option value="uc">Other UC / 4-year</option>
              <option value="exam">AP / IB / A-Level</option>
            </select>
          </label>
          <button className="bdl-btn" onClick={add}>Add</button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bdl-empty">No courses yet. Add one above, or open a requirement block and tap a course to drop it straight in.</div>
      ) : (
        <div className="bdl-card">
          <table className="bdl-tbl">
            <thead><tr>
              <th style={{ width: 110 }}>Code</th><th>Title</th><th style={{ width: 56 }}>Units</th>
              <th style={{ width: 84 }}>Grade</th><th style={{ width: 74 }}>Term</th>
              <th style={{ width: 96 }}>Source</th><th style={{ width: 40 }}></th>
            </tr></thead>
            <tbody>
              {courses.map((c) => {
                const app = appliedTo(c.id);
                return (
                  <tr key={c.id} className={app.length ? "" : "dim"}>
                    <td><span className="bdl-code">{pretty(c.code)}</span>{isUpperDiv(c.code) && <Chip>UD</Chip>}</td>
                    <td>
                      {c.title || <span style={{ color: "var(--slate)" }}>—</span>}
                      <div className="bdl-applied">
                        {app.length ? app.map((a, i) => <div key={i}>↳ {a}</div>) : "not counted anywhere yet"}
                      </div>
                    </td>
                    <td><input className="bdl-in mono" style={{ padding: "3px 5px" }} value={c.units}
                      onChange={(e) => edit(c.id, "units", parseFloat(e.target.value) || 0)} /></td>
                    <td>
                      <select className="bdl-sel" style={{ padding: "3px 5px" }} value={c.grade || ""}
                        onChange={(e) => edit(c.id, "grade", e.target.value)}>
                        {GRADES.map((g) => <option key={g} value={g}>{g || "—"}</option>)}
                      </select>
                    </td>
                    <td>{c.term || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--slate)" }}>{c.source}</td>
                    <td><button className="bdl-btn tiny danger" onClick={() => drop(c.id)}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* What is double counting, and how much of each allowance it has spent.
   The warnings above only fire once a rule is already broken; this shows the
   ledger the whole time, so "one more overlap and I'm over" is visible before
   it happens rather than after. */
function OverlapPanel({ audit, audits, courses, usage }) {
  const { prog, groups, byGroup } = audit;
  const byId = (id) => courses.find((c) => c.id === id);
  const majors = audits.filter((a) => a.prog.type === "major" && a.prog.id !== prog.id);

  /* Upper-division blocks are the ones the minor's overlap allowance is about. */
  const udGroupIds = new Set(groups.filter((g) => String(g.sectionId).startsWith("upper")).map((g) => g.id));
  const mine = [];
  for (const g of groups)
    for (const cid of byGroup[g.id] || [])
      mine.push({ cid, groupName: g.name, ud: udGroupIds.has(g.id) });

  const shared = mine
    .map((m) => ({ ...m, others: (usage.get(m.cid) || []).filter((u) => u.progId !== prog.id) }))
    .filter((m) => m.others.length > 0);

  const isMinor = prog.type === "minor";
  if (!isMinor && shared.length === 0) return null;

  /* Allowances, counted the way the minor states them. */
  const rows = majors.map((maj) => ({
    name: maj.prog.name,
    used: shared.filter((m) => m.ud && m.others.some((u) => u.progId === maj.prog.id)).length,
  }));
  const deptUsed = isMinor && prog.dept && prog.dept.length
    ? mine.filter((m) => m.ud && prog.dept.includes(splitCode((byId(m.cid) || {}).code || "").subject)).length
    : 0;

  return (
    <div className="bdl-card" style={{ marginBottom: 16 }}>
      <h3>Where courses are double counting</h3>

      {isMinor && rows.length > 0 && rows.map((r) => (
        <div key={r.name} className="bdl-stat">
          <span>Upper-division overlap with {r.name}</span>
          <b>
            {r.used} of 1{" "}
            {r.used > 1 ? <Chip tone="bad">over</Chip> : r.used === 1 ? <Chip tone="warn">spent</Chip> : <Chip tone="ok">free</Chip>}
          </b>
        </div>
      ))}
      {isMinor && prog.dept && prog.dept.length > 0 && (
        <div className="bdl-stat">
          <span>Upper-division courses from {prog.dept.join(" / ")}</span>
          <b>
            {deptUsed} of 1{" "}
            {deptUsed > 1 ? <Chip tone="bad">over</Chip> : deptUsed === 1 ? <Chip tone="warn">spent</Chip> : <Chip tone="ok">free</Chip>}
          </b>
        </div>
      )}

      <div style={{ marginTop: shared.length ? 11 : 0 }}>
        {shared.length === 0 ? (
          <p className="bdl-note" style={{ margin: 0, fontSize: 12.5 }}>
            Nothing is counting in two places yet. A course may count for this {prog.type} and for one major —
            beyond that the College stops allowing it.
          </p>
        ) : (
          shared.map((m) => {
            const c = byId(m.cid);
            return (
              <div key={m.cid} className="bdl-ovl">
                <span className="c">{pretty(c ? c.code : "")}</span>
                <span className="w">
                  {m.groupName}
                  {m.ud ? " (upper division)" : ""} — also{" "}
                  {m.others.map((u, i) => (
                    <span key={i}>{i > 0 ? ", " : ""}<b style={{ color: "var(--blue)" }}>{u.progName}</b> · {u.groupName}</span>
                  ))}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProgramView({ audit, courses, checks, setChecks, auto, igetcFull, entry, onPin, onRelease, onQuickAdd, warnings, usage, audits }) {
  const { prog, groups, byGroup, used } = audit;
  const sections = [];
  for (const g of groups) {
    let s = sections.find((x) => x.id === g.sectionId);
    if (!s) { s = { id: g.sectionId, name: g.sectionName, note: g.sectionNote, groups: [] }; sections.push(s); }
    s.groups.push(g);
  }
  const totals = groups.reduce((acc, g) => {
    const p = groupProgress(g, byGroup, checks, auto, igetcFull, entry);
    acc.done += p.done; acc.need += p.need; return acc;
  }, { done: 0, need: 0 });

  return (
    <div>
      <p className="bdl-eyebrow">
        {prog.type === "major" ? "Major" : prog.type === "minor" ? "Minor" : prog.type === "custom" ? "Added program" : "Required of everyone"}
        {prog.college ? " · " + prog.college : ""}
      </p>
      <h2 className="bdl-h2">{prog.name}{prog.degree ? `, ${prog.degree}` : ""}</h2>
      <p className="bdl-note">{prog.note || `${totals.done} of ${totals.need} requirements closed.`}</p>

      {warnings.map((w, i) => <Flag key={i} tone={w.tone}><span>{w.text}</span></Flag>)}

      <OverlapPanel audit={audit} audits={audits} courses={courses} usage={usage} />

      {sections.map((s) => (
        <section key={s.id} style={{ marginBottom: 26 }}>
          <p className="bdl-eyebrow" style={{ marginTop: 18 }}>{s.name}</p>
          {s.note && <p className="bdl-note" style={{ marginBottom: 10 }}>{s.note}</p>}
          {s.groups.map((g) =>
            g.kind === "check" ? (
              <CheckBlock key={g.id} group={g} state={checks} setChecks={setChecks}
                auto={auto} igetcFull={igetcFull} entry={entry} />
            ) : g.open ? (
              <OpenBlock key={g.id} group={g} courses={courses} assigned={byGroup[g.id] || []}
                onPin={onPin} onRelease={onRelease} />
            ) : (
              <CourseBlock key={g.id} group={g} courses={courses} assigned={byGroup[g.id] || []}
                used={used} usage={usage} onPin={onPin} onRelease={onRelease} onQuickAdd={onQuickAdd}
                checks={checks} setChecks={setChecks} />
            )
          )}
        </section>
      ))}

      {prog.rules && (
        <div className="bdl-card">
          <h3>Rules that come with this {prog.type}</h3>
          {prog.rules.map((r, i) => (
            <div key={i} className="bdl-stat" style={{ display: "block", fontSize: 13 }}>{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function GraduationView({ audits, checks, auto, igetcFull, p, stats, warnings }) {
  const rows = [];
  for (const a of audits) {
    const t = a.groups.reduce((acc, g) => {
      const pr = groupProgress(g, a.byGroup, checks, auto, igetcFull, p.entry);
      acc.done += pr.done; acc.need += pr.need;
      if (pr.done < pr.need) acc.open.push(g.name);
      return acc;
    }, { done: 0, need: 0, open: [] });
    rows.push({ name: a.prog.name + (a.prog.degree ? `, ${a.prog.degree}` : ""), ...t });
  }
  const allClear = rows.every((r) => r.done >= r.need) && !warnings.some((w) => w.tone === "bad");

  return (
    <div>
      <p className="bdl-eyebrow">The last look</p>
      <h2 className="bdl-h2">Graduation check</h2>
      <p className="bdl-note">
        Every block on this ledger, collapsed into one page. This is a planning tool, not the official audit —
        your Academic Progress Report in CalCentral and your college adviser have the final word.
      </p>

      <Flag tone={allClear ? "ok" : ""}>
        <span>{allClear
          ? "Everything on the ledger is closed. File the graduation application in CalCentral for the term you're finishing, and have your adviser confirm the APR."
          : "Still open below. Nothing here files your graduation application for you — that goes in through CalCentral, usually in the first weeks of your final term."}</span>
      </Flag>

      {warnings.map((w, i) => <Flag key={i} tone={w.tone}><span>{w.text}</span></Flag>)}

      <div className="bdl-card" style={{ marginBottom: 12 }}>
        <h3>Programs</h3>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "9px 0", borderBottom: "1px dotted var(--line)" }}>
            <div className="bdl-stat" style={{ borderBottom: 0, padding: 0 }}>
              <span><b style={{ fontFamily: "var(--sans)", fontWeight: 600 }}>{r.name}</b></span>
              <span>{r.done >= r.need ? <Chip tone="ok">complete</Chip> : <b>{r.done}/{r.need}</b>}</span>
            </div>
            <Meter done={r.done} need={r.need} />
            {r.open.length > 0 && (
              <div className="bdl-applied">Open: {r.open.slice(0, 6).join(" · ")}{r.open.length > 6 ? ` +${r.open.length - 6} more` : ""}</div>
            )}
          </div>
        ))}
      </div>

      <div className="bdl-card" style={{ marginBottom: 12 }}>
        <h3>Units and grades</h3>
        <div className="bdl-stat"><span>Total units</span><b>{stats.total} / 120 {stats.total >= 120 ? "✓" : ""}</b></div>
        <div className="bdl-stat"><span>Upper-division units</span><b>{stats.ud} / 36 {stats.ud >= 36 ? "✓" : ""}</b></div>
        <div className="bdl-stat"><span>Units graded P/NP</span><b>{stats.pnp} (cap {Math.floor(stats.total / 3)})</b></div>
        {p.entry === "transfer" && <div className="bdl-stat"><span>Community college units</span><b>{stats.ccc} / 70</b></div>}
        <div className="bdl-stat"><span>Cumulative GPA</span><b>{p.gpa || "—"}</b></div>
        <div className="bdl-stat"><span>Units still in progress</span><b>{stats.inprog}</b></div>
      </div>

      {p.simultaneous && (
        <div className="bdl-card" style={{ marginBottom: 12 }}>
          <h3>Simultaneous degree</h3>
          <p className="bdl-note" style={{ marginBottom: 8 }}>
            Two bachelor's degrees awarded at the same time{p.secondCollege ? `, here across L&S and ${p.secondCollege}` : ""}.
            The pieces that catch people out:
          </p>
          {[
            "Both colleges' full requirement sets have to be met — breadth, essential skills, unit rules, the lot. Where they differ, you do both.",
            "You apply through both colleges and need approval from each before your final year.",
            "Expect a higher unit total than 120; the second degree normally carries additional units beyond the first.",
            "Both majors must be complete at the same time. You can't finish one and add the other later — that's a second bachelor's, a different process.",
            "A course can generally satisfy requirements in both programs unless a program says otherwise, but major-specific overlap limits still apply.",
          ].map((r, i) => <div key={i} className="bdl-stat" style={{ display: "block", fontSize: 13 }}>{r}</div>)}
        </div>
      )}

      {p.entry === "transfer" && (
        <div className="bdl-card">
          <h3>Transfer-specific</h3>
          {[
            igetcFull ? "IGETC/Cal-GETC is marked fully certified, so L&S essential skills and breadth are closed above." :
              "No full certification on file, so each L&S essential skill and breadth area has to be cleared individually.",
            "American Cultures is never covered by certification. It has to be a Berkeley course or an approved transferable one.",
            "Senior residence still applies: 24 of your final 30 units in L&S at Berkeley.",
            "Community college credit is capped at 70 units toward the degree, though subject credit above that ceiling still clears requirements.",
            "Major prerequisites are matched course by course through ASSIST, not by certification.",
          ].map((r, i) => <div key={i} className="bdl-stat" style={{ display: "block", fontSize: 13 }}>{r}</div>)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   App
   ============================================================ */
export default function App() {
  const [state, setState, ready, saved] = useStore();
  const [tab, setTab] = useState("setup");
  const p = state.profile;

  const courses = useMemo(() => state.courses.map((c) => ({ ...c, norm: norm(c.code) })), [state.courses]);
  const igetcFull = p.entry === "transfer" && p.igetc === "full";

  const programs = useMemo(() => {
    const majors = (p.majors || []).map((id) => CATALOG.majors.find((m) => m.id === id)).filter(Boolean);
    const minors = (p.minors || []).map((id) => CATALOG.minors.find((m) => m.id === id)).filter(Boolean);
    return [UNIVERSITY, LS_COLLEGE, ...majors, ...minors, ...(state.customPrograms || [])];
  }, [p.majors, p.minors, state.customPrograms]);

  const audits = useMemo(() => programs.map((prog) => {
    const groups = programGroups(prog, p.dsPath);
    const pins = {}, excl = {};
    for (const g of groups) {
      pins[g.id] = state.pins[prog.id + ":" + g.id] || [];
      excl[g.id] = state.excl[prog.id + ":" + g.id] || [];
    }
    const { byGroup, used } = assignCourses(groups, courses, pins, excl);
    return { prog, groups, byGroup, used };
  }), [programs, courses, state.pins, state.excl, p.dsPath]);

  /* Every place a course is currently counting, across every program on the
     ledger. This is what makes double counting legible: a course row can say
     which other block is already claiming it instead of a bare "used
     elsewhere", and the overlap panel below is built from the same map. */
  const usage = useMemo(() => {
    const m = new Map();
    for (const a of audits)
      for (const g of a.groups)
        for (const cid of a.byGroup[g.id] || []) {
          if (!m.has(cid)) m.set(cid, []);
          m.get(cid).push({ progId: a.prog.id, progName: a.prog.name, progType: a.prog.type,
            groupId: g.id, groupName: g.name, sectionId: g.sectionId });
        }
    return m;
  }, [audits]);

  /* ---- unit stats ---- */
  const stats = useMemo(() => {
    const num = (c) => parseFloat(c.units) || 0;
    const s = { total: 0, ud: 0, pnp: 0, ccc: 0, inprog: 0 };
    for (const c of courses) {
      const u = num(c);
      if (c.grade === "F" || c.grade === "NP") continue;
      if (!c.grade || c.grade === "IP") { s.inprog += u; continue; }
      s.total += u;
      if (isUpperDiv(c.code)) s.ud += u;
      if (c.grade === "P") s.pnp += u;
      if (c.source === "transfer") s.ccc += u;
    }
    return s;
  }, [courses]);

  /* ---- automatic checks ---- */
  const auto = useMemo(() => {
    const majMinIds = new Set();
    for (const a of audits) {
      if (a.prog.type !== "major" && a.prog.type !== "minor") continue;
      for (const g of a.groups) (a.byGroup[g.id] || []).forEach((id) => majMinIds.add(id));
    }
    const bad = courses.filter((c) => majMinIds.has(c.id) && c.grade && !["A+","A","A-","B+","B","B-","C+","C","C-","IP"].includes(c.grade));
    return {
      gpa: parseFloat(p.gpa) >= 2.0,
      units120: stats.total >= 120,
      pnp: stats.total > 0 && stats.pnp <= stats.total / 3,
      ud36: stats.ud >= 36,
      ccc70: stats.ccc <= 70,
      cminus: majMinIds.size > 0 && bad.length === 0,
      badGraded: bad,
    };
  }, [audits, courses, stats, p.gpa]);

  /* ---- rule warnings ---- */
  const warnings = useMemo(() => {
    const byProg = {}; const push = (id, w) => { (byProg[id] = byProg[id] || []).push(w); };
    const byId = (id) => courses.find((c) => c.id === id);
    const label = (ids) => ids.map((i) => pretty(byId(i) ? byId(i).code : "")).join(", ");
    const majorAudits = audits.filter((a) => a.prog.type === "major");

    for (const m of audits.filter((a) => a.prog.type === "minor")) {
      const udGroups = m.groups.filter((g) => String(g.sectionId).startsWith("upper"));
      const udIds = udGroups.flatMap((g) => m.byGroup[g.id] || []);
      for (const maj of majorAudits) {
        const majIds = new Set(maj.groups.flatMap((g) => maj.byGroup[g.id] || []));
        const shared = udIds.filter((id) => majIds.has(id));
        if (shared.length > 1)
          push(m.prog.id, { tone: "bad", text: `${label(shared)} are all counting toward ${maj.prog.name} and toward the upper-division ${m.prog.name} minor requirements. Only one course may overlap with each major — swap the others out.` });
        else if (shared.length === 1)
          push(m.prog.id, { tone: "warn", text: `${label(shared)} is your one allowed overlap with ${maj.prog.name}. Nothing else may double count here.` });
        const deptHits = udIds.filter((id) => (maj.prog.dept || []).includes(splitCode(byId(id).code).subject));
        if (deptHits.length > 1)
          push(m.prog.id, { tone: "bad", text: `${label(deptHits)} all come from your major department. Only one course offered by or cross-listed with ${maj.prog.dept.join("/")} may count toward the upper-division minor requirements, including the overlap course.` });
      }
      const capped = ["STAT20", "ENGIN7", "ENGINW7"];
      const cappedHits = m.groups.flatMap((g) => m.byGroup[g.id] || []).filter((id) => capped.includes(byId(id).norm));
      if (cappedHits.length > 1)
        push(m.prog.id, { tone: "bad", text: `Only one course total may count between STAT 20, ENGIN 7, and ENGIN W7. Right now ${label(cappedHits)} are both counting.` });
    }
    if (auto.badGraded.length)
      push("ls", { tone: "bad", text: `Major and minor courses need a letter grade of C- or better. Check ${auto.badGraded.map((c) => pretty(c.code) + " (" + c.grade + ")").join(", ")}.` });
    return byProg;
  }, [audits, courses, auto]);

  const allWarnings = useMemo(() => Object.values(warnings).flat(), [warnings]);

  /* ---- handlers ---- */
  const setProfile = (k, v) => setState((s) => ({ ...s, profile: { ...s.profile, [k]: v } }));
  const setChecks = (id, v) => setState((s) => ({ ...s, checks: { ...s.checks, [id]: v } }));
  const pin = (progId, gid, cid) => setState((s) => {
    const pins = { ...s.pins };
    for (const k of Object.keys(pins)) if (k.startsWith(progId + ":")) pins[k] = pins[k].filter((x) => x !== cid);
    pins[progId + ":" + gid] = [...(pins[progId + ":" + gid] || []), cid];
    const excl = { ...s.excl }; excl[progId + ":" + gid] = (excl[progId + ":" + gid] || []).filter((x) => x !== cid);
    return { ...s, pins, excl };
  });
  const release = (progId, gid, cid) => setState((s) => {
    const key = progId + ":" + gid;
    return { ...s,
      pins: { ...s.pins, [key]: (s.pins[key] || []).filter((x) => x !== cid) },
      excl: { ...s.excl, [key]: [...(s.excl[key] || []), cid] } };
  });
  const quickAdd = (code) => setState((s) => ({ ...s, courses: [...s.courses, {
    id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
    code: norm(code), title: titleOf(code), units: 4, grade: "", term: "", source: "berkeley" }] }));

  /* ---- spine ---- */
  const spine = useMemo(() => audits.flatMap((a) => a.groups.map((g) => {
    const pr = groupProgress(g, a.byGroup, state.checks, auto, igetcFull, p.entry);
    return { key: a.prog.id + g.id, tab: a.prog.id, id: g.id,
      label: `${a.prog.name} · ${g.name} — ${pr.done}/${pr.need}`,
      cls: pr.done >= pr.need ? "on" : pr.done ? "part" : "" };
  })), [audits, state.checks, auto, igetcFull, p.entry]);
  const closed = spine.filter((t) => t.cls === "on").length;

  const jump = (t) => {
    setTab(t.tab);
    setTimeout(() => {
      const el = document.getElementById("blk-" + t.id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const tabs = [
    { id: "setup", label: "Setup" },
    { id: "courses", label: "My courses", n: courses.length },
    ...audits.map((a) => ({ id: a.prog.id, label: a.prog.type === "minor" ? a.prog.name + " minor" : a.prog.name })),
    { id: "grad", label: "Graduation check" },
  ];

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = "degree-ledger.json"; a.click(); URL.revokeObjectURL(u);
  };

  if (!ready) return <div className="bdl"><div className="bdl-wrap">Opening your ledger…</div></div>;
  const current = audits.find((a) => a.prog.id === tab);

  return (
    <div className="bdl">
      <style>{CSS}</style>

      <header className="bdl-top">
        <div className="bdl-top-in">
          <h1 className="bdl-title">Degree <em>Ledger</em></h1>
          <p className="bdl-sub">
            {p.name ? p.name + " · " : ""}Berkeley L&amp;S majors, CDSS minors, transfer credit, and everything
            standing between you and the walk across the stage.
          </p>
          <div className="bdl-spine">
            {spine.map((t) => (
              <button key={t.key} className={"bdl-tick " + t.cls} title={t.label} onClick={() => jump(t)} aria-label={t.label} />
            ))}
          </div>
          <div className="bdl-spine-label">
            <span>{closed} of {spine.length} blocks closed</span>
            <span>{stats.total} units{stats.inprog ? ` · ${stats.inprog} in progress` : ""}</span>
          </div>
          <nav className="bdl-tabs">
            {tabs.map((t) => (
              <button key={t.id} className={"bdl-tab " + (tab === t.id ? "sel" : "")} onClick={() => setTab(t.id)}>
                {t.label}{t.n != null && <span className="n">{t.n}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="bdl-wrap">
        <div className="bdl-cols">
          <div>
            {tab === "setup" && <SetupView p={p} setProfile={setProfile} state={state} setState={setState} />}
            {tab === "courses" && <CoursesView courses={courses} setState={setState} audits={audits} />}
            {tab === "grad" && <GraduationView audits={audits} checks={state.checks} auto={auto}
              igetcFull={igetcFull} p={p} stats={stats} warnings={allWarnings} />}
            {current && (
              <ProgramView audit={current} courses={courses} checks={state.checks} setChecks={setChecks}
                auto={auto} igetcFull={igetcFull} entry={p.entry} usage={usage} audits={audits}
                onPin={(gid, cid) => pin(current.prog.id, gid, cid)}
                onRelease={(gid, cid) => release(current.prog.id, gid, cid)}
                onQuickAdd={quickAdd}
                warnings={warnings[current.prog.id] || []} />
            )}
          </div>

          <aside className="bdl-side">
            <div className="bdl-card">
              <h3>Where you stand</h3>
              <Meter done={closed} need={spine.length || 1} />
              <div className="bdl-stat"><span>Blocks closed</span><b>{closed}/{spine.length}</b></div>
              <div className="bdl-stat"><span>Units earned</span><b>{stats.total}</b></div>
              <div className="bdl-stat"><span>Upper division</span><b>{stats.ud}</b></div>
              {p.entry === "transfer" && <div className="bdl-stat"><span>From community college</span><b>{stats.ccc}</b></div>}
              <div className="bdl-stat"><span>GPA</span><b>{p.gpa || "—"}</b></div>
            </div>

            {audits.filter((a) => a.prog.type === "major" || a.prog.type === "minor").map((a) => {
              const t = a.groups.reduce((acc, g) => {
                const pr = groupProgress(g, a.byGroup, state.checks, auto, igetcFull, p.entry);
                acc.done += pr.done; acc.need += pr.need; return acc;
              }, { done: 0, need: 0 });
              return (
                <div key={a.prog.id} className="bdl-card">
                  <h3>{a.prog.type}</h3>
                  <div className="bdl-stat" style={{ borderBottom: 0 }}>
                    <span style={{ fontWeight: 600 }}>{a.prog.name}</span><b>{t.done}/{t.need}</b>
                  </div>
                  <Meter done={t.done} need={t.need} />
                </div>
              );
            })}

            {allWarnings.length > 0 && (
              <div className="bdl-card">
                <h3>Needs a look</h3>
                {allWarnings.slice(0, 4).map((w, i) => (
                  <div key={i} className="bdl-stat" style={{ display: "block", fontSize: 12.5,
                    color: w.tone === "bad" ? "var(--brick)" : "var(--slate)" }}>{w.text}</div>
                ))}
              </div>
            )}

            <div className="bdl-card">
              <h3>Saved on this device</h3>
              <p style={{ fontSize: 12.5, color: "var(--slate)", margin: "0 0 10px" }}>
                {saved ? `Last saved ${saved}. ` : "Changes save as you make them. "}
                Nothing leaves your browser.
              </p>
              <div className="bdl-row">
                <button className="bdl-btn ghost tiny" onClick={exportJSON}>Export JSON</button>
                <button className="bdl-btn danger tiny" onClick={() => {
                  if (window.confirm("Clear the whole ledger and start over?")) setState(BLANK);
                }}>Start over</button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="bdl-foot">
        University, campus and Letters &amp; Science requirements follow the Berkeley Academic Guide and apply to every
        L&amp;S student. Cognitive Science and the Data Science minor ship with their course lists typed in; every other
        program is whatever you loaded from the Guide, so it is only as current as the text you pasted. Requirements
        change between catalog years, and this ledger is a planning aid — check your Academic Progress Report in
        CalCentral and talk to your major and college advisers before you file to graduate.
      </footer>
    </div>
  );
}
