import { Action, io, ctx } from "@interval/sdk";
import { z } from "zod";
import { requireBenchmark } from "../../utils/shared";
import prisma from "../../prisma";
import { EvalMethod } from "@prisma/client";

export default new Action({
  name: "➕ Create benchmark",
  handler: async () => {
    const [_, name] = await io.group([
      io.display.markdown(
        `**A benchmark is a collection tasks for measuring the performance of large language models and different prompts for them**.\n\nThey are made up of a set of examples, each specifying one possible input for the task and the expected outputs for that input. Usually you might fiddle around with a prompt, checking how it works against one or two examples. You can think of a benchmark as a more comprehensive version of that, like a suite of potenially hundreds of "integration tests" to confirm that changing your model or prompts doesn't break the behaviors you care about. You can use them to learn about overall task performance, where your models and prompts fall short, and generally just to gain confidence that LLMs are doing what you want.\n\nThis tool will walk you through creating a benchmark that you can build up over time.`
      ),
      io.input
        .text("Benchmark name", {
          helpText:
            "Just used for finding it in this dashboard. Must be unique.",
        })
        .validate(async value => {
          const data = await prisma.benchmarks.findFirst({
            where: {
              name: value,
            },
            select: {
              id: true,
            },
          });

          if (data) {
            return "A benchmark already exists with this name";
          }
        }),
    ]);

    const [_evalMarkdown, evalMethod] = await io.group([
      io.display.markdown(
        `**How should the the LLM's completions be evaluated for this benchmark?**\n\nLLM Bench allows you to evaluate the behavior of a language model, but depending on the nature of your task, _how_ the outputs are evaluated is up to you. Currently two methods are supported:\n\n* **String equality**: Output variables must exactly match the expectations defined in examples (automatic, ideal for classification and multiple choice tasks)\n* **Human**: A human should rate the outputs as successful or not (manual, more flexible)`
      ),
      io.select.single("Evaluation method", {
        options: [
          { label: "String equality", value: "equality" },
          { label: "Human evaluation", value: "human" },
        ],
      }),
    ]);

    const inputSchemaProps = {};
    const outputSchemaProps = {};
    let allDoneInput = false;
    let allDoneOutput = false;

    while (!allDoneInput) {
      const {
        choice,
        returnValue: [_, varName, description, varType],
      } = await io
        .group([
          io.display.markdown(
            "### Input schema\n\nYour benchmark requires specifying what the input should look like for each example. LLM Bench will validate each example matches the schema.\n\nIn the simplest form, each example in the benchmark might contain a string `question` input which the LLM would be expected to answer. But the input schema could also contain multiple variables. For example, a task to summarize a news article could have input variables `articleTitle` and `articleContent`.\n\nHere you can specify what input variables your examples should contain. If you set the type for these inputs, each example in the benchmark will be validated to conform to it."
          ),
          io.input
            .text("Variable name", {
              helpText:
                "Used to uniquely refer to this input when you construct what your prompt. Can only contain letters and underscores.",
            })
            .validate(value => {
              if (!/^[a-zA-Z_]+$/.test(value))
                return "Can only contain letters and underscores";
              if (inputSchemaProps[value])
                return "An output variable with this name already exists";
            }),
          io.input
            .text("Description", {
              helpText:
                "Brief explanation of what this input is for, to remind you as you construct prompts.",
            })
            .optional(),
          io.select.single("Type", {
            options: ["string", "number", "boolean", "date"],
            defaultValue: "string",
            helpText:
              "Change this from string if you want to validate that the input confirms to some other type.",
          }),
          // TODO would be nice, but Interval needs .multiple() for this to work
          // io.input.boolean("Input is a list of this type?"),
        ])
        .withChoices(["Set input schema", "Add another input"]);

      inputSchemaProps[varName] = {
        type: varType,
        description: description,
      };

      if (choice === "Set input schema") {
        allDoneInput = true;
      }
    }

    while (!allDoneOutput) {
      const {
        choice,
        returnValue: [_, varName, description, varType],
      } = await io
        .group([
          io.display.markdown(
            "### Output schema\n\nLikewise, you must specify the schema for the expected output of each example in the benchmark, or the format of the value(s) that the LLM will be expected to produce. Each example will specify the expected outputs, and must conform to this schema.\n\nWhen a LLM is run against your examples, LLM Bench will validate that its outputs conforms to the schema."
          ),
          io.input
            .text("Variable name", {
              helpText:
                "Unique identifier for this output variable. LLMs will be instructed to produce JSON, and this will be the key for the output variable.",
            })
            .validate(value => {
              if (!/^[a-zA-Z_]+$/.test(value))
                return "Can only contain letters and underscores";
              if (outputSchemaProps[value])
                return "An output variable with this name already exists";
            }),
          io.input
            .text("Description", {
              helpText:
                "By default this will be exposed to the LLM to describe the expected output. (You'll be able to edit your prompts if you don't want this)",
            })
            .optional(),
          io.select.single("Type", {
            options: ["string", "number", "boolean", "date"],
            defaultValue: "string",
            helpText:
              "Change this from string if you want to validate that the output confirms to some other type.",
          }),
        ])
        .withChoices(["Set output schema", "Add another input"]);

      outputSchemaProps[varName] = {
        type: varType,
        description: description,
      };

      if (choice === "Set output schema") {
        allDoneOutput = true;
      }
    }

    const data = await prisma.benchmarks.create({
      data: {
        name,
        eval_method: evalMethod.value as EvalMethod,
        input_schema: {
          type: "object",
          properties: inputSchemaProps,
        },
        output_schema: {
          type: "object",
          properties: outputSchemaProps,
        },
      },
    });

    await io.display
      .markdown(`## ✅ Benchmark created!`)
      .withChoices(["Add some examples"]);

    await ctx.redirect({
      action: "llm-bench/add-example",
      params: { id: data.id },
    });

    return "All done";
  },
});
