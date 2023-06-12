import fs from "fs";
import scrapeReddits from "./scrape.js";
import express from "express";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3").verbose();

//connecting to db
const db = new sqlite3.Database("./test.db", sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.error(err.message);
});

function createTable(tableName, params) {
  let sql = `CREATE TABLE ${tableName}(id INTEGER PRIMARY KEY, ${params})`;
  db.run(sql);
}
// createTable("users", ["username", "pin", "doing", "done"]);
// createTable("posts", ["pid", "subr", "title", "text", "status", "user"]);
function dropTable(tableName) {
  db.run(`DROP TABLE ${tableName}`);
}
// dropTable("posts");

function addUser(username, pin) {
  let sql = `SELECT * FROM users`;
  db.all(sql, [], (err, rows) => {
    if (err) return console.error(err.message);
    if (rows.length == 0) {
      sql = `INSERT INTO users(username, pin, doing, done) VALUES (?,?,0,0)`;
      db.run(sql, [username, pin], (err) => {
        if (err) return console.error(err.message);
      });
      return;
    }

    let occupied = false;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].username === username) {
        occupied = true;
        break;
      }
    }
    if (!occupied) {
      sql = `INSERT INTO users(username, pin, doing, done) VALUES (?,?,0,0)`;
      db.run(sql, [username, pin], (err) => {
        if (err) return console.error(err.message);
      });
    } else {
      console.log("OCCUPIED");
    }
  });
}
// addUser("stil", "2115");

function addPost(pid, subr, title, text) {
  let sql = `SELECT * FROM posts WHERE pid=?`;
  db.all(sql, [pid], (err, rows) => {
    if (err) return console.error(err.message);
    console.log(rows);
    if (rows.length == 0) {
      let sql = `INSERT INTO posts(pid, subr, title, text, status) VALUES (?,?,?,?, 0)`;
      db.run(sql, [pid, subr, title, text], (err) => {
        if (err) return console.error(err.message);
      });
      return;
    }
    let exists = false;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].subr === subr) {
        exists = true;
      }
    }
    if (!exists) {
      let sql = `INSERT INTO posts(pid, subr, title, text, status) VALUES (?,?,?,?, 0)`;
      db.run(sql, [pid, subr, title, text], (err) => {
        if (err) return console.error(err.message);
      });
      return;
    } else {
      console.log("ALREADY EXISTS");
    }
  });
}
// addPost("asdd", "asdd", "Asdf", "Asdf");

function updatePost(what, new_, pid, subr) {
  let sql = `UPDATE posts SET ${what} = ? WHERE pid = ? AND subr = ?`;
  db.run(sql, [new_, pid, subr], (err) => {
    if (err) return console.error(err.message);
  });
}
// updatePost("title", "amazing story", "asdd", "asdf");

function updateUser(what, new_, name) {
  let sql = `UPDATE users SET ${what} = ? WHERE username = ?`;
  db.run(sql, [new_, name], (err) => {
    if (err) return console.error(err.message);
  });
}
// updateUser("pin", "0001", "admin");

function readPosts(status, callback) {
  let sql = `SELECT * FROM posts WHERE status=?`;
  db.all(sql, [status], (err, rows) => {
    if (err) return console.error(err.message);
    callback(rows);
  });
}
// readPosts();

function readPicked(user, callback) {
  let sql = `SELECT * FROM posts WHERE status=4 AND user=?`;
  db.all(sql, [user], (err, rows) => {
    if (err) return console.error(err.message);
    callback(rows);
  });
}

function getUser(username, callback) {
  let sql = `SELECT * FROM users WHERE username=?`;
  db.all(sql, [username], (err, rows) => {
    let is = false;
    if (rows.length == 1) {
      is = true;
    }
    callback(is);
  });
}

function login(username, pin, callback) {
  let sql = `SELECT * FROM users WHERE username=? AND pin=?`;
  db.all(sql, [username, pin], (err, rows) => {
    let is = false;
    if (rows.length == 1) {
      is = true;
    }
    callback(is);
  });
}

