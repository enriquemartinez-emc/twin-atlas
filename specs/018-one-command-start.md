# 018 — Start the whole app with one command

**Status:** In progress | **Branch:** `feat/one-command-start` (stacked on `docs/portfolio-polish`)

## Description

Today the app takes three terminals: the database, the server, the client. One script, `./dev.sh`, starts all three, waits until they answer, prints the address, and stops everything when you press Ctrl+C. Plain bash: no new tool, no new Docker image.

## Acceptance criteria

- [ ] `./dev.sh` starts the database (Docker Compose, waiting until it is healthy), the server and the client, waits until the server and the client answer, and prints the address to open.
- [ ] Ctrl+C (or either service dying) stops the server and the client, including the processes they started, and then the database. No process is left listening on 8080 or 4200.
- [ ] `--keep-db` leaves the database running when the script stops.
- [x] `--check` verifies that the machine can run it (Docker running, JDK 25, a supported Node, free ports, the Maven wrapper) and starts nothing. Every problem is listed in plain words with the fix, not just the first.
- [x] JDK 25 is found on the PATH or in the usual Linux location, so an unset `JAVA_HOME` is not a problem.
- [ ] Client dependencies are installed when they are missing.
- [ ] Logs go to `.run/` (ignored by git). When a service fails to start, the last lines of its log are shown.
- [x] No new dependency of any kind. The README and the client README show the one command, and the three-step way stays documented.
- [x] Verified without running the app: the syntax check, `--check` on this machine, and `--check` with a port deliberately taken.
- [ ] Verified by one real run, started and stopped by the script. Needs the owner's approval to run the app.
- [x] A docs page for the task is written and linked.

## Notes

- Verified without starting the app: `bash -n`; `--check` on this machine (all seven checks pass); `--check` with port 4200 deliberately taken (reports it, exits 1, starts nothing); `--check` with a PATH that has no Docker and no Node (reports both together, finds JDK 25 in the usual folder as the fallback); `--help` and a bad option; running it from other directories.
- A first version of the script used `dirname`. The stripped-PATH test showed a false "mvnw missing", so the path is now computed in plain bash.
- Not verified: everything that starts something. The unticked criteria above (start, wait, stop, `--keep-db`, installing dependencies, failure logs) need one real run, which needs the owner's approval.
- A Docker-only start (`docker compose up` for everything) was not chosen: it needs new images, takes more memory on an 8 GB machine, and slows client reloads.

## Out of scope

- Running the server and client inside Docker. That needs new Docker images (JDK, Node, a web server) and is slower for client development. It would be a separate task.
- Production deployment.
