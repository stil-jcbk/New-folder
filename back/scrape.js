import { By, Builder, Browser, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

async function cleanPosts(POSTS) {
  let list = [];
  for (let i = 0; i < POSTS.length; i++) {
    const post = POSTS[i];
    await post.getAttribute("class").then((classList) => {
      let len = String(classList).length;
      if (len < 200) {
        list.push(post);
      }
    });
  }

  return list;
}

async function readPost(tempid) {
  console.log("Id: " + tempid);
  const options = new chrome.Options();
  options.excludeSwitches("enable-logging");
  options.addArguments("--headless");

  const Thedriver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  let post = {
    id: "",
    title: "",
    text: "",
    reddit: "",
  };

  let id = await tempid.substring(3);
  let url = `https://www.reddit.com/r/stories/comments/${id}`;
  await Thedriver.get(url);

  await Thedriver.wait(
    until.elementLocated(By.id(`${tempid}-post-rtjson-content`), 10 * 1000)
  ).then(console.log("located"));

  const postTitle = await Thedriver.findElement(By.id(`post-title-${tempid}`));

  const postText = await Thedriver.findElement(
    By.id(`${tempid}-post-rtjson-content`)
  );
  post.title = await postTitle.getText();
  post.text = await postText.getText();
  post.id = tempid;
  await Thedriver.close();
  return post;
}

async function scrape(reddit) {
  let posts = {
    reddit: reddit,
    posts: [],
  };

  const options = new chrome.Options();
  options.addArguments("--window-size=1920,1080");
  options.addArguments("--headless");
  options.addArguments("--disable-gpu");
  options.addArguments(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36"
  );
  options.excludeSwitches("enable-logging");
  // options.addArguments("--headless");
  // options.addArguments("--disable-gpu");

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  await driver.get(`https://www.reddit.com/r/${reddit}/top/?t=day`);

  //change view
  await driver.findElement(By.className("icon-view_card")).click();
  await driver.findElement(By.className("icon-view_compact")).click();

  await driver
    .wait(until.elementLocated(By.className("Post"), 10 * 1000))
    .then(console.log("located"));
  // get elements
  const tempPOSTS = await driver.findElements(By.className("Post"));

  var POSTS = await cleanPosts(tempPOSTS);

  //read posts
  let k = 5;
  if (POSTS.length < 5) {
    k = POSTS.length;
  }
  for (let i = 0; i < k; i++) {
    let tempid = await POSTS[i].getAttribute("id");
    let post = await readPost(tempid, driver);
    post.reddit = reddit;
    posts.posts.push(post);
  }

  // console.log(posts);
  await driver.close();
  return posts;
}

export default async function scrapeReddits(reddits) {
  let j = [];
  for (let i = 0; i < reddits.length; i++) {
    await j.push(await scrape(reddits[i]));
  }
  return j;
}
