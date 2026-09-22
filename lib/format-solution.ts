/**
 * Utility to format scraped exam solutions into clean, human-readable paragraphs,
 * lists, subheadings, and mathematical derivations.
 */

export function formatSolution(text?: string | null): string {
  if (!text) return "";

  // 1. Strip leading "Solution:" tag and [images] markers
  let s = text.replace(/^Solution:\s*/i, "").replace(/\[images\]/g, "").trim();

  // 2. Separate English letter followed immediately by Bengali (e.g. "yপ্রশ্নমতে" -> "y প্রশ্নমতে")
  s = s.replace(/([a-zA-Z])([\u0980-\u09FF])/g, "$1 $2");

  // 3. Separate English dot followed by Bengali (e.g. "Reforms.প্রশাসনিক" -> "Reforms.\nপ্রশাসনিক")
  s = s.replace(/([a-zA-Z0-9]\.)([A-Z\u0980-\u09FF])/g, "$1\n$2");

  // 4. Subheadings preceded by sentence punctuation: "সালে।NICAR এর কাজ:" -> "সালে।\n\nNICAR এর কাজ:"
  s = s.replace(/([।!?])\s*([A-Za-z\u0980-\u09FF][^\n:;।!?]{1,35}:)/g, "$1\n\n$2");

  // 5. Consecutive subheadings: "NICAR পরিচিতি: পূর্ণরূপ:" -> "NICAR পরিচিতি:\nপূর্ণরূপ:"
  s = s.replace(/([^\n:;।!?]{2,30}:)\s*([A-Za-z\u0980-\u09FF][^\n:;।!?]{1,30}:)/g, "$1\n$2");

  // 6. Bullet points: normalize ●, ▪, ★, ⁃, ❖ to • and place each on a fresh line
  s = s.replace(/:\s*[●•▪︎★⁃❖]\s*/g, ":\n• ");
  s = s.replace(/\s*[●•▪︎★⁃❖]\s*/g, "\n• ");

  // 7. Numbered list items preceded by punctuation, colon, or dash
  // e.g. "যথা-১. ", "হয়।২. ", "করেন: ২ জন। ১।"
  s = s.replace(/([।!?:]|যথা-)\s*(?:(\([১-৯a-d\d]\))|([১-৯\d]\.)|([১-৯\d]\।)|(\([ক-হ]\)))\s*/g, (m, p1, p2, p3, p4, p5) => {
    const num = p2 || p3 || p4 || p5;
    return `${p1}\n${num} `;
  });

  // 8. Dari after parenthesis followed immediately by next step: "শক্তি)।এই" -> "শক্তি)।\nএই"
  s = s.replace(/\)।\s*([A-Za-z\u0980-\u09FF])/g, "।\n$1");

  // 9. Glued dari to text (missing space between sentences): "হয়।সুইচ" -> "হয়। সুইচ"
  s = s.replace(/।([A-Za-z\u0980-\u09FF])/g, "। $1");

  // 10. Mathematical transitions (when starting a new logical step)
  const mathTransitions = ["প্রশ্নমতে,", "আমরা জানি,", "অতএব,", "সুতরাং,", "শর্তমতে,", "যেখানে,"];
  for (const trans of mathTransitions) {
    const escaped = trans.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp("(?<!^|\\n)\\s*(" + escaped + ")", "g"), "\n$1");
  }

  // 11. Math step arrows (⇒ or ∴) outside math delimiters: e.g. "2xy ⇒ (x"
  s = s.replace(/([^\\])\s*(⇒|∴)\s*/g, "$1\n$2 ");

  // 12. Equality continuation steps across math tags: \)... \(=
  s = s.replace(/(\\\)\s*)\s*(\\\(\s*=\s*)/g, "$1\n$2");

  // 13. Clean up excessive spaces and multiple consecutive blank lines
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/^[ \t]+/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}
