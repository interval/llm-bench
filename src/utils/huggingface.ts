import fetch from "node-fetch";

export const huggingfaceModels = [
  // "openaccess-ai-collective/manticore-13b",
  "tiiuae/falcon-7b-instruct",
];

export const createCompletion = async (model, systemPrompt, inputPrompt) => {
  let output = null;
  let error = null;
  let startTime = Date.now();

  try {
    const response = await fetch(process.env.LLM_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: `${systemPrompt}\n\n${inputPrompt}`,
      }),
    });
    const data = await response.json();
    console.log("HUGGINGFACE MODEL RESPONSE", data);
    output = data["completion"];
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
