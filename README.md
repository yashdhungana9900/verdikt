# Verdikt

An online judge that feels like a premium developer tool, in the same league as Linear, Vercel, and Raycast.

## Run it

```bash
npm install
npm run judge:pull   # once: downloads the sandbox images and builds a fast C++ one (several minutes, about 1.3 GB)
npm run dev          # starts the database, the server (:3001) and the website (:5173)
```

Open http://localhost:5173. Docker Desktop must be running. The first run downloads the PostgreSQL image (about 100 MB).

No Docker? `npm run dev:local` runs code directly on your machine. It needs Node, Python (`python` on Windows) and g++ installed. It has **no isolation**, so use it for development only.

## Accounts and data

- **PostgreSQL 16** runs in Docker (`docker-compose.yml`, port 5440). Tables are created automatically on first use: `users`, `sessions`, `submissions`.
- **Passwords** are hashed with scrypt. **Sessions** are random tokens stored hashed in the database and sent in an HttpOnly cookie.
- **Run** is free for everyone. **Submit** needs an account, and every submission (with your code) is saved.
- **Contest:** a new weekly contest starts every Monday 00:00 UTC. Standings are computed in SQL: most problems solved first, then lowest penalty (minutes to each first Accepted, plus 20 for every wrong attempt before it).
- Connect elsewhere with `DATABASE_URL`. Set `NODE_ENV=production` for Secure cookies and `DEV_SOLUTIONS=0` to hide reference solutions.

## How judging works

```
Browser  --POST /api/submissions-->  Judge server  -->  Docker sandbox
(Monaco)  <---- verdict + cases ----  (queue, 2 at once)   compile, then run each test
```

- **Sandbox:** no network, 256 MB memory, 1 CPU, 128 processes, read-only filesystem, all capabilities dropped. Compilation happens in a separate throwaway container.
- **Tests stay on the server.** The browser only gets the two sample tests, so hidden tests can't be read or hard-coded.
- **Speed:** one container per submission that starts while your code compiles, and a single `docker exec` that runs every test. C++ uses a prebuilt image with `<bits/stdc++.h>` precompiled, which makes compiling about 5x faster. Cleanup happens after the verdict is sent.
- **Verdicts:** Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error, Compilation Error. Time limit is 1 s, times 1 for C++, 2 for JavaScript, 3 for Python.
- **Programs read stdin and print to stdout**, like Codeforces. Output is compared ignoring trailing whitespace.

## Deploy

See [DEPLOY.md](DEPLOY.md) for putting Verdikt on a server with HTTPS.

## Design goal (the brief)

Make Verdikt feel like a premium developer tool. A user should open it, solve a problem, and think "this looks like a real product", not "this is a college project."

- **Look:** dark first (`#0A0A0B`), light theme as a bonus, soft borders, one violet accent. Inter for UI, JetBrains Mono for code.
- **Verdict colors:** Accepted green, Wrong Answer red, Time Limit Exceeded amber, Runtime Error orange, Compilation Error purple, Pending pulsing grey. Glowing badges, scale-in result, confetti on Accepted.
- **Quality bar:** skeletons instead of blank screens, smooth transitions, usable on mobile, human error and empty states, fast first load.

## Structure

```
server/
  index.js       HTTP API, routes, rate limits, contest standings
  db.js          PostgreSQL connection and schema
  auth.js        password hashing and sessions
  judge.js       sandbox runner, verdicts, queue
  problems.js    problems and tests (add yours here)
src/
  index.css      design tokens (dark and light)
  lib/           api client, problems hook, stores, theme
  components/    VerdictBadge, ResultSheet, SplitPane, Navbar, CommandPalette
  pages/         Landing, Problems, ProblemPage, Contest
```

## Add a problem

Add an object to `server/problems.js` with `tests: [{ input, output }]`. The first two tests are shown as examples. Put a large input last so slow solutions get Time Limit Exceeded. Add `solutions` only for testing: set `DEV_SOLUTIONS=0` in production so they are never sent to the browser.

## Next steps

1. Email verification and password reset.
2. A real queue (Redis + a separate worker) so the judge scales beyond one machine.
3. A WebSocket feed so the leaderboard updates instantly instead of every 5 seconds.
4. More problems, more languages, custom checkers for problems with several valid answers.
5. Deploy: website on Vercel, judge on a VM with Docker.

## Known limits

- Memory is read from the container's cgroup, so it is an estimate and may be blank on some Docker setups.
- Judging is one container per submission. Fine for a project, not for thousands of users.
