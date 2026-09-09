import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

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
/* Marks the two halves of an either/or requirement, so a block that reads as
   unfinished is visibly the road not taken rather than work left undone. */
.bdl-next { display:block; width:100%; text-align:left; background:none; border:0; border-top:1px solid #EDF1F4;
  padding:8px 0; cursor:pointer; }
.bdl-next:first-of-type { border-top:0; }
.bdl-next:hover .nm { color:var(--blue); }
.bdl-next .nm { display:block; font-size:12.5px; font-weight:600; color:var(--ink); }
.bdl-next .pr { display:block; font-size:11px; color:var(--slate); }
.bdl-next .ct { display:block; font-family:var(--mono); font-size:10.5px; color:#8A6A12; margin-top:2px; }
.bdl-tag { flex:0 0 auto; font-size:10px; letter-spacing:.06em; text-transform:uppercase;
  padding:2px 6px; border-radius:999px; border:1px solid #CBD5DD; color:var(--slate); background:#F6F8FA; }
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
/* These carry an extra .bdl so they outrank the colour:inherit reset on
   .bdl button above. Without it the filled button drew near-black text on the
   Berkeley blue — 1.29:1, effectively invisible. White on that blue is 12.95:1. */
.bdl .bdl-btn { border:1px solid var(--blue); background:var(--blue); color:#fff; padding:7px 14px;
  border-radius:2px; font-size:13px; font-weight:500; }
.bdl .bdl-btn:hover { background:#00427C; }
.bdl .bdl-btn.ghost { background:none; color:var(--blue); }
.bdl .bdl-btn.ghost:hover { background:#E4EBF1; }
.bdl .bdl-btn.tiny { padding:3px 8px; font-size:11.5px; font-family:var(--mono); }
.bdl .bdl-btn.danger { border-color:var(--brick); color:var(--brick); background:none; }
.bdl .bdl-btn:disabled { opacity:.45; cursor:not-allowed; }
.bdl-row { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; }
.bdl-switch { display:flex; gap:0; border:1px solid var(--line); border-radius:2px; overflow:hidden; }
.bdl-switch button { flex:1 1 auto; background:#fff; border:0; padding:7px 12px; font-size:13px; color:var(--slate); }
.bdl .bdl-switch button.sel { background:var(--blue); color:#fff; }
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
.bdl .bdl-optbar button.sel { background:var(--blue); border-color:var(--blue); color:#fff; }
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

/* Every subject prefix that appears in a requirement list has to be here, or
   the code will not split into subject + number — which silently breaks
   `isUpperDiv`, and with it the 36-upper-division-unit count. tools/check-subjects.mjs
   fails the build if a course code is ever added whose subject is missing. */
const SUBJECTS = ("AEROENG AFRICAM AGRS AMERSTD ANTHRO ARCH ART ASTRON BIOENG BIOLOGY CHEM CHMENG CIVENG " +
  "CMPBIO COGSCI COMPSCI CPH CYPLAN DATA DEMOG DIGHUM DISSTD ECON EDSTEM EDUC EECS ELENG ENERES ENGIN " +
  "ENGLISH ENVDES ENVECON EPS ESPM ETHSTD FILM GEOG GLOBAL GPP GWS HISTART HISTORY IAS INDENG INFO " +
  "INTEGBI ISF JOURN LDARCH LEGALST LINGUIS LS MATH MBN MCELLBI MECENG MEDIAST MELC MUSIC NATAMST " +
  "NEUROSC NEU NUCENG NUSCTX NWMEDIA PBHLTH PHILOS PHYSICS PLANTBI POLECON POLSCI PSYCH PUBPOL RHETOR " +
  "SLAVIC SOCIOL SOCWEL SPANISH STAT STS UGBA UGIS VISSCI XMATH XPSYCH XSOCIOL " +
  "ARABIC ARMENI CELTIC CHINESE DUTCH FILIPN FRENCH GERMAN HEBREW HINDI INDONES ITALIAN JAPAN KOREAN " +
  "PACS PORTUG PUNJABI RELIGST RUSSIAN SCANDIN TAMIL THAI TURKISH URDU VIETNMS " +
  "XAGRS XETHSTD XHISTOR XPOLSCI XSTAT")
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
/* Some requirements are stated in units rather than course counts ("earn at
   least 7 credits"). `need` still caps how many courses may be pinned; the
   block is closed on units. */
const GU = (id, name, units, list, extra = {}) =>
  G(id, name, 99, list, { needUnits: units, ...extra });
const unitsOf = (c) => parseFloat(c && c.units) || 0;
/* Some blocks are stated as a range rather than a list — "any ECON 100–196
   level course, not including 100A, 100B, 140, 141…". A matcher lets the block
   accept a course by its code, so those requirements behave like every other
   one instead of becoming a manual checkbox. */
const inRange = (subjects, lo, hi, exclude = []) => {
  const ex = exclude.map(norm);
  return (code) => {
    const c = norm(code);
    if (ex.includes(c)) return false;
    if (!subjects.includes(splitCode(c).subject)) return false;
    const n = courseNum(c);
    return n >= lo && n <= hi;
  };
};
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

/* ============ College of Computing, Data Science & Society ============
   CDSS is a separate college with its own requirements — a Data Science,
   Computer Science or Statistics major clears these rather than the L&S set.
   The requirement names are taken from the Academic Guide; the detail behind
   each one is left to the student to confirm, because naming a requirement is
   not the same as knowing which courses close it.

   Certification deliberately does NOT auto-close anything here. Full IGETC or
   Cal-GETC is documented against the L&S requirements; what it does for CDSS's
   own Computational, Statistical and Human/Social Dynamics requirements is a
   question for a CDSS adviser, and guessing would be worse than asking. */
const CDSS_COLLEGE = {
  id: "cdss", type: "college", name: "Computing, Data Science & Society requirements",
  college: "Computing, Data Science, and Society",
  note: "These replace the Letters & Science requirements — you clear your own college's list, not both. Requirement names follow the Academic Guide; open the CDSS college page for what each one takes.",
  sections: [
    { id: "essential", name: "Essential skills", groups: [
      CK("cdss_rc", "Reading & Composition", [
        { id: "cdss_rca", label: "R&C Part A", desc: "C- or better." },
        { id: "cdss_rcb", label: "R&C Part B", desc: "C- or better, and it has to come after Part A." },
      ]),
      CK("cdss_comp", "CDSS Computational Reasoning", [
        { id: "cdss_comp", label: "Computational Reasoning satisfied",
          desc: "A CDSS-specific requirement with no Letters & Science equivalent. Check the college page for the approved list." },
      ]),
      CK("cdss_hsd", "Human and Social Dynamics of Data and Technology", [
        { id: "cdss_hsd", label: "Human and Social Dynamics satisfied",
          desc: "CDSS-specific. Distinct from the Human Contexts and Ethics course inside the major itself — confirm whether one course can do both." },
      ]),
      CK("cdss_stat", "CDSS Statistical Reasoning", [
        { id: "cdss_stat", label: "Statistical Reasoning satisfied", desc: "CDSS-specific. Often cleared by the major's own statistics course." },
      ]),
    ]},
    { id: "breadth", name: "Seven-course breadth", note: "CDSS runs its own breadth list. It is not identical to the L&S seven-course breadth, so do not assume a course that counts for one counts for the other.", groups: [
      CK("cdss_b", "CDSS Breadth", [
        { id: "cdss_breadth", label: "CDSS breadth requirement satisfied",
          desc: "Confirm the current area list on the college page. If you transferred with a filed certification, ask a CDSS adviser what it covers here — that answer is not the same as the Letters & Science one." },
      ]),
    ]},
    { id: "units", name: "Units & academic standing", groups: [
      CK("cdss_units", "CDSS unit and academic requirements", [
        { id: "units120", label: "120 total units earned", desc: "Tracked from My courses.", auto: "units120" },
        { id: "cdss_ud", label: "Upper-division unit minimum met", desc: "Confirm the current figure with your adviser; the ledger tracks your upper-division total under Where you stand." },
        { id: "cdss_gpa", label: "Minimum GPA in the major and overall", desc: "Tracked from the GPA you enter under Setup.", auto: "gpa" },
        { id: "ccc70", label: "No more than 70 units transferred from community colleges",
          desc: "Transfer students only.", transferOnly: true, auto: "ccc70" },
      ]),
    ]},
  ],
};

/* ============ Cognitive Science, B.A. ============ */
const COGSCI = {
  id: "cogsci", type: "major", name: "Cognitive Science", degree: "B.A.",
  dept: ["COGSCI"], college: "Letters & Science",
  sections: [
    { id: "prereq", name: "Prerequisites", groups: [
      G("cs", "Computer Science", 1, ["COMPSCI61A", "COMPSCIC88C/DATAC88C", "ENGIN7"]),
      G("math", "Mathematics", 1, ["MATH51/XMATH51", "MATH16A/XMATH16A", "MATH1A/MATHN1A"], {
        exams: ["AP: Mathematics: Calculus BC, score 3+", "AP: Mathematics: Calculus AB, score 3+",
          "IB: HL Math: Analysis & Approaches, score 5+", "IB: HL Mathematics, score 5+",
          "IB: HL Further Mathematics, score 6+", "A-Level: Mathematics, score 1-2",
          "A-Level: Further Mathematics, score 1-2", "A-Level: Mathematics H2, score 1-2"],
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
    { id: "upper", name: "Upper division areas", note: "One course from each of the six areas. A single course can only close one area.", groups: [
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
    "Declare the minor before the first day of classes of your expected graduation term. If that term is a summer one, the deadline is the first day of Summer Session A.",
    "All minor courses must be taken for a letter grade.",
    "A C- or better in every course, and at least a 2.0 GPA across the minor.",
    "At most one upper-division course may overlap with each of your majors.",
    "At most one course offered by or cross-listed with your major department may count toward the upper-division minor requirements, including any overlapping course.",
    "An upper-division course used to satisfy a lower-division requirement (say, STAT 134 for probability) does not count toward the four upper-division courses and does not use up your overlap.",
    "There is no restriction on overlap with another minor.",
    "Courses used for the minor may also count toward the Seven-Course Breadth requirement.",
    "At most one course total between STAT 20, ENGIN 7, and ENGIN W7 may count.",
    "All minor requirements must be finished by the last day of finals in the term you graduate.",
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

/* ============ Data Science, B.A. (CDSS) ============
   Transcribed from the Berkeley Academic Guide. Two places where the catalog
   text is internally inconsistent are marked `catalogNote` and shown on the
   block rather than silently "corrected". */

/* Each emphasis is one lower-division block and one upper-division block.
   `lowNeed`/`upNeed` follow the catalog; -1 means "all of these". */
const DS_EMPHASES = [
  { id: "aero", label: "Aerospace",
    low: ["AEROENG10"], lowNeed: -1,
    up: ["ASTRON160","ASTRONC162/EPSC162","CIVENG126","COMPSCI168","EECS149","ELENG117","ELENG120","ELENG121",
      "ELENG122","ELENG142","MECENG100","MECENG103","MECENG104","MECENG106","MECENG109","MECENG132","MECENG140",
      "MECENG151A","MECENG151B","MECENG154","MECENG163","MECENGC134"], upNeed: 2,
    catalogNote: "The Guide reads “Complete at least 0 of the following” for this block — confirmed in the official program PDF, so it is the catalog's own error rather than a transcription slip. It is treated as 2, matching every other emphasis. It also allows any 3-unit AEROENG 1–199 course, which is not in the list below. Confirm with your adviser." },
  { id: "appmath", label: "Applied Mathematics and Modeling",
    low: ["MATH53/MATHH53/MATHW53","MATH55/MATHN55"], lowNeed: 1,
    up: ["EECS127","ENGIN150","INDENG160","INDENG162","MATH104/MATHH104","MATH110","MATH113","MATH118",
      "MATH128A","MATH128B","MATH156","MECENGC180/CIVENGC133"], upNeed: 2 },
  { id: "busind", label: "Business and Industrial Analytics",
    low: ["ECON1","ECON2","MATH53/MATHH53/MATHW53"], lowNeed: 1,
    up: ["ENGIN120","INDENG115","INDENG120","INDENG130","INDENG153","INDENG156","INDENG166","LEGALST122",
      "UGBA104","UGBA134","UGBA141","UGBA142","UGBA161"], upNeed: 2 },
  { id: "cognition", label: "Cognition",
    /* The Guide lists Brain, Mind and Behavior twice — as NEU C61/NEU 61 and
       again as NEU 61/PSYCH C61. They are one course, so they are one option. */
    low: ["COGSCI1/COGSCIN1/COGSCI1B","NEUC61/NEU61/PSYCHC61","NEUC64/PSYCHC64"], lowNeed: 1,
    up: ["COGSCIC100/PSYCHC120","COGSCIC101/LINGUISC105","COGSCIC126/PSYCHC126","COGSCIC127/PSYCHC127",
      "COGSCIC131/COGSCI131/PSYCHC123","COGSCI132","COGSCI150","COGSCI180","COMPSCI188","LINGUISC146/PSYCHC143",
      "MUSIC108/MUSIC108M","PSYCH114","PSYCH117","PSYCH131"], upNeed: 2 },
  { id: "cmpbio", label: "Computational Methods in Molecular and Genomic Biology",
    low: ["BIOLOGY1A","BIOLOGY1B","MATH53/MATHH53/MATHW53"], lowNeed: 1,
    up: ["BIOENG131/BIOENGC131/CMPBIOC131","BIOENG134","BIOENG145","CHEM135","CMPBIO156","COMPSCI176",
      "INTEGBI161","MATH127","MCELLBI137L","PLANTBI160"], upNeed: 2 },
  { id: "arts", label: "Data Arts and Humanities",
    low: ["ART23AC","HISTORY88","ISF50","MUSIC29","MUSIC30","RHETOR10"], lowNeed: 1,
    up: ["ART172","ART173","DIGHUM100","DIGHUM101","DIGHUM150A","DIGHUM150B","DIGHUM150C","DIGHUM160",
      "ENGLISHC181","HISTARTC109","HISTART192DH","HISTORY104","INFO103","INFO159","MELC110","MUSIC107",
      "MUSIC158A","MUSIC158B","MUSIC159","RHETOR107","RHETOR114","RHETOR115","RHETOR136","RHETOR137",
      "RHETOR145","RHETOR170"], upNeed: 2 },
  { id: "ecology", label: "Ecology and the Environment",
    low: ["EPS80","ESPM2","ESPM6","ESPM15","ESPMC46","ESPM88B","GEOG40","LSC46"], lowNeed: 1,
    up: ["CIVENGC106","ENERES102","EPSC129","EPSC180","EPSC183","ESPMC103","ESPMC129","ESPMC153","ESPMC170",
      "ESPMC180","ESPM111","ESPM130A","ESPM157","ESPM174A","INTEGBIC153","INTEGBIC156","INTEGBI170LF",
      "ESPM102B","ESPM102BL"], upNeed: 2,
    catalogNote: "The Guide splits the second upper-division course into two options: ESPM 102B together with its lab ESPM 102BL, or one more course from the same list. Both are folded into one block here, so check the pairing if you take 102B." },
  { id: "econ", label: "Economics",
    low: ["DATA88E","ECON1","ECON2"], lowNeed: 1,
    up: ["COMPSCIC177","DEMOGC175","ECONC103","ECONC110","ECONC125","ECONC142","ECONC147","ECONC175","ECONC184",
      "ECON100A","ECON100B","ECON101A","ECON101B","ECON104","ECON119","ECON121","ECON127","ECON131","ECON134",
      "ECON136","ECON139","ECON140","ECON141","ECON143","ECON144","ECON148","ECON151","ECON157","ECON165",
      "ECON152","ECON172","ECON174","ENVECONC101","ENVECONC118","ENVECONC132","IASC118","MATHC103",
      "POLSCIC131A","POLSCIC135","PUBPOLC142"], upNeed: 2 },
  { id: "educ", label: "Education",
    low: ["EDUC40AC/EDUCN40AC","EDUCW161"], lowNeed: 1,
    up: ["DATA144","EDUCC122/EDSTEMC122","EDUCC130","EDUCC142/EDUC142/GLOBALC129","EDUCW161","EDUC153",
      "EDUC161C","EDUC168","EDUC244","EDUC260","EDUC274A","EDUC274B","EDUC275B","EDUC275G","EDUC276A",
      "EDUC293A","SOCIOL113/SOCIOL113AC","SOCIOL180E"], upNeed: 2,
    catalogNote: "The Guide reads “Complete ALL of the following Courses” over eighteen courses — confirmed in the official program PDF, so it is the catalog's own error rather than a transcription slip. It is treated as 2, matching every other emphasis. Confirm with your adviser." },
  { id: "envres", label: "Environment, Resource Management, and Society",
    low: ["ECONC3","ENVECONC1","ESPM50AC"], lowNeed: 1,
    up: ["ECONC102/ENVECONC102","ECONC125/ENVECONC101","ENERESC100/ENERESW100","ENERES131",
      "ENERESC176/ENVECONC176","ENERES190C","ENVECON100","ENVECONC115","ESPMC104","ENVECON141","ENVECON142",
      "ENVECON145","ENVECON147","ENVECON153","ESPM102C","ESPM102D","ESPM151","ESPM155AC","ESPM157","ESPMC167",
      "ESPM168","ESPM186","IASC176","PBHLTHC160","PUBPOLC184","PUBPOLW184"], upNeed: 2 },
  { id: "evo", label: "Evolution and Biodiversity",
    low: ["BIOLOGY1A","BIOLOGY1B"], lowNeed: 1,
    up: ["ESPM108B","ESPM152","ESPMC105","ESPMC125/GEOGC148/INTEGBIC166","INTEGBI113L","INTEGBIC105",
      "INTEGBIC109/PLANTBIC109","INTEGBI117","INTEGBI117LF","INTEGBI141","INTEGBI160","INTEGBI161","INTEGBI162",
      "INTEGBI164L","INTEGBI167","INTEGBI169","INTEGBI172"], upNeed: 2,
    catalogNote: "INTEGBI 117 must be taken with its laboratory, INTEGBI 117LF." },
  { id: "gist", label: "Geospatial Information and Technology",
    low: ["CIVENGC88/CYPLANC88","EPS50","EPS88","ESPM72","ESPM88A","GEOG80","GEOGN80"], lowNeed: 1,
    up: ["EPS101","EPS115","ESPM137","ESPM164","ESPM172/ESPMC172/CIVENGC172","ESPM173","ESPMC177/LDARCHC177",
      "GEOGC188/LDARCHC188","GEOG183","GEOG185","GEOG186","GEOG187","PBHLTH177A"], upNeed: 2 },
  { id: "health", label: "Human and Population Health",
    low: ["BIOLOGY1A","BIOLOGY1B","MCELLBI50"], lowNeed: 1,
    up: ["DEMOG110","ESPMC159","INTEGBI114","INTEGBI116L","INTEGBI132","INTEGBI137","INTEGBI140","MBN160",
      "MCELLBI132","NUSCTX110","NUSCTX121","NUSCTXC159","PBHLTH132","PBHLTH150A","PBHLTH150B","PBHLTH162A",
      "PBHLTH181"], upNeed: 2 },
  { id: "behav", label: "Human Behavior and Psychology",
    low: ["COGSCI1/COGSCI1B/COGSCIN1","PSYCH1/PSYCHN1/XPSYCH1","PSYCH2"], lowNeed: 1,
    up: ["COGSCI131","ECON119","POLSCIC135","PSYCH101D","PSYCH110/PSYCHN110","PSYCH124","PSYCH130/PSYCHN130",
      "PSYCH134/PSYCHN134","PSYCH140/PSYCHN140","PSYCH150/PSYCHN150","PSYCH156","PSYCH160/PSYCHN160",
      "PSYCH167AC","SOCIOL150","UGBA160"], upNeed: 2 },
  { id: "ineq", label: "Inequalities in Society",
    low: ["DATAC4AC/STSC4AC","SOCIOL1","SOCIOL3AC/XSOCIOL3AC"], lowNeed: 1,
    up: ["AFRICAM101","AFRICAM111","AFRICAMC156/GEOGC155","DIGHUM100","ETHSTD101A","GWS131","LSC180U",
      "PHILOS117AC","POLSCI132C","POLSCI167","PSYCH167AC","PUBPOLC103","PUBPOL117AC","SOCIOL111/SOCIOL111AC",
      "SOCIOL113/SOCIOL113AC","SOCIOL124","SOCIOL127","SOCIOL130/SOCIOL130AC","SOCIOL131","SOCIOL133",
      "SOCIOL180E","SOCIOL180I","SOCIOL182"], upNeed: 2 },
  { id: "ling", label: "Linguistic Sciences",
    low: ["LINGUIS100/LINGUISW100","PHILOS12A/PHILOSW12A"], lowNeed: 1,
    up: ["COGSCI144","INFO159","LINGUIS100","LINGUIS108","LINGUIS110","LINGUIS111","LINGUIS113","LINGUIS115",
      "LINGUIS120","LINGUIS121","LINGUISC142/COGSCIC142","LINGUIS150A","LINGUISC160/COGSCIC140","LINGUIS188",
      "LINGUISC189/COGSCIC133","PHILOS133"], upNeed: 2 },
  { id: "neuro", label: "Neurosciences",
    low: ["NEUC61/PSYCHC61","NEUC64/PSYCHC64"], lowNeed: 1,
    up: ["ANTHRO107","COGSCIC127","INTEGBI139","INTEGBIC143A","NEU100A","NEU100B","NEUC124/BIOENGC171","NEU128",
      "NEU151","NEU165","PSYCHC113","PSYCH117/PSYCHN117","PSYCH125","PSYCHC127"], upNeed: 2 },
  { id: "orgecon", label: "Organizations and the Economy",
    low: ["DATAC4AC/STSC4AC","SOCIOL1","SOCIOL3AC/XSOCIOL3AC"], lowNeed: 1,
    up: ["ECON121","ECON131","ENVECON142","GEOG110","GWS139","POLSCI132C","SOCIOL110","SOCIOL116","SOCIOL119S",
      "SOCIOL120","SOCIOL121","UGBA105","UGBA107"], upNeed: 2 },
  { id: "philev", label: "Philosophical Foundations: Evidence and Inference",
    low: ["MATH55/MATHN55","PHILOS4","PHILOS5","PHILOS12A"], lowNeed: 1,
    up: ["MATH125A","MATH135","MATH136","PHILOS122","PHILOS125","PHILOS128","PHILOS134","PHILOS140A","PHILOS140B",
      "PHILOS142","PHILOS143","PHILOS146","PHILOS148","PHILOS149","RHETOR107"], upNeed: 2 },
  { id: "philmind", label: "Philosophical Foundations: Minds, Morals, and Machines",
    low: ["COGSCI1","PHILOS2","PHILOS3","PHILOS14"], lowNeed: 1,
    up: ["COGSCIC100/COGSCIN100/PSYCHC120/PSYCHN120","COGSCIC101/LINGUISC105","COGSCI131",
      "COGSCIC142/LINGUISC142","ECONC110","PHILOS104","PHILOS115","PHILOS132","PHILOS133","PHILOS135",
      "PHILOS136","PHILOS141","POLSCIC135","STAT155"], upNeed: 2 },
  { id: "physci", label: "Physical Science Analytics",
    low: ["PHYSICS5BL","PHYSICS5CL","PHYSICS7A/PHYSICSH7A","PHYSICS77"], lowNeed: 1,
    up: ["ASTRON120","ASTRON121","ASTRON128","ASTRONC161","ASTRONC162","CIVENGC103N","CIVENGC133","ENGIN150",
      "EPS108","EPS109","EPS122","ESPMC130","EPSC162","ESPMC170","EPSC181","EPSC183","GEOGC136","GEOGC139",
      "MECENGC180","NUCENG101","NUCENG130","NUCENG155","PHYSICS105","PHYSICS111A","PHYSICS112","PHYSICS129",
      "PHYSICS151","PHYSICSC161","PHYSICS188"], upNeed: 2 },
  { id: "quantsoc", label: "Quantitative Social Science",
    /* POLSCI N3 is listed twice in the Guide, once alone and once as a
       cross-listing of POLSCI 3. Kept only as the cross-listing. */
    low: ["ECON1","ECON2","POLSCI3/POLSCIN3/POLSCIW3","POLSCI5","POLSCI88","SOCIOL1",
      "SOCIOL3AC/XSOCIOL3AC"], lowNeed: 1,
    up: ["DEMOG110","DEMOGC126","DEMOG130","DEMOGC175/ECONC175","DEMOG180","ENVECONC118/IASC118",
      "LEGALST123","MEDIAST130","POLSCI132B","POLSCI132C","POLSCI133","POLSCIC135/ECONC110","SOCIOL106",
      "SOCIOLC126"], upNeed: 2 },
  { id: "robotics", label: "Robotics",
    low: ["MATH53/MATHH53/MATHW53"], lowNeed: -1,
    up: ["BIOENG101","BIOENG105","BIOENGC106A/EECSC106A/MECENGC106A","BIOENGC106B/EECSC106B/MECENGC106B",
      "BIOENGC136L","COMPSCI185","COMPSCI188","EECS149","ELENG143","ELENGC145O","ELENG147","ELENG192",
      "INTEGBIC135L","MECENG100","MECENG102B","MECENG119","MECENG131","MECENG132","MECENGC134","MECENG135",
      "MECENG139","MECENG150"], upNeed: 2 },
  { id: "sts", label: "Science, Technology, and Society",
    low: ["DATAC4AC/STSC4AC","GEOG80","HISTORY30","ISF60"], lowNeed: 1,
    up: ["ANTHRO115","ANTHRO119","ANTHRO168","DISSTD110","ENGIN157AC","ENGLISH180Z","ENVECON143","ESPM161",
      "ESPM162","ESPM163AC","FILM155","GEOG130","GWS130AC","HISTORY100S","HISTORY100ST","HISTORY103S",
      "HISTORY138","HISTORY138T","HISTORY180","HISTORY180T","HISTORYC182A","HISTORY182AT","HISTORYC182C",
      "IAS157AC","INFO103","ISF100D","ISF100G","ISFC100G","PBHLTHC155","POLSCI132C","RHETOR107","RHETOR115",
      "RHETOR145","SOCIOLC115","SOCIOL137AC","SOCIOL166","SOCIOL167","STSC100","STSC101",
      "AFRICAM134/AFRICAMC134","BIOENG100","CYPLAN101","DATAC104","DIGHUM100","ESPMC167","HISTORYC184D",
      "INFO188","ISF100J","NWMEDIA151AC","PBHLTHC160","PHILOS121","POLECON159"], upNeed: 2,
    catalogNote: "The Guide lists two separate upper-division blocks with overlapping lists; they are merged here, so confirm that your two courses satisfy both as written." },
  { id: "swhp", label: "Social Welfare, Health, and Poverty",
    low: ["DATAC4AC/STSC4AC","SOCIOL1","SOCIOL3AC/XSOCIOL3AC","SOCIOL5"], lowNeed: 1,
    up: ["ENVECON153","GLOBAL102","GPP105","GPP115","GWS130AC","PBHLTH112","PBHLTH126","PBHLTH150D",
      "PBHLTHC155/SOCIOLC115","PBHLTHC160/ESPMC167","PBHLTH181","POLSCI132C","SOCWEL112","SOCIOL115G",
      "SOCIOL127"], upNeed: 2 },
  { id: "policy", label: "Social Policy and Law",
    low: ["SOCIOL1","SOCIOL3AC/XSOCIOL3AC","DATAC4AC/STSC4AC"], lowNeed: 1,
    up: ["GWS132AC","LEGALST100","LEGALST102","LEGALST122","LEGALST123","LEGALST158","LEGALST160","PBHLTH150D",
      "POLECON111","POLSCI132C","POLSCI186","PUBPOL101","SOCIOL114","SOCIOL148","SOCWEL112","SOCWEL181"], upNeed: 2 },
  { id: "sustain", label: "Sustainable Development and Engineering",
    low: ["CIVENG11","LDARCH12"], lowNeed: 1,
    up: ["ARCH140","CIVENG107","CIVENG110","CIVENG111","CIVENG119","CIVENG155","CIVENG191","ENERES131",
      "ENERES190C","ENVDES11","ESPMC177","GEOG135","LDARCH122","LDARCHC177"], upNeed: 2 },
  { id: "urban", label: "Urban Science",
    low: ["CIVENGC88","CYPLANC88","ENVDES4B","GEOG70AC"], lowNeed: 1,
    up: ["ARCH110AC","CYPLAN110","CYPLAN113A","CYPLAN114","CYPLAN119","CYPLAN140","ENERES190C","ENVDES100",
      "ENVDES102","GEOG181","GEOG182","GEOGC188","LDARCH130","LDARCH187","LDARCHC188","SOCIOL136"], upNeed: 2 },
];

/* The major's Human Contexts list differs from the minor's: the minor allows
   BIOENG 100 and the major does not. Kept separate rather than shared. */
const DS_HCE_MAJOR = ["AFRICAMC134/AFRICAM134/AMERSTDC134", "CYPLAN101",
  "DATAC104/HISTORYC184D/STSC104D", "DIGHUM100", "ESPMC167/PBHLTHC160", "INFO188", "ISF100J",
  "NWMEDIA151AC", "PHILOS121", "POLECON159"];

/* Depth: "Earn at least 7 credits from the following". */
const DS_DEPTH = ["ASTRON128","BIOENGC142/CHEMC142","CHEMC191/COMPSCIC191","COMPSCIC187/DATAC101","COMPSCI161",
  "COMPSCI162","COMPSCI164","COMPSCI168","COMPSCI169","COMPSCI169A","COMPSCI170","COMPSCI186","COMPSCI188",
  "DATA144","ECON140/ECON141","EECS127","ELENG120","ELENG122","ELENG123","ENVECONC118/IASC118","ESPM174",
  "INDENG115","INDENG135","INDENG142B","INDENG160","INDENG162","INDENG164","INDENG165","INDENG166","INDENG173",
  "INDENG174","INFO154","INFO159","MATH156","NUCENG175","PHYSICSC191","PHYSICS188","STAT135","STAT150",
  "STAT151A","STAT152","STAT153","STAT158","STAT159","STAT165","UGBA142"];

const DATASCI_MAJOR = {
  id: "dsmajor", type: "major", name: "Data Science", degree: "B.A.",
  dept: ["DATA", "COMPSCI", "STAT", "INFO"], college: "Computing, Data Science, and Society",
  note: "Lower division needs a C- or better with no P grades, and AP/IB or other high school exam credit is not accepted for it. Every student also picks one domain emphasis, which adds its own lower- and upper-division courses.",
  pathways: {
    id: "dsDomain", label: "Domain emphasis",
    note: "Every Data Science major completes one. Changing it swaps the two emphasis blocks below; nothing else on the tab moves.",
    options: DS_EMPHASES.map((e) => ({ id: e.id, label: e.label })),
  },
  rules: [
    "A minimum grade of C- is required for all lower division and all upper division courses. No P grades are allowed.",
    "AP/IB or other high school exam credit is not accepted for the lower division requirements.",
    "Linear algebra can instead be satisfied by taking both ELENG 66 and ELENG 64.",
  ],
  sections: [
    { id: "lower", name: "Lower division", groups: [
      G("ds_found", "Data Science", 1, ["DATAC8/COMPSCIC8/INFOC8/STATC8", "STAT20"]),
      G("ds_calc1", "Calculus: Part 1", 1, ["MATHN1A", "MATH10A/MATHN10A", "MATH16A/XMATH16A", "MATH51/XMATH51"]),
      G("ds_calc2", "Calculus: Part 2", 1, ["MATH52/XMATH52", "MATHN1B/MATHH1B", "DATA89"]),
      G("ds_linalg", "Linear Algebra", 1, ["MATH54/MATHN54/MATHH54/MATHW54", "MATH56", "STAT89A",
        "PHYSICS89/PHYSICSW89", "ELENG66", "ELENG64"], {
        hint: "One of these, or both ELENG 66 and ELENG 64 together — the Guide's second option. The ledger counts one course here, so if you take the ELENG pair, add both and pin one." }),
      G("ds_prog", "Program Structures", 1, ["COMPSCI61A", "DATAC88C/COMPSCIC88C"]),
      G("ds_struct", "Data Structures", 1, ["COMPSCI61B", "COMPSCI61BL"]),
    ]},
    { id: "upper", name: "Upper division", groups: [
      G("ds_gateway", "Principles of Data Science", 1, ["DATAC100/COMPSCIC100/STATC100"]),
      GU("ds_depth", "Computational & Inferential Depth", 7, DS_DEPTH, {
        hint: "Seven units, not a course count — most of these are 3 or 4 units, so it is usually two courses. Set the units on each course under My courses and this block counts them." }),
      G("ds_prob", "Probability", 1, ["DATAC140/STATC140", "EECS126", "ELENG126", "INDENG172", "MATH106", "STAT134"]),
      G("ds_model", "Modeling, Learning, and Decision-Making", 1, ["COMPSCI189", "DATAC102",
        "DATAC182/COMPSCIC182", "INDENG142/INDENG142A", "STATC102", "STAT154"]),
      G("ds_hce", "Human Contexts and Ethics", 1, DS_HCE_MAJOR),
    ]},
    ...DS_EMPHASES.flatMap((e) => [
      { id: "emph_low_" + e.id, name: e.label + " — lower division", pathway: e.id,
        note: e.catalogNote, groups: [
          G("dse_low_" + e.id, e.lowNeed === -1 ? "Required" : "Lower division",
            e.lowNeed === -1 ? e.low.length : e.lowNeed, e.low, { all: e.lowNeed === -1 }),
        ]},
      { id: "emph_up_" + e.id, name: e.label + " — upper division", pathway: e.id, groups: [
          G("dse_up_" + e.id, "Upper division", e.upNeed, e.up),
        ]},
    ]),
  ],
};

/* ============ Computer Science, B.A. (CDSS) ============
   From the program's own Academic Guide PDF. The two upper-division unit
   requirements are stated as categories rather than course lists ("8 units of
   upper-division COMPSCI", "our approved technical electives list"), so they
   are open blocks carrying the rule: you pick from your own record and the
   ledger counts the units. */
const CS_DESIGN = ["COMPSCI152","COMPSCI160","COMPSCI161","COMPSCI162","COMPSCI164","COMPSCI168","COMPSCI169A",
  "COMPSCI169L","COMPSCI180","COMPSCI182/COMPSCIW182","COMPSCI184","COMPSCI186/COMPSCIW186",
  "ELENGC128","ELENG130","ELENG140","ELENG143","ELENG192",
  "EECSC106A","EECSC106B","EECS149","EECS151"];

const COMPSCI_MAJOR = {
  id: "csmajor", type: "major", name: "Computer Science", degree: "B.A.",
  dept: ["COMPSCI", "EECS", "ELENG"], college: "Computing, Data Science, and Society",
  note: "Every course counted toward this major must be 3 or more units, taken for a letter grade, and technical in nature.",
  rules: [
    "All courses for the major must be 3 or more units and taken for a letter grade.",
    "All courses must be technical. Courses numbered 199, 198, 197, 196, 195, plus select 194, 191, 190 and various seminars do not count — check with CS advising if unsure.",
    "Only one upper-division course may count toward both a major and a minor. No more than two upper-division courses may overlap between two majors.",
    "At least a 2.0 GPA across both the lower- and upper-division courses used for the major.",
  ],
  sections: [
    { id: "lower", name: "Lower division", groups: [
      G("cs_math", "Mathematics", 3, ["MATH51", "MATH52", "MATH54/MATHW54/MATH56/ELENG16A"], { all: true }),
      G("cs_core", "Computer Science", 4, ["COMPSCI61A", "COMPSCI61B", "COMPSCI61BL", "COMPSCI61C",
        "COMPSCI61CL", "COMPSCI70"]),
    ]},
    { id: "upper", name: "Upper division", groups: [
      GU("cs_design", "Design", 4, CS_DESIGN, {
        hint: "Four units from the design list. The Guide also allows select special-topics and graduate courses that are not enumerated — add those by hand under My courses and pin them here." }),
      G("cs_udcs", "Computer Science / Electrical Engineering", 16, [], { open: true, needUnits: 16,
        hint: "Sixteen units: eight of upper-division COMPSCI, and eight more of upper-division COMPSCI, EL ENG or EECS. The Guide states this as a category rather than a list, so add the courses under My courses and pin them here. INFO 159, DATA 101 and STAT/DATA C100 are the only non-COMPSCI/EL ENG/EECS titles accepted." }),
      G("cs_tech", "Technical electives", 4, [], { open: true, needUnits: 4,
        hint: "Four units from the department's approved technical-electives list, or EL ENG/EECS. Not enumerated in the Guide — confirm your choice with CS advising, then pin it here." }),
    ]},
  ],
};

/* ============ Statistics, B.A. (CDSS) ============ */
const STAT_ELECT_LAB = ["DATAC102", "STAT151A", "STAT152", "STAT153", "STAT154", "STAT156", "STAT158", "STAT159"];
const STAT_ELECT_ANY = ["DATAC102", "STAT150", "STAT151A", "STAT152", "STAT153", "STAT154", "STAT155",
  "STAT156", "STAT157", "STAT159", "STAT165"];
const STAT_PROB = ["STAT134", "DATAC140", "MATH106", "EECS126"];

const STAT_MAJOR = {
  id: "statmajor", type: "major", name: "Statistics", degree: "B.A.",
  dept: ["STAT"], college: "Computing, Data Science, and Society",
  note: "Three of the upper-division courses are an applied cluster you design yourself around a unifying theme, with at least two from the same department.",
  rules: [
    "All courses for the major must be taken for graded credit, except those offered P/NP only.",
    "No more than one upper-division course may count toward both a major and a minor — except for minors offered outside the College of Letters & Science.",
    "At least a 2.0 GPA across both the lower- and upper-division courses used for the major.",
    "Only one course may be selected from ECON 136, ENGIN 120 and UGBA 103.",
    "If MATH 110 or H110 was used for the maths prerequisite, it cannot also be used for the cluster.",
    "MATH 170 cannot be combined with INDENG 160 or INDENG 162.",
    "Only one course from STAT 154, COMPSCI 189 and INDENG 142 may count toward the major.",
    "STAT 155 and ECON C110 / POLSCI C135 cannot both count toward the major.",
  ],
  sections: [
    { id: "lower", name: "Lower division prerequisites", groups: [
      G("st_m51", "Calculus I", 1, ["MATH51"], { all: true }),
      G("st_m52", "Calculus II", 1, ["MATH52"], { all: true }),
      G("st_m53", "Multivariable Calculus", 1, ["MATH53"], { all: true }),
      G("st_m54", "Linear Algebra", 1, ["MATH54/MATHW54/MATH56"], { all: true }),
      G("st_found", "Statistics or Data Science foundation", 1,
        ["STAT20", "DATAC8/STATC8/COMPSCIC8/INFOC8"]),
    ]},
    { id: "upper", name: "Upper division core", groups: [
      G("st_prob", "Concepts of Probability", 1, STAT_PROB),
      G("st_stat", "Concepts of Statistics", 1, ["STAT135"], { all: true }),
      G("st_comp", "Concepts in Computing with Data", 1, ["STAT133", "DATAC100"], {
        hint: "STAT 133 on its own, or DATA C100 together with STAT 33B. The ledger counts one course here — if you take the C100 route, add STAT 33B to your record too." }),
    ]},
    { id: "electives", name: "Upper division electives", groups: [
      G("st_lab", "Electives with lab", 1, STAT_ELECT_LAB),
      G("st_any", "Electives with or without lab", 2, STAT_ELECT_ANY),
    ]},
    { id: "cluster", name: "Applied cluster",
      note: "Three upper-division courses of at least 3 units each, letter-graded, around a unifying theme, with at least two from the same department. The Guide's approved list is explicitly not exhaustive and the Head Undergraduate Faculty Adviser can approve others.", groups: [
      G("st_cluster", "Cluster courses", 3, [], { open: true,
        hint: "Add your three cluster courses under My courses, then pick them here. Economics and Business count as one department for this purpose, as do EE, CS and EECS, and as do the social-and-ethical courses CYPLAN 101, INFO 188, PHILOS 121 and DATA C104 / HISTORY C184D / STS C104D." }),
    ]},
  ],
};

/* ============ Statistics minor (CDSS) ============ */
const STAT_MINOR = {
  id: "statminor", type: "minor", name: "Statistics", degree: "Minor",
  dept: ["STAT"], college: "Computing, Data Science, and Society",
  rules: [
    "Declare the minor before the first day of instruction of your expected graduation term.",
    "All courses for the minor must be taken for graded credit.",
    "At least three of the upper-division courses must be completed at UC Berkeley.",
    "At least a 2.0 GPA across the courses used for the minor.",
    "Courses used for the minor may also count toward the Seven-Course Breadth requirement.",
    "No more than one upper-division course may count toward both a major and a minor.",
  ],
  sections: [
    { id: "upper", name: "Upper division", groups: [
      G("stm_prob", "Concepts of Probability", 1, STAT_PROB),
      G("stm_stat", "Concepts of Statistics", 1, ["STAT135"]),
      G("stm_lab", "Electives with lab", 1, STAT_ELECT_LAB),
      G("stm_any", "Electives with or without lab", 2, STAT_ELECT_ANY),
    ]},
  ],
};

/* ============ Economics, B.A. (L&S) ============ */
const ECON_ELECTIVES = ["CYPLAN113A","CYPLAN160","ENERESC176/ENVECONC176/IASC176","ENVECON131","ENVECON141",
  "ENVECON143","ENVECON145","ENVECON152","ENVECON153","ENVECON162","GEOG110","HISTORY133A",
  "HISTORYC159A/POLECONC160","HISTORY159B","HISTORY160","INDENG120","LEGALST142","LEGALST145","LEGALST147",
  "PHILOS141","POLSCIW135","PUBPOL141","UGBA118","UGBA131","UGBA132","UGBA133","UGBA136F","UGBA180"];

const ECONOMICS = {
  id: "econ", type: "major", name: "Economics", degree: "B.A.",
  dept: ["ECON"], college: "Letters & Science",
  note: "Every course counted toward the major must be taken for a letter grade.",
  rules: [
    "Every course for the major must be taken for a letter grade.",
    "At most two approved upper-division courses — the macro and micro theory courses included — may come from outside the department. That covers transfer work, UCEAP, and other Berkeley departments. Courses officially cross-listed with upper-division Economics do not count against the two.",
    "At most two of the five electives may come from outside ECON.",
    "ECON H195B counts only if taken for a letter grade and for 3 or more units.",
  ],
  sections: [
    { id: "prereq", name: "Prerequisites", groups: [
      G("ec_mathA", "Mathematics A", 1, ["MATH16A", "MATH51"]),
      G("ec_mathB", "Mathematics B", 1, ["MATH16B", "MATH52"]),
      G("ec_stat", "Statistics", 1, ["STAT20", "STAT21/STATW21", "STAT88/DATAC88S", "DATA89",
        "STATC131A", "STAT135", "STATC140/DATAC140"]),
      G("ec_intro", "Economics", 1, ["ECON1", "ECON2"]),
    ]},
    { id: "upper", name: "Upper division", groups: [
      G("ec_micro", "Microeconomics", 1, ["ECON100A", "ECON101A"]),
      G("ec_macro", "Macroeconomics", 1, ["ECON100B", "ECON101B", "UGBA101B"]),
      G("ec_metrics", "Econometrics", 1, ["ECON140", "ECON141"]),
      G("ec_elect", "Electives", 5, ECON_ELECTIVES, {
        /* The Guide's list, plus "any ECON 100–196 level course" minus the ones
           already required elsewhere. The range is matched rather than typed out. */
        match: inRange(["ECON"], 100, 196,
          ["ECON100A", "ECON100B", "ECON101A", "ECON101B", "ECON140", "ECON141",
           "ECONH195A", "ECONH195AS", "ECONH195BS"]),
        hint: "Five courses. Any ECON 100–196 counts except 100A, 100B, 101A, 101B, 140, 141, H195A, H195AS and H195BS — add one under My courses and it will land here on its own. At most two of the five may be non-ECON." }),
    ]},
  ],
};

/* ============ Applied Mathematics, B.A. (L&S) ============
   Five lower-division blocks, five core courses, and a cluster of three. The
   Guide writes three of the clusters as "Complete ALL" over more than three
   courses while the section header says a cluster is three courses; those are
   marked rather than silently resolved. */
const AM_CLUSTERS = [
  { id: "actuarial", label: "Actuarial Science", courses: ["DATAC140","ECON141","MATH128B",
    "STAT134/STATC140","STAT135","STAT151A"] },
  { id: "classical", label: "Classical Mechanics", courses: ["MATH123","MATH189","PHYSICS105","MECENG104"] },
  { id: "cs", label: "Computer Science", courses: ["COMPSCI162","COMPSCI164","COMPSCI170","COMPSCI172",
    "COMPSCI174","COMPSCI184","COMPSCI188","COMPSCI189","MATH124","MATH128B"] },
  { id: "datasci", label: "Data Science", courses: ["COMPSCI188","COMPSCI189","COMPSCIC100","DATAC100",
    "DATAC140","MATH170","STAT133"] },
  { id: "econ", label: "Economics", courses: ["DATAC140","ECON104","ECON141","ECONC103","MATH170",
    "MATHC103","STAT134/STATC140","STAT155"] },
  { id: "fluid", label: "Fluid Mechanics", courses: ["CHMENG141","ENGIN115","MATH126","MATH128B",
    "MECENG106","MECENG163"],
    note: "At most two courses may be taken between MECENG 163, CHMENG 141, MATH 126 and MATH 128B." },
  { id: "geophys", label: "Geophysics", courses: ["EPS104","EPS108","EPS121","EPS122","EPS130"],
    note: "The Guide writes this cluster as “Complete ALL” over five courses while the section header says a cluster is three. Treated as three; confirm with the department." },
  { id: "lifephys", label: "Life & Physical Science", courses: ["MATH123","MATH126","MATH128B"] },
  /* Only two courses are named and a cluster is three, so this one cannot be
     closed from the list alone — the Guide says the third needs a faculty
     adviser. Open, with the two named in the hint. */
  { id: "logic", label: "Logic", courses: [], open: true,
    openHint: "MATH 125A and 125B are recommended and need no approval. The third course requires consultation with a faculty adviser — add all three under My courses and pin them here.",
    note: "The Guide names only MATH 125A and MATH 125B; a third course relevant to the topic requires a faculty adviser's approval." },
  { id: "mathbio", label: "Mathematical Biology", courses: ["MATH123","MATH126","MATH127","MATH128B",
    "MATH170","MATH172"] },
  { id: "numerical", label: "Numerical Analysis", courses: ["MATH123","MATH126","MATH128B"] },
  { id: "or", label: "Operations Research", courses: ["DATAC140","INDENG130","INDENG160","INDENG161",
    "INDENG162","STAT134/STATC140"] },
  { id: "prob", label: "Probability Theory", courses: ["MATH105","STAT134","STAT150"] },
  { id: "quantum", label: "Quantum Mechanics", courses: ["MATH126","MATH189","PHYSICS137A","PHYSICS137B"] },
  { id: "relativity", label: "Relativity", courses: ["MATH126","MATH140","MATH141","PHYSICS139"] },
  { id: "socsci", label: "Social Sciences", courses: ["DATAC140","STAT134/STATC140","STAT135","STAT150",
    "STAT151A"],
    note: "The Guide writes this cluster as “Complete ALL” over five courses while the section header says a cluster is three. Treated as three; confirm with the department." },
  { id: "stats", label: "Statistics", courses: ["DATAC140","MATH128B","STAT134/STATC140","STAT135",
    "STAT150","STAT153","STAT154","STAT155"],
    note: "The Guide writes this cluster as “Complete ALL” over eight courses while the section header says a cluster is three. Treated as three; confirm with the department." },
  { id: "systems", label: "Systems Theory", courses: ["ELENG120","ELENG122","ELENG123"] },
  { id: "individual", label: "Individual (designed with an adviser)", courses: [], open: true,
    note: "The Guide says only “See advisor to determine courses.” Add your three under My courses and pin them here." },
];

const APPLIED_MATH = {
  id: "appmath", type: "major", name: "Applied Mathematics", degree: "B.A.",
  dept: ["MATH"], college: "Letters & Science",
  note: "A C- or better is required in every lower-division course. Beyond the five core courses, every student completes a cluster of three, chosen when the major is declared.",
  pathways: {
    id: "amCluster", label: "Cluster",
    note: "Chosen on declaring the major. Changing it swaps the cluster block below; nothing else moves.",
    options: AM_CLUSTERS.map((c) => ({ id: c.id, label: c.label })),
  },
  rules: [
    "A minimum grade of C- is required in each lower-division course.",
    "Students double majoring in Computer Science or EECS may take COMPSCI 70 in place of MATH 55.",
    "Honors also requires a 3.5 GPA in upper-division and graduate major courses, 3.3 overall, either MATH 196 with a senior thesis or two graduate maths courses at A- or better, and the head major adviser's recommendation.",
  ],
  sections: [
    { id: "lower", name: "Lower division", note: "A C- or better in each.", groups: [
      G("am_c1", "Calculus I", 1, ["MATH1A", "MATHN1A", "MATH51", "XMATH51"], {
        exams: ["AP: Mathematics: Calculus BC, score 3+", "AP: Mathematics: Calculus AB, score 3+",
          "IB: HL Math: Analysis & Approaches, score 5+", "IB: HL Mathematics, score 5+",
          "IB: HL Further Mathematics, score 6+", "A-Level: Mathematics, score 1-2",
          "A-Level: Further Mathematics, score 1-2", "A-Level: Mathematics H2, score 1-2"] }),
      G("am_c2", "Calculus II", 1, ["MATH1B", "MATHH1B", "MATHN1B", "MATH52", "XMATH52"], {
        exams: ["AP: Mathematics: Calculus BC, score 5", "IB: HL Math: Analysis & Approaches, score 7",
          "IB: HL Mathematics, score 7", "IB: HL Further Mathematics, score 7",
          "A-Level: Mathematics, score 1-2", "A-Level: Mathematics H2, score 1-2"] }),
      G("am_mv", "Multivariable Calculus", 1, ["MATH53", "MATHH53", "MATHN53", "MATHW53"]),
      G("am_la", "Linear Algebra and Differential Equations", 1,
        ["MATH54", "MATHH54", "MATHN54", "MATHW54", "MATH56"]),
      G("am_disc", "Discrete Mathematics", 1, ["MATH55", "MATHN55", "COMPSCI70"]),
    ]},
    { id: "core", name: "Upper division core", groups: [
      G("am_core", "Core", 5, ["MATH104", "MATHH104", "MATH110", "MATHH110", "MATH113", "MATHH113",
        "MATH128A", "MATHW128A", "MATH185", "MATHH185"]),
    ]},
    ...AM_CLUSTERS.map((c) => ({
      id: "amc_" + c.id, name: c.label + " cluster", pathway: c.id, note: c.note,
      groups: [G("amcl_" + c.id, "Cluster courses", 3, c.courses, c.open ? { open: true,
        hint: c.openHint || "Designed with an adviser — add your three courses under My courses and pin them here." } : {})],
    })),
  ],
};

/* ---- Political Science ---------------------------------------------------
   Eight upper-division courses inside the department, one course in each of
   the five subfields, and then a specialization in one of those five. The
   Guide prints the American Politics distribution list and the Empirical
   Theory upper-division list in full and names the other five as course sets,
   so those are open blocks carrying the rule instead of an invented list. */
const POLSCI_SPECS = [
  { id: "am", label: "American Politics" },
  { id: "comp", label: "Comparative Politics" },
  { id: "etqm", label: "Empirical Theory & Quantitative Methods" },
  { id: "theory", label: "Political Theory" },
  { id: "ir", label: "International Relations" },
];

const POLSCI_MAJOR = {
  id: "polsci", type: "major", name: "Political Science", degree: "B.A.",
  dept: ["POLSCI"], college: "Letters & Science",
  note: "Two lower-division introductions, a methods course, a history course, one course in each of the five subfields, one subfield specialization, and eight upper-division courses in the department.",
  pathways: {
    id: "psSpec", label: "Subfield specialization",
    note: "One of the five. Changing it swaps the specialization blocks below; the five distribution blocks stay where they are.",
    options: POLSCI_SPECS.map((x) => ({ id: x.id, label: x.label })),
  },
  rules: [
    "Subfield distribution requirements can be met with lower-division or upper-division courses.",
    "Upper-division courses used for the specialization or for a remaining distribution requirement also count toward the eight upper-division courses. This ledger assigns each course to one block, so pin such a course to the distribution or specialization block and count it again by hand against the eight.",
  ],
  sections: [
    { id: "ps_low", name: "Lower division", groups: [
      G("ps_prereq", "Prerequisites", 2, ["POLSCI1/XPOLSCI1", "POLSCI2/XPOLSCI2", "POLSCI4", "POLSCI5"]),
      G("ps_meth1", "Methods — POL SCI 3", 1, ["POLSCI3", "POLSCIW3"], { alt: "meth",
        note: "The Guide writes this option as “complete at least 0”, which is how it marks one of two routes rather than a requirement you can skip. Either this block or the Data C8 route below." }),
      G("ps_meth2", "Methods — Data C8 and POL SCI 88", 2,
        ["COMPSCIC8/DATAC8/INFOC8/STATC8", "POLSCI88"], { all: true, alt: "meth",
        note: "The second route. Both courses are needed; either this block or POL SCI 3 above." }),
      G("ps_hist", "History", 1, ["AFRICAM4A/AFRICAMN4A", "AFRICAM4B", "AFRICAM111", "AGRS10A", "AGRS10B", "AMERSTD139AC", "CELTIC70", "ECON113", "ECON115", "ETHSTD10A/ETHSTD10AC", "ETHSTD21AC", "GEOGC55", "GERMAN160A", "GERMAN160C", "GLOBAL45", "HISTORYC139C", "HISTORYC157", "HISTORYC159A", "HISTORYN106A", "HISTORYN106B", "HISTORYN112B", "HISTORYN124A", "HISTORYN124B", "HISTORYN131B", "HISTORYN143", "HISTORYN151C", "HISTORYN158C", "HISTORYN162A", "HISTORY4A", "HISTORY4B", "HISTORY5", "HISTORY6A", "HISTORY6B", "HISTORY7A", "HISTORY7B", "HISTORY8A", "HISTORY8B", "HISTORY10", "HISTORY11", "HISTORY12", "HISTORY14", "HISTORY105A", "HISTORY105B", "HISTORY106A", "HISTORY106B", "HISTORY108", "HISTORY112B", "HISTORY122AC", "HISTORY123", "HISTORY124A", "HISTORY124B", "HISTORY130", "HISTORY131B", "HISTORY133A", "HISTORY137AC", "HISTORY140B", "HISTORY141B", "HISTORY143", "HISTORY149B", "HISTORY150B", "HISTORY151A", "HISTORY151B", "HISTORY151C", "HISTORY155A", "HISTORY155B", "HISTORY158A", "HISTORY158B", "HISTORY158C", "HISTORY159B", "HISTORY160", "HISTORY162A", "HISTORY162B", "HISTORY164A", "HISTORY165A", "HISTORY165B", "HISTORY166A", "HISTORY166B", "HISTORY166C", "HISTORY167A", "HISTORY167B", "HISTORY167C", "HISTORY168A", "HISTORY169A", "HISTORY170", "HISTORY171A", "HISTORY171B", "HISTORY171C", "HISTORY173B", "HISTORY173C", "HISTORY174B", "HISTORY185A", "HISTORY185B", "IAS45", "MELCC26", "MELC10", "MELC109", "MELC147", "MELC173", "MELC175", "PACS125AC", "POLECONC160", "PORTUG113", "RELIGSTC124", "SCANDIN123", "XAGRS10A", "XETHSTD21AC", "XHISTOR7B"]),
    ]},
    { id: "ps_dist", name: "Subfield distribution",
      note: "One course in each of the five subfields. Lower-division or upper-division courses both count.", groups: [
      G("ps_dist_am", "American Politics", 1, ["POLSCI1", "POLSCI102", "POLSCI103", "POLSCI103W", "POLSCI104", "POLSCI105", "POLSCI106A", "POLSCI107", "POLSCI109", "POLSCI109A", "POLSCI109B", "POLSCI109D", "POLSCI109E", "POLSCI109G", "POLSCI109H", "POLSCI109L", "POLSCI109M", "POLSCI109P", "POLSCI109Q", "POLSCI109R", "POLSCI109S", "POLSCI109W", "POLSCI109Z", "POLSCI111AC", "POLSCI116J", "POLSCI150", "POLSCI152A", "POLSCI157A", "POLSCI157B", "POLSCI160", "POLSCI161", "POLSCI164A", "POLSCI166", "POLSCI167", "POLSCI167AC", "POLSCI169", "POLSCI171", "POLSCI173S", "POLSCI175A", "POLSCI181"]),
      G("ps_dist_comp", "Comparative Politics", 1, [], { open: true,
        hint: "One course from the department's Comparative Politics Distribution list. The Guide names the list rather than printing it — add your course under My courses and pin it here." }),
      G("ps_dist_etqm", "Empirical Theory & Quantitative Methods", 1, ["POLSCI3", "POLSCIW3"], {
        note: "The same course as the POL SCI 3 methods route above. The ledger gives a course to one block, so if you took POL SCI 3 it lands on Methods and this block stays open — one course closes both in the department's audit." }),
      G("ps_dist_theory", "Political Theory", 1, [], { open: true,
        hint: "One course from the department's Political Theory Distribution list. The Guide names the list rather than printing it — add your course under My courses and pin it here." }),
      G("ps_dist_ir", "International Relations", 1, [], { open: true,
        hint: "One course from the department's International Relations Distribution list. The Guide names the list rather than printing it — add your course under My courses and pin it here." }),
    ]},
    { id: "ps_spec_am", name: "American Politics specialization", pathway: "am",
      note: "Your chosen subfield. Changing it swaps these two blocks; nothing else on the tab moves.", groups: [
      G("ps_low_am", "American Politics: lower division", 1, ["POLSCI1", "XPOLSCI1"]),
      G("ps_up_am", "American Politics: upper division", 2, [], { open: true,
          hint: "Two upper-division courses from the department's American Politics Specialization list. The Guide names the list rather than printing it, so add your two under My courses and pin them here." }),
    ]},
    { id: "ps_spec_comp", name: "Comparative Politics specialization", pathway: "comp",
      note: "Your chosen subfield. Changing it swaps these two blocks; nothing else on the tab moves.", groups: [
      G("ps_low_comp", "Comparative Politics: lower division", 1, ["POLSCI2", "XPOLSCI2"]),
      G("ps_up_comp", "Comparative Politics: upper division", 2, [], { open: true,
          hint: "Two upper-division courses from the department's Comparative Politics Specialization list. The Guide names the list rather than printing it, so add your two under My courses and pin them here." }),
    ]},
    { id: "ps_spec_etqm", name: "Empirical Theory & Quantitative Methods specialization", pathway: "etqm",
      note: "Your chosen subfield. Changing it swaps these two blocks; nothing else on the tab moves.", groups: [
      G("ps_low_etqm", "Empirical Theory & Quantitative Methods: lower division", 1, ["POLSCI3", "POLSCIW3"]),
      G("ps_up_etqm", "Empirical Theory & Quantitative Methods: upper division", 2, ["ECONC110", "ECONC142", "POLSCIC131A", "POLSCIC135/POLSCIW135", "POLSCI132A", "POLSCI132B", "POLSCI133", "POLSCI134", "PUBPOLC142"]),
    ]},
    { id: "ps_spec_theory", name: "Political Theory specialization", pathway: "theory",
      note: "Your chosen subfield. Changing it swaps these two blocks; nothing else on the tab moves.", groups: [
      G("ps_low_theory", "Political Theory: lower division", 1, ["POLSCI4"]),
      G("ps_up_theory", "Political Theory: upper division", 2, [], { open: true,
          hint: "Two upper-division courses from the department's Political Theory Specialization list. The Guide names the list rather than printing it, so add your two under My courses and pin them here." }),
    ]},
    { id: "ps_spec_ir", name: "International Relations specialization", pathway: "ir",
      note: "Your chosen subfield. Changing it swaps these two blocks; nothing else on the tab moves.", groups: [
      G("ps_low_ir", "International Relations: lower division", 1, ["POLSCI5"]),
      G("ps_up_ir", "International Relations: upper division", 2, [], { open: true,
          hint: "Two upper-division courses from the department's International Relations Specialization list. The Guide names the list rather than printing it, so add your two under My courses and pin them here." }),
    ]},
    { id: "ps_eight", name: "Upper division in the department", groups: [
      G("ps_eight_g", "Upper-division Political Science", 8, [], { open: true,
        hint: "Eight upper-division courses inside the department. The Guide states this as a course set rather than a list. Courses already pinned to a distribution or specialization block also count toward these eight — the ledger gives each course to one block, so add them here by hand as well if you want the count to read true." }),
    ]},
  ],
};

/* ---- Political Economy ---------------------------------------------------
   An interdisciplinary major: one survey, economics, statistics, a foreign
   language, then the two political-economy theory courses, two conceptual
   tools courses and one historical-context course. The four-course
   concentration is designed with a Political Economy adviser, so it is an
   open block carrying that instruction rather than a list. */
const POLECON_MAJOR = {
  id: "polecon", type: "major", name: "Political Economy", degree: "B.A.",
  dept: ["POLECON"], college: "Letters & Science",
  note: "The survey course needs a B- or better and the economics course a C or better. Beyond the blocks below, every student builds a four-course concentration with a Political Economy adviser.",
  rules: [
    "Minimum grade of B- in the International & Area Studies survey course.",
    "Minimum grade of C in the economics course.",
    "AP Statistics with a score of 3 or higher also satisfies the statistics requirement.",
  ],
  sections: [
    { id: "pe_low", name: "Lower division", groups: [
      G("pe_survey", "International & Area Studies", 1, ["GLOBAL45", "IASN45", "POLECON45"], {
        note: "A B- or better is required." }),
      G("pe_econ", "Economics", 1, ["ECON1", "ECON2"], {
        note: "A C or better is required.",
        exams: ["AP: Microeconomics and Macroeconomics, score 4+", "IB: Microeconomics and Macroeconomics, score 5+"] }),
      G("pe_stat", "Statistics", 1, ["COMPSCIC8/DATAC8/INFOC8/STATC8", "STAT2/XSTAT2", "STAT20", "STAT21/STATW21"], {
        exams: ["AP: Statistics, score 3+"] }),
      G("pe_lang", "Foreign language", 1, ["AFRICAM10B", "ARABIC20B", "ARABIC30", "ARMENI101B", "CHINESE10", "CHINESE10B", "CHINESE10BX", "CHINESE100A", "CHINESE100B", "CHINESE100XA", "CHINESE100XB", "CHINESE100YA", "CHINESE100YB", "DUTCH100", "FILIPN100B", "FRENCH4", "GERMAN4", "HEBREW20B", "HINDI100B", "INDONES100B", "ITALIAN4", "JAPAN10", "JAPAN10B", "KOREAN10", "KOREAN10B", "KOREAN10BX", "KOREAN100A", "KOREAN100AX", "KOREAN100B", "KOREAN100BX", "PORTUG103", "PUNJABI100B", "RUSSIAN4", "SPANISHN4", "SPANISH4", "SPANISH21", "SPANISH22", "SPANISH101", "TAMIL101B", "THAI100B", "TURKISH100B", "URDU100B", "VIETNMS100B"], {
        note: "Reaching the level of the courses listed here, in one language. Study abroad and departmental placement also satisfy it — check with a Political Economy adviser." }),
    ]},
    { id: "pe_up", name: "Upper division", groups: [
      G("pe_theory", "Political Economy theory", 2, ["POLECON100/POLECONN100", "POLECON101/POLECONN101"], { all: true }),
      G("pe_tools1", "Conceptual tools 1", 1, ["ECON100A", "ECON101A", "ENVECON100", "POLECON106", "UGBA101A"]),
      G("pe_tools2", "Conceptual tools 2", 1, ["ECON100B", "ECON101B", "POLECON107", "UGBA101B"]),
      G("pe_hist", "Historical context", 1, ["AMERSTDC172/UGBAC172", "ECON115", "ECON134", "ECON135", "HISTORY133A", "HISTORY160", "HISTORY162B", "POLECON160"]),
    ]},
    { id: "pe_conc", name: "Concentration", groups: [
      G("pe_conc_g", "Concentration courses", 4, [], { open: true,
        hint: "Four upper-division courses on a theme you choose, built with a Political Economy adviser. The Guide does not enumerate them — add yours under My courses and pin them here." }),
    ]},
  ],
};

/* ---- Neuroscience ---------------------------------------------------------
   Preparatory science, the two-semester core sequence plus scientific
   communication and a laboratory, then three neuroscience electives and one
   course from outside the department. */
const NEURO_MAJOR = {
  id: "neuro", type: "major", name: "Neuroscience", degree: "B.A.",
  dept: ["NEU"], college: "Letters & Science",
  note: "A C- or better is required in every lower-division course. Between the two mathematics blocks you may use only one STAT course or DATA C8 — not both.",
  rules: [
    "A minimum grade of C- is required for all lower-division courses.",
    "Between Math, Part 1 and Math, Part 2 students may take only one STAT course or DATA C8.",
  ],
  sections: [
    { id: "nu_prep", name: "Preparatory subject matter", note: "A C- or better in each.", groups: [
      G("nu_chembio", "Chemistry and biology", 4, ["CHEM1A", "CHEM1AL", "BIOLOGY1A", "BIOLOGY1AL"], { all: true,
        note: "Both lecture-and-laboratory pairs: CHEM 1A with 1AL, and BIOLOGY 1A with 1AL." }),
      G("nu_math1", "Mathematics, part 1", 1, ["DATAC8", "MATH1A", "MATH10A/MATHN10A", "MATH51/XMATH51", "MATH53", "MATH54", "STAT2", "STAT20", "STAT21"], {
        note: "Between part 1 and part 2 you may use only one STAT course or DATA C8.",
        exams: ["AP: Mathematics: Calculus BC, score 5", "AP: Mathematics: Calculus AB, score 3+",
          "IB: HL Math: Analysis & Approaches, score 7", "IB: HL Mathematics, score 5+",
          "IB: HL Further Mathematics, score 6+", "A-Level: Mathematics, score 1-2",
          "A-Level: Further Mathematics, score 1-2", "A-Level: Mathematics H2, score 1-2"] }),
      G("nu_math2", "Mathematics, part 2", 1, ["MATH1B/MATHN1B/MATHH1B", "MATH10B/MATHN10B", "MATH52/XMATH52"], {
        note: "Between part 1 and part 2 you may use only one STAT course or DATA C8." }),
      G("nu_phys1", "Physics, part 1", 1, ["PHYSICS7A/PHYSICSH7A", "PHYSICS8A"]),
      G("nu_phys2", "Physics, part 2", 1, ["PHYSICS7B/PHYSICSH7B", "PHYSICS8B"]),
    ]},
    { id: "nu_adv", name: "Advanced subject matter", groups: [
      G("nu_core", "Core neuroscience sequence", 2, ["NEU100A", "NEU100B/MCELLBI161"], { all: true }),
      G("nu_comm", "Scientific communication", 1, ["NEU110"], { all: true }),
      G("nu_lab", "Neuroscience laboratory", 1, ["NEU171L", "NEU172L", "NEU173L"]),
    ]},
    { id: "nu_elec", name: "Major electives", groups: [
      G("nu_elec_g", "Neuroscience electives", 3, ["NEUC121/PSYCHC111", "NEUC124/BIOENGC171", "NEUC125/PSYCHC115C", "NEUC126/PSYCHC116", "NEUC166/INTEGBIC139", "NEU123", "NEU128", "NEU151", "NEU152", "NEU162", "NEU163/NEU163C", "NEU164", "NEU165", "MCELLBIC175/UGBAC195C", "PSYCHC127"]),
      G("nu_outside", "Outside perspectives", 1, ["ANTHRO106", "ANTHRO115", "ANTHROC119A", "BIOENG114", "BIOENGC165", "COGSCIC100", "COGSCI115", "COGSCIC126", "COGSCIC131", "COGSCIC142", "COMPSCIC100", "DATAC100", "DATAC102", "DATAC131A", "ESPMC126", "ESPMC153", "ESPMC156", "ESPM169", "ESPMC162A", "HISTORY180", "INTEGBI111", "INTEGBI114", "INTEGBI131", "INTEGBI132", "INTEGBI135", "INTEGBI136", "INTEGBI138", "INTEGBI140", "INTEGBI159", "INTEGBI160", "INTEGBI164L", "INTEGBI169", "INTEGBIC144", "INTEGBIC145", "INTEGBIC153", "LINGUIS100", "LINGUISC142", "LINGUISC146", "MBNC130", "MCELLBIC100A", "MCELLBI100B", "MCELLBI102", "MCELLBI104", "MCELLBI136", "MCELLBI140", "MCELLBI141", "MCELLBI150", "MCELLBI153", "MCELLBIC112", "MCELLBIC130", "PBHLTH126", "PBHLTH129", "PBHLTH132", "PBHLTH142", "PBHLTH150A", "PBHLTH150B", "PBHLTH150D", "PBHLTH162A", "PHILOS122", "PHILOS128", "PHILOS132", "PHILOS133", "PLANTBIC112", "PSYCH140", "PSYCH156", "PSYCH162", "PSYCHC120", "PSYCHC123", "PSYCHC126", "PSYCHC143", "STAT154", "STATC100", "STATC102", "STATC131A"]),
    ]},
  ],
};

/* ---- Psychology -----------------------------------------------------------
   Four prerequisites, then a survey course in each of four areas (Tier II) and
   three electives (Tier III). */
const PSYCH_MAJOR = {
  id: "psych", type: "major", name: "Psychology", degree: "B.A.",
  dept: ["PSYCH"], college: "Letters & Science",
  note: "Four prerequisites, one survey course in each of the four Tier II areas, and three Tier III electives of at least 3 units each.",
  rules: [
    "At most two courses from outside the department may be used toward Tier II and Tier III combined.",
    "At most one Child Minor course may be used toward Tier II and Tier III combined.",
    "Excess Tier II survey courses may be used for Tier III once every Tier II area is closed.",
  ],
  sections: [
    { id: "py_pre", name: "Prerequisites", groups: [
      G("py_gen", "General psychology", 1, ["PSYCH1/PSYCHN1/XPSYCH1"], {
        exams: ["AP: Psychology, score 4+", "IB: HL Psychology, score 5+"] }),
      G("py_quant", "Quantitative", 1, ["COMPSCIC8", "DATAC8", "INFOC8", "STATC8", "MATH10A", "MATH10B", "MATH1A", "XMATH1B", "MATH51", "MATH52", "MATH54", "MATH55", "MATHH1B", "MATHH54", "MATHN10A", "MATHN10B", "MATHN1A", "MATHN1B", "MATHN54", "MATHN55", "PSYCH10", "STAT2", "STAT20", "STAT21", "STATW21"]),
      G("py_soc", "Social science", 1, ["ANTHRO3", "ANTHRO3AC", "ANTHRON3", "LINGUIS5", "PHILOS12A", "PHILOS25B", "PHILOS3", "PHILOS4", "PHILOS5", "PHILOSW12A", "POLSCI1", "POLSCI2", "POLSCI4", "POLSCIN1AC", "POLSCIN2", "SOCIOL1", "SOCIOL3", "SOCIOL3AC", "SOCIOLN1H"], {
        exams: ["AP: Government & Politics: U.S., score 4+", "AP: Government & Politics: Comparative, score 4+"] }),
      G("py_res", "Psychology research and data", 1, ["PSYCH101", "PSYCH101D"]),
    ]},
    { id: "py_tier2", name: "Survey courses (Tier II)",
      note: "One course in each of the four areas. At most two courses from outside the department, and at most one Child Minor course, across Tier II and Tier III together.", groups: [
      G("py_bio", "Biological survey", 1, ["PSYCH110/PSYCHN110", "PSYCH114", "PSYCH117", "PSYCH119", "PSYCH124", "PSYCH125", "PSYCHC111/NEUC121", "PSYCHC115C/INTEGBIC147/NEUC125", "PSYCHC127/COGSCIC127", "PSYCHN117"]),
      G("py_clin", "Clinical survey", 1, ["PSYCH119", "PSYCH130", "PSYCH130M", "PSYCH131", "PSYCH134", "PSYCH135", "PSYCHN134", "PSYCHN135"]),
      G("py_cog", "Cognition and development survey", 1, ["COGSCIC100/COGSCIN100/PSYCHC120", "COGSCIC126/PSYCHC126", "PSYCHN120", "PSYCH140/PSYCHN140", "PSYCHC143/LINGUISC146", "PSYCH147"]),
      G("py_socp", "Social and personality survey", 1, ["PSYCH150/PSYCHN150", "PSYCH156", "PSYCH160/PSYCHN160", "PSYCH166AC", "PSYCH180/PSYCHN180", "SOCIOL150"]),
    ]},
    { id: "py_tier3", name: "Electives (Tier III)",
      note: "Three courses of at least 3 units each. Excess Tier II survey courses count here once all four Tier II areas are closed.", groups: [
      G("py_elec", "Electives", 3, ["ANTHRO106", "ANTHRO109", "ANTHRO149", "COGSCIC100/COGSCIN100", "COGSCI115", "COGSCI131", "COGSCIC124", "COGSCIC126", "COGSCIC127", "COGSCI132", "COGSCIC142", "COGSCI175", "COGSCI180", "COMPSCI188", "ECON119", "ESPMC126", "INTEGBI139/INTEGBIC139", "INTEGBIC143A", "INTEGBIC144", "LEGALST180", "LEGALST181", "LEGALST183", "LINGUIS108", "LINGUISC142", "LINGUISC146", "NEU100A", "NEU123", "NEU165", "NEUC126", "NEUC166", "PBHLTH129/PBHLTHC129/NEUROSCC129", "POLSCIN164A", "PSYCH192", "PUBPOLC189", "SOCIOL150", "SOCIOL150A", "SOCWEL181/SOCWELC181", "SPANISH163", "UGBA105", "UGBA160"]),
    ]},
  ],
};

/* ---- Physics --------------------------------------------------------------
   The lower-division series comes in two shapes — the 7 series or the 5
   series — so those are an either/or pair rather than two separate blocks. */
const PHYSICS_MAJOR = {
  id: "physics", type: "major", name: "Physics", degree: "B.A.",
  dept: ["PHYSICS"], college: "Letters & Science",
  note: "A C- or better is required in every course counted toward the major.",
  rules: [
    "A minimum grade of C- is required in each course counted toward the major.",
    "Transfer students may use MATH 54-equivalent courses completed before admission in place of PHYSICS 89.",
    "Students double-majoring in Physics and Mathematics may use MATH 54 in place of PHYSICS 89.",
    "PHYSICS 111B must be taken for 3 units to count toward the laboratory requirement.",
  ],
  sections: [
    { id: "ph_low", name: "Lower division", note: "A C- or better in each.", groups: [
      G("ph_m51", "Calculus I", 1, ["MATH1A/MATHN1A", "MATH51/XMATH51"], {
        exams: ["AP: Mathematics: Calculus BC, score 3+", "AP: Mathematics: Calculus AB, score 3+",
          "IB: HL Math: Analysis & Approaches, score 5+", "IB: HL Mathematics, score 5+",
          "IB: HL Further Mathematics, score 6+", "A-Level: Mathematics, score 1-2",
          "A-Level: Further Mathematics, score 1-2", "A-Level: Mathematics H2, score 1-2"] }),
      G("ph_m52", "Calculus II", 1, ["MATH1B/MATHH1B/MATHN1B", "MATH52/XMATH52"], {
        exams: ["AP: Mathematics: Calculus BC, score 5", "IB: HL Math: Analysis & Approaches, score 7",
          "IB: HL Mathematics, score 7", "IB: HL Further Mathematics, score 7",
          "A-Level: Mathematics, score 1-2", "A-Level: Mathematics H2, score 1-2"] }),
      G("ph_m53", "Multivariable calculus", 1, ["MATH53/MATHH53/MATHW53"]),
      G("ph_mp", "Mathematical physics", 1, ["PHYSICS89/PHYSICSW89"], {
        note: "The Guide writes this block as “complete at least 0”, which reads as a Guide artefact rather than a course you may skip — the department lists PHYSICS 89 as required. Transfer students may substitute a MATH 54 equivalent taken before admission, and Physics/Mathematics double majors may substitute MATH 54." }),
      G("ph_a", "Physics: A series", 1, ["PHYSICS5A", "PHYSICS7A"]),
      G("ph_s7", "Physics series — 7 series", 2, ["PHYSICS7B", "PHYSICS7C"], { all: true, alt: "series",
        note: "Either this block or the 5 series below." }),
      G("ph_s5", "Physics series — 5 series", 4, ["PHYSICS5B", "PHYSICS5BL", "PHYSICS5C", "PHYSICS5CL"], { all: true, alt: "series",
        note: "Either this block or the 7 series above. Students who start the 5 series after PHYSICS 7A also need PHYSICS 49 to complete it." }),
    ]},
    { id: "ph_up", name: "Upper division", note: "A C- or better in each.", groups: [
      G("ph_core", "Core", 5, ["PHYSICS105", "PHYSICS110A", "PHYSICS112", "PHYSICS137A", "PHYSICS137B"], { all: true }),
      G("ph_lab", "Laboratory", 2, ["PHYSICS111A", "PHYSICS111B"], { all: true,
        note: "PHYSICS 111B must be taken for 3 units to count." }),
      G("ph_elec", "Electives", 1, ["ASTRONC161", "CHEMC191", "COMPSCIC191", "PHYSICS110B", "PHYSICS129", "PHYSICS130", "PHYSICS138", "PHYSICS139", "PHYSICS141A", "PHYSICS141B", "PHYSICS142", "PHYSICS151", "PHYSICS177", "PHYSICS188", "PHYSICSC161", "PHYSICSC191/EECSC191A/CHEMC191A", "PHYSICSC191B/EECSC191B/CHEMC191B"]),
    ]},
  ],
};

const CATALOG = {
  majors: [COGSCI, DATASCI_MAJOR, COMPSCI_MAJOR, STAT_MAJOR, ECONOMICS, APPLIED_MATH,
    POLSCI_MAJOR, POLECON_MAJOR, NEURO_MAJOR, PSYCH_MAJOR, PHYSICS_MAJOR],
  minors: [DATASCI_MINOR, STAT_MINOR],
};

/* ============ Every program you can pick ============
   A finding aid, not a requirements source. Each entry carries only a name, a
   degree and a college — enough to give the program its own tab, apply the
   right college's requirements, and point at its Academic Guide page. The
   requirements themselves are always loaded from the Guide by the student,
   which is why a name here being slightly stale costs nothing: you would
   notice when you opened the Guide page.

   Compiled offline. If your program is missing or is named differently in the
   Guide, the "Something else" option takes any name you type. */
const LS = "Letters & Science";
const CDSS = "Computing, Data Science, and Society";

const PROGRAM_INDEX = [
  /* --- Letters & Science: Arts & Humanities --- */
  ["African American Studies", "B.A.", LS, "major"],
  ["American Studies", "B.A.", LS, "major"],
  ["Ancient Greek and Roman Studies", "B.A.", LS, "major"],
  ["Art Practice", "B.A.", LS, "major"],
  ["Asian American and Asian Diaspora Studies", "B.A.", LS, "major"],
  ["Asian Studies", "B.A.", LS, "major"],
  ["Celtic Studies", "B.A.", LS, "major"],
  ["Chicanx and Latinx Studies", "B.A.", LS, "major"],
  ["Chinese Language", "B.A.", LS, "major"],
  ["Comparative Literature", "B.A.", LS, "major"],
  ["Dance and Performance Studies", "B.A.", LS, "major"],
  ["Dutch Studies", "B.A.", LS, "major"],
  ["East Asian Religion, Thought, and Culture", "B.A.", LS, "major"],
  ["English", "B.A.", LS, "major"],
  ["Ethnic Studies", "B.A.", LS, "major"],
  ["Film", "B.A.", LS, "major"],
  ["French", "B.A.", LS, "major"],
  ["German", "B.A.", LS, "major"],
  ["History of Art", "B.A.", LS, "major"],
  ["Italian", "B.A.", LS, "major"],
  ["Japanese Language", "B.A.", LS, "major"],
  ["Jewish Studies", "B.A.", LS, "major"],
  ["Korean Language", "B.A.", LS, "major"],
  ["Media Studies", "B.A.", LS, "major"],
  ["Middle Eastern Languages and Cultures", "B.A.", LS, "major"],
  ["Music", "B.A.", LS, "major"],
  ["Native American Studies", "B.A.", LS, "major"],
  ["Philosophy", "B.A.", LS, "major"],
  ["Rhetoric", "B.A.", LS, "major"],
  ["Scandinavian", "B.A.", LS, "major"],
  ["Slavic Languages and Literatures", "B.A.", LS, "major"],
  ["South and Southeast Asian Studies", "B.A.", LS, "major"],
  ["Spanish and Portuguese", "B.A.", LS, "major"],
  ["Theater and Performance Studies", "B.A.", LS, "major"],

  /* --- Letters & Science: Biological Sciences --- */
  ["Integrative Biology", "B.A.", LS, "major"],
  ["Microbial Biology", "B.A.", LS, "major"],
  ["Molecular and Cell Biology", "B.A.", LS, "major"],

  /* --- Letters & Science: Mathematical & Physical Sciences --- */
  ["Astrophysics", "B.A.", LS, "major"],
  ["Earth and Planetary Science", "B.A.", LS, "major"],
  ["Environmental Earth Science", "B.A.", LS, "major"],
  ["Geology", "B.A.", LS, "major"],
  ["Geophysics", "B.A.", LS, "major"],
  ["Marine Science", "B.A.", LS, "major"],
  ["Mathematics", "B.A.", LS, "major"],

  /* --- Letters & Science: Social Sciences --- */
  ["Anthropology", "B.A.", LS, "major"],
  ["Gender and Women's Studies", "B.A.", LS, "major"],
  ["Geography", "B.A.", LS, "major"],
  ["History", "B.A.", LS, "major"],
  ["Legal Studies", "B.A.", LS, "major"],
  ["Linguistics", "B.A.", LS, "major"],
  ["Sociology", "B.A.", LS, "major"],

  /* --- Letters & Science: interdisciplinary & group majors --- */
  ["Development Studies", "B.A.", LS, "major"],
  ["Global Studies", "B.A.", LS, "major"],
  ["Interdisciplinary Studies Field", "B.A.", LS, "major"],
  ["Latin American Studies", "B.A.", LS, "major"],
  ["Peace and Conflict Studies", "B.A.", LS, "major"],
  ["Urban Studies", "B.A.", LS, "major"],

  /* --- Computing, Data Science & Society --- */
  ["Computer Science", "Minor", CDSS, "minor"],

  /* --- Minors most often paired with an L&S major --- */
  ["Anthropology", "Minor", LS, "minor"],
  ["Art History", "Minor", LS, "minor"],
  ["Asian American and Asian Diaspora Studies", "Minor", LS, "minor"],
  ["Cognitive Science", "Minor", LS, "minor"],
  ["Creative Writing", "Minor", LS, "minor"],
  ["Demography", "Minor", LS, "minor"],
  ["Economics", "Minor", LS, "minor"],
  ["Education", "Minor", LS, "minor"],
  ["English", "Minor", LS, "minor"],
  ["Ethnic Studies", "Minor", LS, "minor"],
  ["Gender and Women's Studies", "Minor", LS, "minor"],
  ["Geography", "Minor", LS, "minor"],
  ["Global Poverty and Practice", "Minor", LS, "minor"],
  ["History", "Minor", LS, "minor"],
  ["Human Rights Interdisciplinary", "Minor", LS, "minor"],
  ["Linguistics", "Minor", LS, "minor"],
  ["Media Studies", "Minor", LS, "minor"],
  ["Music", "Minor", LS, "minor"],
  ["Philosophy", "Minor", LS, "minor"],
  ["Political Economy", "Minor", LS, "minor"],
  ["Psychology", "Minor", LS, "minor"],
  ["Public Policy", "Minor", LS, "minor"],
  ["Rhetoric", "Minor", LS, "minor"],
  ["Sociology", "Minor", LS, "minor"],
  ["Theater and Performance Studies", "Minor", LS, "minor"],
].map(([name, degree, college, kind]) => ({
  id: "idx_" + kind + "_" + norm(name).toLowerCase().slice(0, 24),
  name, degree, college, kind,
}));

const indexFor = (kind) => PROGRAM_INDEX.filter((x) => x.kind === kind);

/* A program picked from the index starts empty: the right name, degree and
   college, and nowhere for its courses to go until the student loads them. */
function stubProgram(entry) {
  return {
    id: entry.id, type: entry.kind, custom: true, stub: true,
    name: entry.name, degree: entry.degree, college: entry.college,
    dept: [], sections: [],
  };
}


/* Exported so tools/check-data.mjs can validate the requirement data without a browser. */
export { CATALOG, UNIVERSITY, LS_COLLEGE, programGroups, PROGRAM_INDEX, PAIRINGS };

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
/* Which pathway or emphasis a program is set to. Kept per program id, with a
   fallback to the profile's old single `dsPath` so ledgers saved before the
   Data Science major existed still open on the right minor pathway. */
function pathwayFor(profile, program) {
  const sel = (profile.pathways || {})[program.id];
  if (sel) return sel;
  if (program.id === "dsminor" && profile.dsPath) return profile.dsPath;
  return program.pathways ? program.pathways.options[0].id : undefined;
}

function programGroups(program, pathway) {
  const out = [];
  for (const s of program.sections || []) {
    if (s.pathway && s.pathway !== pathway) continue;
    for (const g of s.groups) out.push({ ...g, sectionId: s.id, sectionName: s.name, sectionNote: s.note, programId: program.id });
  }
  return out;
}
const eligible = (g, c) =>
  (g.options && g.options.some((o) => o.codes.includes(c.norm))) || (g.match ? g.match(c.norm) : false);
/* A block is full when it has enough courses, or — for unit-based blocks —
   enough units among the courses already assigned to it. */
function groupFull(g, ids, courses) {
  if (g.needUnits) {
    const have = ids.reduce((n, id) => n + unitsOf(courses.find((c) => c.id === id)), 0);
    return have >= g.needUnits;
  }
  return ids.length >= g.need;
}

function assignCourses(groups, courses, pins, excl) {
  const used = new Map();
  const byGroup = {};
  const cg = groups.filter((g) => g.kind === "courses");
  const skipped = (g, id) => ((excl && excl[g.id]) || []).includes(id);
  cg.forEach((g) => { byGroup[g.id] = []; });
  for (const g of cg) {
    for (const cid of pins[g.id] || []) {
      const c = courses.find((x) => x.id === cid);
      if (!c || used.has(cid) || groupFull(g, byGroup[g.id], courses)) continue;
      if (!g.open && !eligible(g, c)) continue;
      byGroup[g.id].push(cid); used.set(cid, g.id);
    }
  }
  const rest = cg
    .filter((g) => !g.open && !groupFull(g, byGroup[g.id], courses))
    .map((g) => ({ g, pool: courses.filter((c) => eligible(g, c)).length }))
    .sort((a, b) => a.pool - b.pool)
    .map((x) => x.g);
  for (const g of rest) {
    for (const c of courses) {
      if (groupFull(g, byGroup[g.id], courses)) break;
      if (used.has(c.id) || skipped(g, c.id) || !isPassing(c.grade) || !eligible(g, c)) continue;
      byGroup[g.id].push(c.id); used.set(c.id, g.id);
    }
  }
  return { byGroup, used };
}

function groupProgress(g, byGroup, checkState, auto, igetcFull, entry, courses) {
  if (g.kind === "check") {
    const items = g.checks.filter((c) => !c.transferOnly || entry === "transfer");
    const done = items.filter((c) => checkOn(c, checkState, auto, igetcFull)).length;
    return { done, need: items.length };
  }
  if (g.needUnits) {
    const have = (byGroup[g.id] || []).reduce((n, id) => n + unitsOf((courses || []).find((c) => c.id === id)), 0);
    return { done: Math.min(have, g.needUnits), need: g.needUnits, units: true };
  }
  const n = (byGroup[g.id] || []).length + (checkState["exam:" + g.id] ? 1 : 0);
  return { done: Math.min(n, g.need), need: g.need };
}
/* Some requirements are two routes to the same place — "either POL SCI 3, or
   Data C8 together with POL SCI 88"; "either the Physics 7 series or the 5
   series". Blocks that share an `alt` key are one requirement, not two: only
   the route you are furthest along counts toward the totals, and closing
   either one closes the requirement. Without this a student on one route
   would read as permanently short by the whole of the other. */
function altKey(g) { return g.alt ? g.programId + ":" + g.alt : null; }
function progressTotals(groups, byGroup, checkState, auto, igetcFull, entry, courses) {
  const best = new Map();
  const out = { done: 0, need: 0, open: [] };
  for (const g of groups) {
    const pr = groupProgress(g, byGroup, checkState, auto, igetcFull, entry, courses);
    const k = altKey(g);
    if (!k) {
      out.done += pr.done; out.need += pr.need;
      if (pr.done < pr.need) out.open.push(g.name);
      continue;
    }
    const share = pr.need ? pr.done / pr.need : 1;
    const cur = best.get(k);
    if (!cur || share > cur.share) best.set(k, { share, pr, name: g.name });
  }
  for (const b of best.values()) {
    out.done += b.pr.done; out.need += b.pr.need;
    if (b.pr.done < b.pr.need) out.open.push(b.name);
  }
  return out;
}
/* Which alt routes are already satisfied, so the other route in the pair can
   stop reading as an unfinished block in the sidebar and the graduation check. */
function altsMet(groups, byGroup, checkState, auto, igetcFull, entry, courses) {
  const met = new Set();
  for (const g of groups) {
    const k = altKey(g);
    if (!k) continue;
    const pr = groupProgress(g, byGroup, checkState, auto, igetcFull, entry, courses);
    if (pr.done >= pr.need) met.add(k);
  }
  return met;
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
    secondCollege: "", dsPath: "data", pathways: {}, majors: ["cogsci"], minors: ["dsminor"] },
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
  const byId = (id) => courses.find((c) => c.id === id);
  /* Unit-based blocks report units; everything else reports a course count. */
  const isUnits = !!group.needUnits;
  const target = isUnits ? group.needUnits : group.need;
  const have = isUnits
    ? assigned.reduce((n, id) => n + unitsOf(byId(id)), 0)
    : assigned.length + (examOn ? 1 : 0);
  const done = Math.min(have, target);
  const cls = done >= target ? "done" : done ? "part" : "";
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
        <span className="bdl-glyph">{done >= target ? "■" : done ? "◪" : "□"}</span>
        <span className="bdl-bname">{group.name}</span>
        {group.alt && <span className="bdl-tag">either / or</span>}
        {assigned.length > 0 && !open && (
          <span className="bdl-ctitle" style={{ flex: "0 1 auto", fontFamily: "var(--mono)", fontSize: 11.5 }}>
            {assigned.map((id) => pretty(byId(id) ? byId(id).code : "")).join(" · ")}
          </span>
        )}
        <span className="bdl-count">{done}/{target}{isUnits ? " units" : ""} {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="bdl-body">
          <p className="bdl-hint">
            {isUnits
              ? `Earn ${group.needUnits} units from these ${opts.length} courses.`
              : group.all ? "All of these are required." : `Pick ${group.need} of ${opts.length}.`}
            {onRecord > 0 && ` ${onRecord} ${onRecord === 1 ? "is" : "are"} on your record.`}
            {" Tap one to count it here; tap again to release it."}
          </p>
          {group.note && <p className="bdl-hint">{group.note}</p>}
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

/* A block the catalog states as a category rather than a course list — "16
   units of upper-division CS/EE", "three cluster courses you design yourself".
   The student picks from their own record; the rule text is the hint. */
function OpenBlock({ group, courses, assigned, onPin, onRelease }) {
  const byId = (id) => courses.find((c) => c.id === id);
  const isUnits = !!group.needUnits;
  const target = isUnits ? group.needUnits : group.need;
  const done = isUnits ? assigned.reduce((n, id) => n + unitsOf(byId(id)), 0) : assigned.length;
  const cls = done >= target ? "done" : done ? "part" : "";
  return (
    <div className={"bdl-block " + cls} id={"blk-" + group.id}>
      <div className="bdl-bhead">
        <span className="bdl-glyph">{done >= target ? "■" : done ? "◪" : "□"}</span>
        <span className="bdl-bname">{group.name}</span>
        {group.alt && <span className="bdl-tag">either / or</span>}
        <span className="bdl-count">{Math.min(done, target)}/{target}{isUnits ? " units" : ""}</span>
      </div>
      <div className="bdl-body">
        <p className="bdl-hint">{group.hint}</p>
        {group.note && <p className="bdl-hint">{group.note}</p>}
        {assigned.map((id) => (
          <div key={id} className="bdl-opt hit">
            <span className="bdl-code">{pretty(byId(id) ? byId(id).code : "")}</span>
            <span className="bdl-ctitle">{byId(id) ? byId(id).title : ""}</span>
            <button className="bdl-btn tiny ghost" onClick={() => onRelease(group.id, id)}>remove</button>
          </div>
        ))}
        {done < target && (
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

/* Every program, grouped so the encoded ones are findable and the rest are
   ordered by college. */
function ProgramSelect({ value, kind, encoded, onChange, first }) {
  const idx = indexFor(kind);
  const ls = idx.filter((x) => x.college === LS);
  const cdss = idx.filter((x) => x.college === CDSS);
  return (
    <select className="bdl-sel" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{first ? (kind === "major" ? "No major loaded" : "No minor") : `Add another ${kind}…`}</option>
      <optgroup label="Requirements included">
        {encoded.map((m) => <option key={m.id} value={m.id}>{m.name}, {m.degree}</option>)}
      </optgroup>
      <optgroup label="Letters & Science">
        {ls.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </optgroup>
      <optgroup label="Computing, Data Science & Society">
        {cdss.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </optgroup>
    </select>
  );
}

/* Shown on a program that has a name and a college but no requirements yet.
   The Guide is the source; this is the doorway to it. */
function LoadRequirements({ prog, setState }) {
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const search = "https://guide.berkeley.edu/search/?P=" + encodeURIComponent(prog.name);

  const load = () => {
    const parsed = parseGuide(paste, prog.name);
    if (!parsed) {
      setMsg("Nothing parsed. Copy the Requirements tab itself — the reader keys off the “Complete N of the following” lines and the course rows beneath them.");
      return;
    }
    setState((s) => {
      const rest = (s.customPrograms || []).filter((c) => c.id !== prog.id);
      return { ...s, customPrograms: [...rest, {
        id: prog.id, type: prog.type, custom: true, name: prog.name, degree: prog.degree,
        college: prog.college, dept: guessDept(parsed), sections: parsed.sections,
      }] };
    });
    setPaste("");
  };

  return (
    <div className="bdl-card" style={{ marginBottom: 16 }}>
      <h3>Load this program's requirements</h3>
      <Flag>
        <span>
          <b>{prog.name} is not typed into this ledger.</b> Its name and college are, which is enough for the
          University, campus and {prog.college === CDSS ? "CDSS" : "Letters & Science"} tabs to apply to you
          correctly and for the overlap rules to work. What is missing is its own course lists — and those come
          from the Guide rather than from me, because a requirement list invented from memory is worse than
          none at all in something you plan a degree around.
        </span>
      </Flag>
      <p className="bdl-note" style={{ fontSize: 12.5 }}>
        Open{" "}
        <a href={search} target="_blank" rel="noopener noreferrer"><b>{prog.name}</b> in the Academic Guide</a>,
        go to its <b>Requirements</b> tab, select the requirement blocks and paste them below. Block headings,
        course lists and OR cross-listings are read straight out of the text. You only do this once — it stays
        on this device.
      </p>
      <textarea className="bdl-ta" value={paste}
        placeholder={"Lower Division\nComplete at least 1 of the following Courses:\nPSYCH 1 - General Psychology\nOR PSYCH N1 - General Psychology\n\nUpper Division\nComplete at least 2 of the following Courses:\nPSYCH 101 - Research and Data Analysis"}
        onChange={(e) => setPaste(e.target.value)} />
      <div className="bdl-row" style={{ marginTop: 9 }}>
        <button className="bdl-btn" onClick={load} disabled={!paste.trim()}>Load requirements</button>
        {msg && <span style={{ fontSize: 12.5, color: "var(--slate)" }}>{msg}</span>}
      </div>
    </div>
  );
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

/* ============ L&S × CDSS pairings ============
   The combinations this ledger is really for. Each row names the L&S side, the
   CDSS side it is usually taken with, and what people take it for.

   On the popularity column: only the Economics row rests on published figures
   — CDSS reported Economics × Data Science as the most common double major at
   around 40% of all students holding more than one, and Economics as the most
   common major among Data Science minors at 24%. Every other rating is an
   informal impression of how often the combination comes up, not a measurement,
   and the page says so rather than dressing it up as data. The shared-course
   counts underneath are computed live from the encoded requirements and are
   the part you can rely on. */
const PAIRINGS = [
  { ls: "cogsci", cdss: ["dsmajor"], stars: 5, sourced: false,
    forWhat: "AI and ML, product, UX research, tech" },
  { ls: "econ", cdss: ["dsmajor", "dsminor"], stars: 5, sourced: true,
    forWhat: "finance, analytics, consulting, fintech" },
  { ls: "appmath", cdss: ["dsmajor", "csmajor", "statmajor"], stars: 4, sourced: false,
    forWhat: "quant, ML, graduate school" },
  { ls: "physics", cdss: ["dsmajor"], stars: 3, sourced: false,
    forWhat: "scientific computing, research, tech" },
  { ls: "idx_major_astrophysics", cdss: ["dsmajor"], stars: 3, sourced: false,
    forWhat: "scientific computing, research, tech" },
  { ls: "psych", cdss: ["dsmajor", "statminor"], stars: 3, sourced: false,
    forWhat: "behavioural data, UX research, analytics" },
  { ls: "neuro", cdss: ["dsmajor"], stars: 3, sourced: false,
    forWhat: "computational biology, biotech, research" },
  { ls: "idx_major_molecularandcellbiology", cdss: ["dsmajor"], stars: 3, sourced: false,
    forWhat: "computational biology, biotech, research" },
  { ls: "polecon", cdss: ["dsmajor", "dsminor"], stars: 3, sourced: false,
    forWhat: "policy analytics, economics, government" },
  { ls: "polsci", cdss: ["dsmajor", "dsminor"], stars: 3, sourced: false,
    forWhat: "policy analytics, economics, government" },
];

const progById = (id) =>
  CATALOG.majors.find((m) => m.id === id) || CATALOG.minors.find((m) => m.id === id) ||
  (() => { const e = PROGRAM_INDEX.find((x) => x.id === id); return e ? stubProgram(e) : null; })();

/* Every course code a program can be closed with, for one pathway. */
function codesOf(prog, pathway, onlyCore) {
  const out = new Set();
  for (const g of programGroups(prog, pathway)) {
    if (onlyCore && String(g.sectionId).startsWith("emph")) continue;
    for (const o of g.options || []) o.codes.forEach((c) => out.add(c));
  }
  return out;
}
const shareCount = (a, b) => { let n = 0; for (const c of a) if (b.has(c)) n++; return n; };

/* Which Data Science emphasis sits closest to a given L&S major. */
function bestEmphasis(lsProg) {
  const ds = CATALOG.majors.find((m) => m.id === "dsmajor");
  if (!ds || !lsProg) return null;
  const mine = codesOf(lsProg);
  if (!mine.size) return null;
  const ranked = ds.pathways.options.map((o) => {
    const e = new Set();
    for (const g of programGroups(ds, o.id))
      if (String(g.sectionId).startsWith("emph"))
        for (const opt of g.options || []) opt.codes.forEach((c) => e.add(c));
    return { label: o.label, id: o.id, n: shareCount(mine, e) };
  }).sort((x, y) => y.n - x.n);
  return ranked[0] && ranked[0].n > 0 ? ranked[0] : null;
}

function PairingsView({ p, setProfile, setTab }) {
  const apply = (lsId, cdssId, emphasisId) => {
    setProfile("majors", [...new Set([lsId, ...(CATALOG.majors.some((m) => m.id === cdssId) ? [cdssId] : [])])]);
    setProfile("minors", CATALOG.minors.some((m) => m.id === cdssId) ? [cdssId] : []);
    if (emphasisId) setProfile("pathways", { ...(p.pathways || {}), dsmajor: emphasisId });
    setTab("setup");
  };

  return (
    <div>
      <p className="bdl-eyebrow">Pairings</p>
      <h2 className="bdl-h2">Letters &amp; Science, meet Computing &amp; Data Science</h2>
      <p className="bdl-note">
        These are the combinations this ledger is built for. Picking one sets up both programs, both colleges'
        requirements, and the overlap rules in one go — a major in each college is a simultaneous degree, which
        is where the overlap allowance actually bites.
      </p>

      <Flag>
        <span>
          <b>On the star ratings.</b> Only the Economics row rests on published figures: CDSS reported Economics
          × Data Science as the most common double major on campus, at about 40% of all students holding more
          than one, and Economics as the most common major among Data Science minors at 24%. Every other rating
          is an informal impression of how often the combination comes up — not a measurement. The shared-course
          counts below each pairing <em>are</em> computed from the real requirement lists, and those you can rely on.
        </span>
      </Flag>

      {PAIRINGS.map((pair) => {
        const ls = progById(pair.ls);
        const also = pair.also ? progById(pair.also) : null;
        if (!ls) return null;
        const lsCodes = codesOf(ls);
        const emph = bestEmphasis(ls);
        return (
          <div className="bdl-card" style={{ marginBottom: 12 }} key={pair.ls}>
            <div className="bdl-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <h3 style={{ margin: 0, fontSize: 14.5, fontFamily: "var(--sans)", fontWeight: 600,
                letterSpacing: 0, textTransform: "none", color: "var(--ink)" }}>
                {ls.name}{also ? ` or ${also.name}` : ""}
              </h3>
              <span title={pair.sourced ? "Backed by published CDSS figures" : "Informal impression, not a measurement"}
                style={{ fontFamily: "var(--mono)", fontSize: 12, color: pair.sourced ? "var(--gold)" : "var(--slate)" }}>
                {"★".repeat(pair.stars)}{"☆".repeat(5 - pair.stars)}
                {pair.sourced && <Chip tone="ok" >sourced</Chip>}
              </span>
            </div>
            <p className="bdl-note" style={{ margin: "4px 0 9px", fontSize: 12.5 }}>{pair.forWhat}</p>

            {pair.cdss.map((cid) => {
              const cd = progById(cid);
              if (!cd) return null;
              const core = shareCount(lsCodes, codesOf(cd, pathwayFor(p, cd), true));
              const known = lsCodes.size > 0;
              return (
                <div className="bdl-ovl" key={cid}>
                  <span className="c" style={{ minWidth: 150, fontFamily: "var(--sans)", fontWeight: 500 }}>
                    + {cd.name}{cd.degree === "Minor" ? " minor" : ""}
                  </span>
                  <span className="w">
                    {known
                      ? <>{core} course{core === 1 ? "" : "s"} count for both{core > 0 ? " before you spend any overlap allowance" : ""}</>
                      : <>requirements not loaded for {ls.name} yet — pick it and paste them from the Guide to see the shared courses</>}
                  </span>
                  <button className="bdl-btn tiny" onClick={() => apply(pair.ls, cid, cid === "dsmajor" && emph ? emph.id : null)}>
                    Set this up
                  </button>
                </div>
              );
            })}

            {emph && (
              <p className="bdl-note" style={{ margin: "9px 0 0", fontSize: 12 }}>
                Closest Data Science domain emphasis by shared coursework: <b>{emph.label}</b> ({emph.n} courses
                in common). Worth weighing against what the emphasis does for the work you actually want — the
                two do not always point the same way.
              </p>
            )}
          </div>
        );
      })}

      <p className="bdl-note" style={{ fontSize: 12 }}>
        Anything not listed still works — load it from Setup. These are shortcuts, not the limits of the tool.
      </p>
    </div>
  );
}

function SetupView({ p, setProfile, state, setState }) {
  const majors = p.majors || [];
  const minors = p.minors || [];
  const selected = [
    ...majors.map((id) => CATALOG.majors.find((m) => m.id === id)),
    ...minors.map((id) => CATALOG.minors.find((m) => m.id === id)),
  ].filter(Boolean);
  const setList = (k, i, v) => {
    const next = [...(p[k] || [])];
    if (v) next[i] = v; else next.splice(i, 1);
    // The same program in two slots would render two identical tabs that share
    // a key and fight over the same pins, so a repeat replaces rather than adds.
    setProfile(k, [...new Set(next.filter(Boolean))]);
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
            <ProgramSelect value={id} kind="major" encoded={CATALOG.majors}
              onChange={(v) => setList("majors", i, v)} first={i === 0} />
          </label>
        )).slice(0, Math.min(majors.length + 1, 3))}
        {minors.concat([""]).map((id, i) => (
          <label className="bdl-field" key={"min" + i}>
            <span className="bdl-label">{i === 0 ? "Minor" : "Second minor"}</span>
            <ProgramSelect value={id} kind="minor" encoded={CATALOG.minors}
              onChange={(v) => setList("minors", i, v)} first={i === 0} />
          </label>
        )).slice(0, Math.min(minors.length + 1, 3))}
        <p className="bdl-note" style={{ fontSize: 12, marginTop: -4 }}>
          The three marked <em>requirements included</em> are typed in and checked against the Academic Guide.
          Every other program gives you the right college rules and its own tab, and asks you to load its
          requirements once — the list of names is a way to find your program, not a source of requirements.
          Not listed? Add it by name at the bottom of this page.
        </p>

        {/* A program that branches — the minor's two pathways, the Data Science
            major's domain emphasis — picks its branch here. Two or three
            options read as buttons; a long list belongs in a select. */}
        {selected.filter((prog) => prog.pathways).map((prog) => (
          <PathwayPicker key={prog.id} prog={prog} p={p} setProfile={setProfile} showName />
        ))}
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
   The allowances are the College's, not each program's: one upper-division
   course in total between all majors and all minors, none between two L&S
   minors, two between simultaneous-degree majors. */
function OverlapPanel({ audit, audits, courses, usage }) {
  const { prog, groups, byGroup } = audit;
  const byId = (id) => courses.find((c) => c.id === id);
  const udOf = (a) => a.groups.filter((g) => String(g.sectionId).startsWith("upper"))
    .flatMap((g) => a.byGroup[g.id] || []);
  const allOf = (a) => a.groups.flatMap((g) => a.byGroup[g.id] || []);
  const majors = audits.filter((a) => a.prog.type === "major");
  const minors = audits.filter((a) => a.prog.type === "minor");

  const udGroupIds = new Set(groups.filter((g) => String(g.sectionId).startsWith("upper")).map((g) => g.id));
  const mine = [];
  for (const g of groups)
    for (const cid of byGroup[g.id] || [])
      mine.push({ cid, groupName: g.name, ud: udGroupIds.has(g.id) });

  const shared = mine
    .map((m) => ({ ...m, others: (usage.get(m.cid) || []).filter((u) => u.progId !== prog.id) }))
    .filter((m) => m.others.length > 0);

  const isMinor = prog.type === "minor";
  const isMajor = prog.type === "major";
  if (!isMinor && !isMajor && shared.length === 0) return null;
  if (!shared.length && !isMinor && majors.length < 2) return null;

  /* one course, total, across every major/minor pair */
  const majMin = new Set();
  for (const m of minors) {
    const ud = new Set(udOf(m));
    for (const maj of majors) for (const id of allOf(maj)) if (ud.has(id)) majMin.add(id);
  }
  /* two courses between any pair of majors */
  const majMaj = new Set();
  for (let i = 0; i < majors.length; i++)
    for (let j = i + 1; j < majors.length; j++) {
      const a = new Set(udOf(majors[i]));
      udOf(majors[j]).forEach((id) => { if (a.has(id)) majMaj.add(id); });
    }

  const chip = (used, allowed) => used > allowed
    ? <Chip tone="bad">over</Chip>
    : used === allowed ? <Chip tone="warn">spent</Chip> : <Chip tone="ok">free</Chip>;

  const deptUsed = isMinor && prog.dept && prog.dept.length
    ? mine.filter((m) => m.ud && prog.dept.includes(splitCode((byId(m.cid) || {}).code || "").subject)).length
    : 0;

  return (
    <div className="bdl-card" style={{ marginBottom: 16 }}>
      <h3>Where courses are double counting</h3>

      {minors.length > 0 && majors.length > 0 && (
        <div className="bdl-stat">
          <span>Upper-division overlap between majors and minors</span>
          <b>{majMin.size} of 1 {chip(majMin.size, 1)}</b>
        </div>
      )}
      {majors.length > 1 && (
        <div className="bdl-stat">
          <span>Upper-division overlap between your two majors</span>
          <b>{majMaj.size} of 2 {chip(majMaj.size, 2)}</b>
        </div>
      )}
      {isMinor && prog.dept && prog.dept.length > 0 && (
        <div className="bdl-stat">
          <span>Upper-division courses from {prog.dept.join(" / ")}</span>
          <b>{deptUsed} of 1 {chip(deptUsed, 1)}</b>
        </div>
      )}

      <div style={{ marginTop: shared.length ? 11 : 0 }}>
        {shared.length === 0 ? (
          <p className="bdl-note" style={{ margin: 0, fontSize: 12.5 }}>
            Nothing is counting in two places yet. The allowance is one upper-division course in total between
            all your majors and all your minors — not one per major — and none at all between two L&amp;S minors.
          </p>
        ) : (
          shared.map((m) => {
            const c = byId(m.cid);
            return (
              <div key={m.cid} className="bdl-ovl">
                <span className="c">{pretty(c ? c.code : "")}</span>
                <span className="w">
                  {m.groupName}{m.ud ? " (upper division)" : ""} — also{" "}
                  {m.others.map((u, i) => (
                    <span key={i}>{i > 0 ? ", " : ""}<b style={{ color: "var(--blue)" }}>{u.progName}</b> · {u.groupName}</span>
                  ))}
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="bdl-note" style={{ fontSize: 12, margin: "11px 0 0" }}>
        Where a program's own rule is stricter than the College's, the stricter one applies — including a minor
        hosted by another school or college.
      </p>
    </div>
  );
}

/* A program that branches — the Data Science major's domain emphasis, Applied
   Mathematics' cluster, Political Science's subfield — picks its branch here.
   The same control appears on Setup and on the program's own tab: burying it on
   a form you filled in once meant the blocks it swaps looked, from the major
   tab, like they had changed on their own. Two or three options read as
   buttons; a longer list belongs in a select. */
function PathwayPicker({ prog, p, setProfile, showName }) {
  const pw = prog.pathways;
  if (!pw) return null;
  const cur = pathwayFor(p, prog);
  const pick = (v) => setProfile("pathways", { ...(p.pathways || {}), [prog.id]: v });
  return (
    <label className="bdl-field">
      <span className="bdl-label">{showName ? `${prog.name} — ${pw.label}` : pw.label}</span>
      {pw.options.length <= 3 ? (
        <div className="bdl-switch">
          {pw.options.map((o) => (
            <button key={o.id} className={cur === o.id ? "sel" : ""} onClick={() => pick(o.id)}>{o.label}</button>
          ))}
        </div>
      ) : (
        <select className="bdl-sel" value={cur} onChange={(e) => pick(e.target.value)}>
          {pw.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      )}
      {pw.note && <p className="bdl-note" style={{ fontSize: 12, margin: "6px 0 0" }}>{pw.note}</p>}
    </label>
  );
}

function ProgramView({ audit, courses, checks, setChecks, auto, igetcFull, entry, onPin, onRelease, onQuickAdd, warnings, usage, audits, setState, p, setProfile }) {
  const { prog, groups, byGroup, used } = audit;
  const sections = [];
  for (const g of groups) {
    let s = sections.find((x) => x.id === g.sectionId);
    if (!s) { s = { id: g.sectionId, name: g.sectionName, note: g.sectionNote, groups: [] }; sections.push(s); }
    s.groups.push(g);
  }
  const totals = progressTotals(groups, byGroup, checks, auto, igetcFull, entry, courses);

  return (
    <div>
      <p className="bdl-eyebrow">
        {prog.type === "major" ? "Major" : prog.type === "minor" ? "Minor" : prog.type === "custom" ? "Added program" : "Required of everyone"}
        {prog.college ? " · " + prog.college : ""}
      </p>
      <h2 className="bdl-h2">{prog.name}{prog.degree ? `, ${prog.degree}` : ""}</h2>
      <p className="bdl-note">{prog.note || `${totals.done} of ${totals.need} requirements closed.`}</p>

      {warnings.map((w, i) => <Flag key={i} tone={w.tone}><span>{w.text}</span></Flag>)}

      {prog.pathways && setProfile && (
        <div className="bdl-card" style={{ marginBottom: 12 }}>
          <PathwayPicker prog={prog} p={p} setProfile={setProfile} />
        </div>
      )}

      {prog.stub && <LoadRequirements prog={prog} setState={setState} />}

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

function GraduationView({ audits, checks, auto, igetcFull, p, stats, warnings, courses }) {
  const rows = [];
  for (const a of audits) {
    const t = progressTotals(a.groups, a.byGroup, checks, auto, igetcFull, p.entry, courses);
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
  /* The tab lives in the URL. A ledger is something you keep open in a tab for
     four years, so the back button, a bookmark and a reload all have to land
     where you were rather than dumping you back on the setup form. */
  const hashTab = () => (typeof location !== "undefined" && location.hash ? decodeURIComponent(location.hash.slice(1)) : "");
  const [tab, setTabRaw] = useState(() => hashTab() || "setup");
  const setTab = useCallback((id) => {
    setTabRaw(id);
    if (typeof history !== "undefined" && hashTab() !== id) history.pushState(null, "", "#" + encodeURIComponent(id));
  }, []);
  useEffect(() => {
    const onPop = () => setTabRaw(hashTab() || "setup");
    window.addEventListener("hashchange", onPop);
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("hashchange", onPop); window.removeEventListener("popstate", onPop); };
  }, []);
  const p = state.profile;

  const courses = useMemo(() => state.courses.map((c) => ({ ...c, norm: norm(c.code) })), [state.courses]);
  const igetcFull = p.entry === "transfer" && p.igetc === "full";

  const programs = useMemo(() => {
    const custom = state.customPrograms || [];
    /* A selected id is either a program typed into this file, or one of the
       index entries — which starts empty and fills in once the student loads
       its requirements from the Guide. */
    const pick = (ids, list) => [...new Set(ids || [])].map((id) => {
      const encoded = list.find((m) => m.id === id);
      if (encoded) return encoded;
      const entry = PROGRAM_INDEX.find((x) => x.id === id);
      if (!entry) return null;
      const loaded = custom.find((c) => c.id === id);
      if (loaded && (loaded.sections || []).length) return { ...stubProgram(entry), ...loaded, stub: false };
      return stubProgram(entry);
    }).filter(Boolean);
    const majors = pick(p.majors, CATALOG.majors);
    const minors = pick(p.minors, CATALOG.minors);
    const chosen = new Set([...(p.majors || []), ...(p.minors || [])]);
    const freeform = custom.filter((c) => !chosen.has(c.id));
    /* Your college follows your major, not your minor — a Letters & Science
       student minoring in Data Science still clears the L&S list. With a major
       in each, both apply, which is exactly the simultaneous-degree case. */
    const colleges = [];
    const declaring = [...majors, ...custom.filter((c) => c.type === "major")];
    const inCDSS = declaring.some((m) => /Computing, Data Science/.test(m.college || ""));
    const inLS = declaring.some((m) => !/Computing, Data Science/.test(m.college || "")) || !declaring.length;
    if (inLS) colleges.push(LS_COLLEGE);
    if (inCDSS) colleges.push(CDSS_COLLEGE);
    return [UNIVERSITY, ...colleges, ...majors, ...minors, ...freeform];
  }, [p.majors, p.minors, state.customPrograms]);

  const audits = useMemo(() => programs.map((prog) => {
    const groups = programGroups(prog, pathwayFor(p, prog));
    const pins = {}, excl = {};
    for (const g of groups) {
      pins[g.id] = state.pins[prog.id + ":" + g.id] || [];
      excl[g.id] = state.excl[prog.id + ":" + g.id] || [];
    }
    const { byGroup, used } = assignCourses(groups, courses, pins, excl);
    return { prog, groups, byGroup, used };
  }), [programs, courses, state.pins, state.excl, p.pathways, p.dsPath]);

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

  /* ---- rule warnings ----
     The L&S overlap policy is stricter than any individual program's own
     wording, and it is the one that binds: ONE upper-division course total may
     overlap between all your majors and all your minors — not one per major —
     no upper-division overlap at all is allowed between two L&S minors, and a
     simultaneous degree allows two upper-division courses between the majors.
     Where a program's own rule is stricter, the stricter one applies. */
  const warnings = useMemo(() => {
    const byProg = {}; const push = (id, w) => { (byProg[id] = byProg[id] || []).push(w); };
    const byId = (id) => courses.find((c) => c.id === id);
    const label = (ids) => ids.map((i) => pretty(byId(i) ? byId(i).code : "")).join(", ");
    const majorAudits = audits.filter((a) => a.prog.type === "major");
    const minorAudits = audits.filter((a) => a.prog.type === "minor");
    const udOf = (a) => a.groups.filter((g) => String(g.sectionId).startsWith("upper"))
      .flatMap((g) => a.byGroup[g.id] || []);
    const allOf = (a) => a.groups.flatMap((g) => a.byGroup[g.id] || []);

    /* one upper-division course, total, between every major and every minor */
    const majMinShared = new Set();
    for (const m of minorAudits) {
      const udIds = new Set(udOf(m));
      for (const maj of majorAudits)
        for (const id of allOf(maj)) if (udIds.has(id)) majMinShared.add(id);
    }
    const mmList = [...majMinShared];
    if (mmList.length > 1) {
      const w = { tone: "bad", text: `${label(mmList)} are all counting toward a major and toward the upper-division requirements of a minor. Letters & Science allows one such course in total across every major and minor you hold — not one per major — so all but one has to be swapped out.` };
      minorAudits.forEach((m) => push(m.prog.id, w));
    } else if (mmList.length === 1) {
      const w = { tone: "warn", text: `${label(mmList)} is your one allowed upper-division overlap between a major and a minor. That allowance is one course in total, so nothing else may double count between any major and any minor.` };
      minorAudits.forEach((m) => push(m.prog.id, w));
    }

    /* none at all between two L&S minors */
    const lsMinors = minorAudits.filter((m) => !/Computing, Data Science/.test(m.prog.college || ""));
    for (let i = 0; i < lsMinors.length; i++)
      for (let j = i + 1; j < lsMinors.length; j++) {
        const a = new Set(udOf(lsMinors[i]));
        const shared = udOf(lsMinors[j]).filter((id) => a.has(id));
        if (shared.length) {
          const w = { tone: "bad", text: `${label(shared)} is counting toward both the ${lsMinors[i].prog.name} and ${lsMinors[j].prog.name} minors. Letters & Science allows no upper-division overlap between two L&S minors at all.` };
          push(lsMinors[i].prog.id, w); push(lsMinors[j].prog.id, w);
        }
      }

    /* two upper-division courses between simultaneous-degree majors */
    for (let i = 0; i < majorAudits.length; i++)
      for (let j = i + 1; j < majorAudits.length; j++) {
        const a = new Set(udOf(majorAudits[i]));
        const shared = udOf(majorAudits[j]).filter((id) => a.has(id));
        const both = `${majorAudits[i].prog.name} and ${majorAudits[j].prog.name}`;
        if (shared.length > 2) {
          const w = { tone: "bad", text: `${label(shared)} are all counting toward both ${both}. At most two upper-division courses may overlap between two majors.` };
          push(majorAudits[i].prog.id, w); push(majorAudits[j].prog.id, w);
        } else if (shared.length === 2) {
          const w = { tone: "warn", text: `${label(shared)} are your two allowed upper-division overlaps between ${both}. Nothing else may double count between them.` };
          push(majorAudits[i].prog.id, w); push(majorAudits[j].prog.id, w);
        }
      }

    /* a minor's own department rule, where it has one */
    for (const m of minorAudits) {
      const udIds = udOf(m);
      for (const maj of majorAudits) {
        const deptHits = udIds.filter((id) => (maj.prog.dept || []).includes(splitCode(byId(id).code).subject));
        if (deptHits.length > 1)
          push(m.prog.id, { tone: "bad", text: `${label(deptHits)} all come from your major department. Only one course offered by or cross-listed with ${maj.prog.dept.join("/")} may count toward the upper-division ${m.prog.name} minor requirements, including the overlap course.` });
      }
      const capped = ["STAT20", "ENGIN7", "ENGINW7"];
      const cappedHits = allOf(m).filter((id) => capped.includes(byId(id).norm));
      if (m.prog.id === "dsminor" && cappedHits.length > 1)
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
  const spine = useMemo(() => audits.flatMap((a) => {
    const met = altsMet(a.groups, a.byGroup, state.checks, auto, igetcFull, p.entry, courses);
    return a.groups.map((g) => {
      const pr = groupProgress(g, a.byGroup, state.checks, auto, igetcFull, p.entry, courses);
      /* A block on the road not taken is not an open block. */
      const done = pr.done >= pr.need || met.has(altKey(g));
      return { key: a.prog.id + g.id, tab: a.prog.id, id: g.id,
        prog: a.prog.name, ptype: a.prog.type, name: g.name, done: pr.done, need: pr.need, units: !!pr.units,
        label: `${a.prog.name} · ${g.name} — ${pr.done}/${pr.need}`,
        cls: done ? "on" : pr.done ? "part" : "" };
    });
  }), [audits, state.checks, auto, igetcFull, p.entry, courses]);
  const closed = spine.filter((t) => t.cls === "on").length;

  /* The nearest unfinished blocks, closest first. Ten tabs of requirements is a
     lot to hold in your head; this answers "what should I sign up for" without
     making you open every one of them. */
  const nextUp = useMemo(() => {
    /* Work already started comes first, then your own major and minor ahead of
       the university's boilerplate, then whatever is shortest. At most two per
       program, so the list does not fill up with six identical university
       blocks while the major you are actually planning goes unmentioned. */
    const weight = (t) => (t.ptype === "major" ? 0 : t.ptype === "minor" ? 1 : t.ptype === "custom" ? 2 : 3);
    const ranked = spine
      .filter((t) => t.cls !== "on")
      .map((t) => ({ ...t, left: t.need - t.done }))
      .sort((a, b) => (b.done > 0) - (a.done > 0) || weight(a) - weight(b) || a.left - b.left);
    const perProgram = {};
    const out = [];
    for (const t of ranked) {
      perProgram[t.tab] = (perProgram[t.tab] || 0) + 1;
      if (perProgram[t.tab] > 2) continue;
      out.push(t);
      if (out.length === 6) break;
    }
    return out;
  }, [spine]);

  const jump = (t) => {
    setTab(t.tab);
    setTimeout(() => {
      const el = document.getElementById("blk-" + t.id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const tabs = [
    { id: "setup", label: "Setup" },
    { id: "pairings", label: "L&S × CDSS" },
    { id: "courses", label: "My courses", n: courses.length },
    /* Each program tab carries its own blocks-closed count, so the nav answers
       "how far along is my minor" without having to open it. */
    ...audits.map((a) => {
      const mine = spine.filter((t) => t.tab === a.prog.id);
      return { id: a.prog.id, label: a.prog.type === "minor" ? a.prog.name + " minor" : a.prog.name,
        n: `${mine.filter((t) => t.cls === "on").length}/${mine.length}` };
    }),
    { id: "grad", label: "Graduation check" },
  ];

  /* A first visit needs the setup form; a ledger you have already filled in does
     not. With no tab in the URL, someone who has courses on file opens on their
     first major instead of on a form they finished months ago. */
  const landed = useRef(false);
  useEffect(() => {
    if (!ready || landed.current) return;
    landed.current = true;
    if (hashTab()) return;
    if (!courses.length) return;
    const first = audits.find((a) => a.prog.type === "major");
    if (first) setTab(first.prog.id);
  }, [ready, courses.length, audits, setTab]);

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
              <button key={t.id} data-tab={t.id} className={"bdl-tab " + (tab === t.id ? "sel" : "")}
                onClick={() => setTab(t.id)}>
                {/* The space matters: without it the tab's accessible name reads
                    "Data Science0/13" to a screen reader. */}
                {t.label}{t.n != null && <span className="n">{" " + t.n}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="bdl-wrap">
        <div className="bdl-cols">
          <div>
            {tab === "setup" && <SetupView p={p} setProfile={setProfile} state={state} setState={setState} />}
            {tab === "pairings" && <PairingsView p={p} setProfile={setProfile} setTab={setTab} />}
            {tab === "courses" && <CoursesView courses={courses} setState={setState} audits={audits} />}
            {tab === "grad" && <GraduationView audits={audits} checks={state.checks} auto={auto}
              igetcFull={igetcFull} p={p} stats={stats} warnings={allWarnings} courses={courses} />}
            {current && (
              <ProgramView audit={current} courses={courses} checks={state.checks} setChecks={setChecks}
                auto={auto} igetcFull={igetcFull} entry={p.entry} usage={usage} audits={audits}
                onPin={(gid, cid) => pin(current.prog.id, gid, cid)}
                onRelease={(gid, cid) => release(current.prog.id, gid, cid)}
                onQuickAdd={quickAdd}
                warnings={warnings[current.prog.id] || []} setState={setState}
                p={p} setProfile={setProfile} />
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

            {nextUp.length > 0 && (
              <div className="bdl-card">
                <h3>Next up</h3>
                <p className="bdl-note" style={{ margin: "0 0 8px", fontSize: 12 }}>
                  The blocks closest to closing. Tap one to go to it.
                </p>
                {nextUp.map((t) => (
                  <button key={t.key} className="bdl-next" onClick={() => jump(t)}>
                    <span className="nm">{t.name}</span>
                    <span className="pr">{t.prog}</span>
                    <span className="ct">{t.left} {t.units ? "units" : t.left === 1 ? "course" : "courses"} to go</span>
                  </button>
                ))}
              </div>
            )}

            {audits.filter((a) => a.prog.type === "major" || a.prog.type === "minor").map((a) => {
              const t = progressTotals(a.groups, a.byGroup, state.checks, auto, igetcFull, p.entry, courses);
              return (
                <div key={a.prog.id} className="bdl-card">
                  <h3>{a.prog.type}</h3>
                  <div className="bdl-stat" style={{ borderBottom: 0 }}>
                    <span style={{ fontWeight: 600 }}>{a.prog.name}</span><b>{t.done}/{t.need}</b>
                  </div>
                  <Meter done={t.done} need={t.need} />
                  {/* Courses, not blocks — the tab bar counts blocks, and two
                      different fractions with no labels read as a contradiction. */}
                  <p className="bdl-note" style={{ margin: "6px 0 0", fontSize: 11 }}>
                    courses counted toward the requirement lists
                  </p>
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
        L&amp;S student. Thirteen programs ship with their course lists typed in from the Guide — Cognitive Science,
        Data Science, Computer Science, Statistics, Economics, Applied Mathematics, Political Science, Political
        Economy, Neuroscience, Psychology and Physics, plus the Data Science and Statistics minors. Every other
        program is whatever you loaded from the Guide, so it is only as current as the text you pasted. Requirements
        change between catalog years, and this ledger is a planning aid — check your Academic Progress Report in
        CalCentral and talk to your major and college advisers before you file to graduate.
      </footer>
    </div>
  );
}
