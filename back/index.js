import fs from "fs";
import scrapeReddits from "./scrape.js";
import express from "express";

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
  await scrapeReddits(["stories", "funnystories"]).then(async (scrapedData) => {
    const filePath = "data.json";

    // console.log(scrapedData);

    await saveToJSON(scrapedData, filePath);

    const data = await readFromJSON(filePath);

    const posts = getPosts(data);

    console.log(posts);
  });
}

// main();

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/posts", (req, res) => {
  const data = readFromJSON("data.json");
  const posts = getPosts(data);

  console.log(posts);
  res.send(posts);
  return;
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
