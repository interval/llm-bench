import fetch from "node-fetch";

export const cohereModels = [
  "cohere/command",
  "cohere/command-light",
  "cohere/base",
  "cohere/base-light",
];

export const createCompletion = async (model, systemPrompt, inputPrompt) => {
  let output = null;
  let error = null;
  let startTime = Date.now();

  try {
    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.COHERE_KEY,
      },
      body: JSON.stringify({
        model: model.replace("cohere/", ""),
        prompt: `${systemPrompt}\n\n${inputPrompt}`,
        max_tokens: 150,
        truncate: "END",
        temperature: 0,
      }),
    });
    const data = await response.json();
    console.log("COHERE MODEL RESPONSE", data);
    if (data["generations"]) {
      output = data["generations"][0]["text"];
    } else {
      error = JSON.stringify(data);
    }
  } catch (e) {
    if (e.response?.status) {
      const data = e.response.data;
      error = data.error?.message || data.error?.code || JSON.stringify(data);
      console.error(e.response.status, e.message, e.response);
    } else {
      error = e.message;
      console.error("Completion request failed", e);
    }
  }

  return {
    output,
    error,
    durationMs: error ? null : Date.now() - startTime,
  };
};
