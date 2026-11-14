// Problems and their tests. The tests never leave the server: the API only
// sends the public fields (see publicProblems below).
// Format: programs read from stdin and print to stdout, like Codeforces or ICPC.

const lcg = (seed) => () => (seed = (seed * 1103515245 + 12345) % 2147483648);
const kadane = (a) => { let best = a[0], cur = 0; for (const x of a) { cur = Math.max(x, cur + x); best = Math.max(best, cur); } return best; };
const fizz = (n) => Array.from({ length: n }, (_, i) => (++i % 15 ? i % 3 ? i % 5 ? String(i) : "Buzz" : "Fizz" : "FizzBuzz")).join("\n");

// Big inputs make slow O(n^2) solutions hit Time Limit Exceeded.
const bigTwoSum = (() => {
  const n = 100000, a = [];
  for (let i = 0; i < n - 2; i++) a.push(1000 * (i + 1));
  a.push(1, 2); // the only pair that sums to 3
  return { input: `${n} 3\n${a.join(" ")}`, output: `${n - 2} ${n - 1}` };
})();
const bigKadane = (() => {
  const rnd = lcg(42), n = 200000;
  const a = Array.from({ length: n }, () => (rnd() % 2001) - 1000);
  return { input: `${n}\n${a.join(" ")}`, output: String(kadane(a)) };
})();

const STARTERS = {
  js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");\n\n// Read the input from \`lines\`, then print the answer with console.log\n`,
  python: `import sys\n\ndata = sys.stdin.read().split("\\n")\n\n# Read the input from \`data\`, then print the answer\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n\n  // Read the input with cin, print the answer with cout\n  return 0;\n}\n`,
};

