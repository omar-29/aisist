import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Configuration, OpenAIApi } from "openai";
import axios from "axios";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
async function getWikipediaSummary(topic) {
  try {
    const response = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`,
      {
        headers: {
          "User-Agent": "AIsist/1.0.0",
        },
      }
    );
    return response.data.extract;
  } catch (error) {
    console.error(error);
  }
}
async function getTopHeadlines(topic) {
  try {
    const response = await axios.get("https://newsapi.org/v2/top-headlines", {
      params: {
        q: topic,
        apiKey: process.env.NEWS_API_KEY,
        pageSize: 5, // retrieve the top 5 headlines
      },
    });
    return response.data.articles;
  } catch (error) {
    console.error(error);
  }
}

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.status(200).send({
    message: "Hello from CodeX!",
  });
});

app.post("/", async (req, res) => {
  function extractTopicFromPrompt(prompt) {
    return prompt.replace("search for", "").trim();
  }
  function extractNewsTopicFromPrompt(prompt) {
    return prompt.replace("search news for", "").trim();
  }
  function generateSummary(articles) {
    let summary = "";
    for (const article of articles) {
      if (typeof article.description !== "undefined") {
        summary += `${article.title}: ${article.description}\n${article.url}\n`;
      } else {
        summary += `${article.title}\n${article.url}\n`;
      }
    }
    return summary;
  }

  try {
    const prompt = req.body.prompt;
    if (prompt.startsWith("search for")) {
      const topic = extractTopicFromPrompt(prompt);
      const summary = await getWikipediaSummary(topic);

      res.status(200).send({
        bot: summary,
      });
    } else if (prompt.startsWith("search news for")) {
      const topic = extractNewsTopicFromPrompt(prompt);
      const articles = await getTopHeadlines(topic);
      const summary = generateSummary(articles);

      if (summary === "") {
        res.status(200).send({
          bot: "No articles were found for the specified topic.",
        });
      } else {
        res.status(200).send({
          bot: summary,
        });
      }
    } else {
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `${prompt}`,
        temperature: 0,
        max_tokens: 3000,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0,
      });

      res.status(200).send({
        bot: response.data.choices[0].text,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error || "Something went wrong");
  }
});

app.listen(5000, () =>
  console.log("AI server started on http://localhost:5000")
);

