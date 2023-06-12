import {
  createCompletion as createOpenAICompletion,
  openaiModels,
} from "./openai";
import {
  createCompletion as createCohereCompletion,
  cohereModels,
} from "./cohere";
import {
  createCompletion as createHFCompletion,
  huggingfaceModels,
} from "./huggingface";

export const AVAILABLE_MODELS = {
  ...huggingfaceModels.reduce((acc, model) => {
    acc[model] = createHFCompletion;
    return acc;
  }, {}),
  ...openaiModels.reduce((acc, model) => {
    acc[model] = createOpenAICompletion;
    return acc;
  }, {}),
  ...cohereModels.reduce((acc, model) => {
    acc[model] = createCohereCompletion;
    return acc;
  }, {}),
};
