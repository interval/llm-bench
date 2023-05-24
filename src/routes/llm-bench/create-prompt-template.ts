import { Action, io, ctx } from "@interval/sdk";
import { z } from "zod";
import { createPromptTemplate } from "../../utils/shared";

export default new Action({
  name: "➕ Create prompt",
  handler: async () => {
    const promptTemplate = await createPromptTemplate();
    return "All done";
  },
});