function saveToJSON(data, filePath) {
  let existingData = {};

  try {
    existingData = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    // If the file doesn't exist, do nothing and create a new file later
  }

  for (const subreddit in data) {
    console.log(data[subreddit].reddit);
    if (existingData.hasOwnProperty(subreddit)) {
      // Append new posts to the existing subreddit, avoiding duplicates
      const existingPosts = new Set(
        existingData[subreddit].posts.map((post) => post.id)
      );
      const newPosts = data[subreddit].posts.filter(
        (post) => !existingPosts.has(post.id)
      );
      existingData[subreddit].posts.push(...newPosts);
    } else {
      // Add new subreddit and its posts to the existing data
      existingData[subreddit] = data[subreddit];
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 4));
}

function readFromJSON(filePath) {
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

function deletePostById(filePath, subreddit, postId) {
  let data = readFromJSON(filePath);

  if (data.hasOwnProperty(subreddit)) {
    const posts = data[subreddit].posts;
    const index = posts.findIndex((post) => post.id === postId);
    if (index !== -1) {
      posts.splice(index, 1);
      saveToJSON(data, filePath);
      console.log(`Post with ID ${postId} deleted successfully.`);
    } else {
      console.log(
        `Post with ID ${postId} not found in the subreddit ${subreddit}.`
      );
    }
  } else {
    console.log(`Subreddit ${subreddit} not found.`);
  }
}

function getPosts(data) {
  let posts = [];

  for (const subreddit in data) {
    // console.log(subreddit);
    // console.log(subreddit);
    for (const post in data[subreddit].posts) {
      posts.push(data[subreddit].posts[post]);
    }
  }

  return posts;
}

async function main() {
  await scrapeReddits(["StoriesFromYourSchool", "cheating_stories"]).then(
    (scrapedData) => {
      const posts = getPosts(scrapedData);
      for (let i = 0; i < posts.length; i++) {
        let pid = posts[i].id;
        let subr = posts[i].reddit;
        let title = posts[i].title;
        let text = posts[i].text;
        addPost(pid, subr, title, text);
      }
    }
  );
}

// main();

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/api/posts", (req, res) => {
  readPosts(0, (posts) => {
    // console.log(posts);
    res.send(posts);
    return;
  });
});

app.get("/api/posts/approved", (req, res) => {
  readPosts(1, (posts) => {
    console.log(posts);
    res.send(posts);
    return;
  });
});

app.get("/api/posts/picked", (req, res) => {
  let user = req.header("username");
  readPicked(user, (posts) => {
    console.log(posts);
    res.send(posts);
    return;
  });
});

app.post("/api/posts/approve", (req, res) => {
  let pid = req.header("pid");
  let subr = req.header("subr");
  updatePost("status", 1, pid, subr);

  res.send(200);
  return;
});

app.post("/api/posts/reject", (req, res) => {
  let pid = req.header("pid");
  let subr = req.header("subr");
  updatePost("status", 2, pid, subr);

  res.send(200);
  return;
});

app.post("/api/posts/pick", (req, res) => {
  let pid = req.header("pid");
  let subr = req.header("subr");
  let username = req.header("username");
  updatePost("status", 4, pid, subr);
  updatePost("user", username, pid, subr);
  res.send(200);
  return;
});

app.post("/api/posts/finish", (req, res) => {
  let pid = req.header("pid");
  let subr = req.header("subr");
  updatePost("status", 5, pid, subr);
  res.send(200);
  return;
});

app.get("/api/user", (req, res) => {
  const user = req.header("user");
  console.log(user);
  getUser(user, (is) => {
    console.log(is);
    if (is) {
      res.send(true);
      return;
    }
    res.send(false);
    return;
  });
});

app.get("/api/user/login", (req, res) => {
  const username = req.header("username");
  const pin = req.header("pin");
  login(username, pin, (is) => {
    console.log(is);
    if (is) {
      res.send(200);
      return;
    }
    res.send(400);
    return;
  });
});

app.get("/api/user/register", (req, res) => {
  const username = req.header("username");
  const pin = req.header("pin");
  getUser(username, (is) => {
    if (is) {
      res.send(400);
      return;
    } else {
      addUser(username, pin);
      res.send(200);
      return;
    }
  });
});

app.get("/delete", (req, res) => {
  const id = req.headers.story_id;
  if (!id) {
    res.send("error");
    return;
  }

  deletePostById("data.js");

  return;
});

const port = 8000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
