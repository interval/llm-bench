import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

const temperature = 0;
const max_tokens = 150;

const legacyModels = [
  "text-ada-001",
  "text-babbage-001",
  "text-curie-001",
  "text-davinci-002",
  "text-davinci-003",
];

export const openaiModels = [
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0301",
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  ...legacyModels,
];

async function hitAPI(): Promise<any> {}

export const createCompletion = async (systemPrompt, inputPrompt, model) => {
  let output = null;
  let error = null;
  let startTime = Date.now();

  try {
    if (legacyModels.includes(model)) {
      const response = await openai.createCompletion({
        model,
        prompt: `${systemPrompt}\n\n${inputPrompt}`,
        temperature,
        max_tokens,
      });
      console.log("OPENAI RESPONSE", response.data);
      output = response.data.choices[0].text;
    } else {
      // gpt-3.5-turbo doesn't listen to 'system'
      const system_role = model.includes("gpt-3.5-turbo") ? "user" : "system";
      const messages: ChatCompletionRequestMessage[] = [
        {
          role: system_role,
          content: systemPrompt,
        },
        {
          role: "user",
          content: inputPrompt,
        },
      ];

      const completion = await openai.createChatCompletion({
        model,
        messages,
        max_tokens,
      });

      console.log("OPENAI RESPONSE", completion.data.choices);
      output = completion.data.choices[0].message.content;
    }
  } catch (e) {
    if (e.response?.status) {
      const data = e.response.data;
      error = data.error?.message || data.error?.code || JSON.stringify(data);
      console.error(e.response.status, e.message, e.response);
    } else {
      error = e.message;
      console.error("An error occurred during OpenAI request", e);
    }
  }

  return {
    output,
    error,
    durationMs: error ? null : Date.now() - startTime,
  };
};
