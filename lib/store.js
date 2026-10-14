// Tiny JSON-file database for accounts. Fine for a hobby deployment;
// swap for Postgres if you outgrow it. Writes are atomic (tmp + rename).
import fs from "node:fs";
import path from "node:path";

export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "db.json");
  let db = { users: {} };

  try {
    db = JSON.parse(fs.readFileSync(file, "utf8"));
    db.users ||= {};
  } catch (err) {
    if (err.code !== "ENOENT") console.error("[store] could not read db.json, starting empty:", err.message);
  }

  let timer = null;
  let writing = false;
  let dirty = false;

  function flush() {
    if (writing) {
      dirty = true;
      return;
    }
    writing = true;
    dirty = false;
    const tmp = file + ".tmp";
    fs.writeFile(tmp, JSON.stringify(db), (err) => {
      if (err) {
        writing = false;
        console.error("[store] write failed:", err.message);
        return;
      }
      fs.rename(tmp, file, (err2) => {
        writing = false;
        if (err2) console.error("[store] rename failed:", err2.message);
        if (dirty) flush();
      });
    });
  }

  function flushSync() {
    clearTimeout(timer);
    try {
      fs.writeFileSync(file + ".tmp", JSON.stringify(db));
      fs.renameSync(file + ".tmp", file);
    } catch (err) {
      console.error("[store] sync write failed:", err.message);
    }
  }

  return {
    getUser: (name) => db.users[String(name).toLowerCase()] || null,
    createUser(name, record) {
      const key = String(name).toLowerCase();
      if (db.users[key]) return null;
      db.users[key] = { name, created: Date.now(), settings: null, ...record };
      this.save();
      return db.users[key];
    },
    deleteUser(name) {
      delete db.users[String(name).toLowerCase()];
      this.save();
    },
    count: () => Object.keys(db.users).length,
    save() {
      clearTimeout(timer);
      timer = setTimeout(flush, 250);
    },
    flushSync,
  };
}
