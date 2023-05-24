import { Action, io, ctx } from "@interval/sdk";
import { z } from "zod";
import { jsonSchemaToZod, jsonFormatInstructions } from "./langchain";
import prisma from "../prisma";

export const createPromptTemplate = async (benchmark = null) => {
  if (!benchmark) {
    benchmark = await requireBenchmark();
  }
  const inputVariables = Object.keys(benchmark.input_schema["properties"]);
  const inputSchemaMarkdown = inputVariables
    .map(key => {
      const property = benchmark.input_schema["properties"][key];
      return `* \`${key}\` -> ${property.description}`;
    })
    .join("\n");

  const outputSchema = jsonSchemaToZod(benchmark.output_schema);
  const formatInstructions = jsonFormatInstructions(outputSchema);

  const [_, name, system_template, input_template] = await io.group([
    io.display.markdown(
      `# Prompt template format\n\nThese templates use [Langchain](https://js.langchain.com/docs/modules/prompts/prompt_templates/) under the hood. Wrap variables in brackets. e.g. the input variable \`someText\` could be used below like \`here is some text: {someText}\`. The following input variables are available for this template:\n\n${inputSchemaMarkdown}\n\nFeel free to experiment with the [Langchain provided JSON Schema instructions]() in the System template, but LLM bench will expect JSON output matching your benchmark schema and fail examples that don't validate.`
    ),
    io.input.text("Template name", {
      helpText: "Just used for finding this template later",
    }),
    io.input.text("System template", {
      multiline: true,
      helpText:
        'Passed as a "system" message for chat based models, otherwise simply prefixes the input template',
      defaultValue: formatInstructions // langhchains format instructions include single curly braces, which are invalid in a template
        .replace(/(?<!{){(?!{)/g, "{{")
        .replace(/(?<!})}(?!})/g, "}}"),
    }),
    io.input
      .text("Input template", {
        multiline: true,
        helpText: 'Passed as a "user" message for chat based models',
      })
      .optional(),
  ]);

  return await prisma.prompt_templates.create({
    data: {
      name,
      system_template,
      input_template,
      benchmark: benchmark.id,
    },
  });
};

export const requireBenchmark = async () => {
  let { id } = z
    .object({
      id: z
        .preprocess(val => parseInt(val as string, 10), z.number())
        .optional(),
    })
    .parse(ctx.params);

  return id ? await loadBenchmark(id) : await selectBenchmark();
};

const loadBenchmark = async (id: number) => {
  const benchmark = await prisma.benchmarks.findUnique({
    where: { id },
    include: {
      _count: {
        select: { examples: true },
      },
    },
  });

  if (!benchmark) {
    throw Error("No such benchmark");
  }

  return benchmark;
};

const selectBenchmark = async () => {
  const allBenchmarks = await prisma.benchmarks.findMany({
    include: {
      _count: {
        select: { examples: true },
      },
    },
  });

  return await io.search("Select a benchmark", {
    renderResult: benchmark => ({
      label: benchmark.name,
    }),
    onSearch: async query => {
      return await prisma.benchmarks.findMany({
        where: { name: { contains: query } },
        include: {
          _count: {
            select: { examples: true },
          },
        },
      });
    },
    initialResults: allBenchmarks,
  });
};