export const problems = [
  {
    id: "two-sum", title: "Two Sum", difficulty: "Easy", tags: ["Array", "Hash Map"], acceptance: "51.2%", timeLimitMs: 1000,
    description: "Given an array of integers `nums` and an integer `target`, find the two different positions whose values add up to `target`. Exactly one such pair exists.",
    inputFormat: "The first line has `n` and `target`. The second line has `n` integers.",
    outputFormat: "Two indices (0-based), smaller first, separated by a space.",
    tests: [
      { input: "4 9\n2 7 11 15", output: "0 1" },
      { input: "3 6\n3 2 4", output: "1 2" },
      { input: "2 6\n3 3", output: "0 1" },
      { input: "5 -3\n-1 -2 4 8 0", output: "0 1" },
      bigTwoSum,
    ],
    solutions: {
      js: `const [h, a] = require("fs").readFileSync(0, "utf8").split("\\n");\nconst target = Number(h.split(" ")[1]);\nconst nums = a.split(" ").map(Number);\nconst seen = new Map();\nfor (let i = 0; i < nums.length; i++) {\n  const j = seen.get(target - nums[i]);\n  if (j !== undefined) { console.log(j + " " + i); break; }\n  seen.set(nums[i], i);\n}\n`,
      python: `import sys\n\nh, a = sys.stdin.read().split("\\n")[:2]\ntarget = int(h.split()[1])\nnums = list(map(int, a.split()))\nseen = {}\nfor i, x in enumerate(nums):\n    if target - x in seen:\n        print(seen[target - x], i)\n        break\n    seen[x] = i\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  int n; long long t;\n  cin >> n >> t;\n  vector<long long> a(n);\n  for (auto &x : a) cin >> x;\n  unordered_map<long long, int> seen;\n  for (int i = 0; i < n; i++) {\n    auto it = seen.find(t - a[i]);\n    if (it != seen.end()) { cout << it->second << " " << i; return 0; }\n    seen[a[i]] = i;\n  }\n}\n`,
    },
  },
  {
    id: "valid-palindrome", title: "Valid Palindrome", difficulty: "Easy", tags: ["String", "Two Pointers"], acceptance: "46.8%", timeLimitMs: 1000,
    description: "After lowercasing a string and removing every character that is not a letter or digit, does it read the same forwards and backwards?",
    inputFormat: "One line containing the string.",
    outputFormat: "`true` or `false`.",
    tests: [
      { input: "A man, a plan, a canal: Panama", output: "true" },
      { input: "race a car", output: "false" },
      { input: "0P", output: "false" },
      { input: "a.", output: "true" },
      { input: "Was it a car or a cat I saw?", output: "true" },
    ],
    solutions: {
      js: `const s = require("fs").readFileSync(0, "utf8").split("\\n")[0].toLowerCase().replace(/[^a-z0-9]/g, "");\nconsole.log(s === [...s].reverse().join(""));\n`,
      python: `s = "".join(c for c in input().lower() if c.isalnum())\nprint(str(s == s[::-1]).lower())\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  string line, s;\n  getline(cin, line);\n  for (char c : line) if (isalnum((unsigned char)c)) s += tolower(c);\n  string r(s.rbegin(), s.rend());\n  cout << (s == r ? "true" : "false");\n}\n`,
    },
  },
  {
    id: "fizz-buzz", title: "Fizz Buzz", difficulty: "Easy", tags: ["Math", "String"], acceptance: "69.9%", timeLimitMs: 1000,
    description: "Print the numbers from 1 to `n`, one per line. For multiples of 3 print `Fizz`, for multiples of 5 print `Buzz`, and for multiples of both print `FizzBuzz`.",
    inputFormat: "One integer `n`.",
    outputFormat: "`n` lines.",
    tests: [
      { input: "3", output: fizz(3) },
      { input: "5", output: fizz(5) },
      { input: "15", output: fizz(15) },
      { input: "1", output: "1" },
      { input: "100000", output: fizz(100000) },
    ],
    solutions: {
      js: `const n = Number(require("fs").readFileSync(0, "utf8").trim());\nconst out = [];\nfor (let i = 1; i <= n; i++) out.push(i % 15 ? (i % 3 ? (i % 5 ? i : "Buzz") : "Fizz") : "FizzBuzz");\nconsole.log(out.join("\\n"));\n`,
      python: `n = int(input())\nprint("\\n".join("FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else str(i) for i in range(1, n + 1)))\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  int n; cin >> n;\n  for (int i = 1; i <= n; i++) {\n    if (i % 15 == 0) cout << "FizzBuzz";\n    else if (i % 3 == 0) cout << "Fizz";\n    else if (i % 5 == 0) cout << "Buzz";\n    else cout << i;\n    cout << "\\n";\n  }\n}\n`,
    },
  },
  {
    id: "max-subarray", title: "Maximum Subarray", difficulty: "Medium", tags: ["Array", "DP"], acceptance: "50.4%", timeLimitMs: 1000,
    description: "Find the contiguous, non-empty subarray with the largest sum and print that sum.",
    inputFormat: "The first line has `n`. The second line has `n` integers.",
    outputFormat: "One integer: the largest subarray sum.",
    tests: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6" },
      { input: "1\n1", output: "1" },
      { input: "5\n5 4 -1 7 8", output: "23" },
      { input: "3\n-3 -2 -1", output: "-1" },
      bigKadane,
    ],
    solutions: {
      js: `const [, a] = require("fs").readFileSync(0, "utf8").split("\\n");\nlet best = -Infinity, cur = 0;\nfor (const x of a.split(" ").map(Number)) { cur = Math.max(x, cur + x); best = Math.max(best, cur); }\nconsole.log(best);\n`,
      python: `import sys\n\n_, a = sys.stdin.read().split("\\n")[:2]\nbest, cur = float("-inf"), 0\nfor x in map(int, a.split()):\n    cur = max(x, cur + x)\n    best = max(best, cur)\nprint(best)\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  int n; cin >> n;\n  long long best = LLONG_MIN, cur = 0;\n  for (int i = 0; i < n; i++) {\n    long long x; cin >> x;\n    cur = max(x, cur + x);\n    best = max(best, cur);\n  }\n  cout << best;\n}\n`,
    },
  },
  {
    id: "climb-stairs", title: "Climbing Stairs", difficulty: "Medium", tags: ["DP", "Math"], acceptance: "52.1%", timeLimitMs: 1000,
    description: "You can climb 1 or 2 steps at a time. How many distinct ways are there to reach step `n`?",
    inputFormat: "One integer `n` (1 <= n <= 45).",
    outputFormat: "One integer: the number of ways.",
    tests: [
      { input: "2", output: "2" },
      { input: "3", output: "3" },
      { input: "10", output: "89" },
      { input: "1", output: "1" },
      { input: "45", output: "1836311903" },
    ],
    solutions: {
      js: `const n = Number(require("fs").readFileSync(0, "utf8").trim());\nlet a = 1, b = 1;\nfor (let i = 1; i < n; i++) [a, b] = [b, a + b];\nconsole.log(b);\n`,
      python: `n = int(input())\na, b = 1, 1\nfor _ in range(n - 1):\n    a, b = b, a + b\nprint(b)\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  int n; cin >> n;\n  long long a = 1, b = 1;\n  for (int i = 1; i < n; i++) { long long t = a + b; a = b; b = t; }\n  cout << b;\n}\n`,
    },
  },
];

// What the browser is allowed to see. No hidden tests. Solutions only in dev.
export function publicProblems({ withSolutions }) {
  return problems.map((p) => ({
    id: p.id, title: p.title, difficulty: p.difficulty, tags: p.tags, acceptance: p.acceptance, timeLimitMs: p.timeLimitMs,
    description: p.description, inputFormat: p.inputFormat, outputFormat: p.outputFormat,
    examples: p.tests.slice(0, 2),
    starters: STARTERS,
    ...(withSolutions ? { solutions: p.solutions } : {}),
  }));
}
export const SAMPLE_COUNT = 2;
