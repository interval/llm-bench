import { Action, io, ctx } from "@interval/sdk";
import { requireBenchmark } from "../../utils/shared";
import prisma from "../../prisma";

export default new Action({
  name: "➕ Add example",
  unlisted: true,
  handler: async () => {
    const benchmark = await requireBenchmark();

    const inputs = Object.keys(benchmark.input_schema["properties"]).map(
      key => {
        const property = benchmark.input_schema["properties"][key];
        if (property.type === "number") {
          return io.input.number(key, { helpText: property.description });
        } else if (property.type === "string") {
          return io.input.text(key, { helpText: property.description });
        } else if (property.type === "boolean") {
          return io.input.boolean(key, { helpText: property.description });
        } else if (property.type === "date") {
          return io.input.datetime(key, { helpText: property.description });
        }
      }
    );

    const humanEval = benchmark.eval_method === "human";

    const outputs = Object.keys(benchmark.output_schema["properties"]).map(
      key => {
        const property = benchmark.output_schema["properties"][key];
        if (property.type === "number") {
          return io.input
            .number(key, { helpText: property.description })
            .optional(humanEval);
        } else if (property.type === "string") {
          return io.input
            .text(key, { helpText: property.description })
            .optional(humanEval);
        } else if (property.type === "boolean") {
          return io.input
            .boolean(key, { helpText: property.description })
            .optional(humanEval);
        } else if (property.type === "date") {
          return io.input
            .datetime(key, { helpText: property.description })
            .optional(humanEval);
        }
      }
    );

    let allDone = false;
    let exampleCount = 0;
    let includeInstructions = true;

    while (!allDone) {
      const instructions = includeInstructions
        ? [
            io.display.markdown(
              `# What's an example?\n\n**An example is a single standalone test of behavior that you want from your LLM**. It could be answering a specified question, classifying, summarizing, or completing provided input, or something more complicated.\n\nExamples consists of a set of input variables for a task, and their corresponding expected output variables.\n\nYou're adding examples for the **${benchmark.name}** benchmark. Examples must conform to the schema below.`
            ),
          ]
        : [];
      includeInstructions = false;

      const { choice, returnValue } = await io
        .group([
          ...instructions,
          io.display.heading(`${benchmark.name} inputs`),
          ...inputs,
          io.display.heading(`${benchmark.name} expected outputs`),
          ...outputs,
        ])
        .withChoices(["Save", "Save and add another"]);

      const inputValues = returnValue.slice(
        1 + instructions.length,
        1 + instructions.length + inputs.length
      );
      const outputValues = returnValue.slice(
        2 + instructions.length + inputs.length,
        2 + instructions.length + inputs.length + outputs.length
      );
      const inputObject = {};
      const outputObject = {};

      inputValues.forEach((value, index) => {
        inputObject[Object.keys(benchmark.input_schema["properties"])[index]] =
          value;
      });

      outputValues.forEach((value, index) => {
        outputObject[
          Object.keys(benchmark.output_schema["properties"])[index]
        ] = value;
      });

      await prisma.examples.create({
        data: {
          benchmark: benchmark.id,
          inputs: inputObject,
          expected_outputs: outputObject,
        },
      });

      exampleCount++;
      await io.display.markdown(`## ✅ Example added!`);

      if (choice === "Save") {
        allDone = true;
      }
    }

    return `Added ${exampleCount} examples to ${benchmark.name}`;
  },
});
