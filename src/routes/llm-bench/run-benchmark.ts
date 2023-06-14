import { Prisma } from "@prisma/client";
import { Action, io, ctx } from "@interval/sdk";
import { z } from "zod";
import {
  requireBenchmark,
  createPromptTemplate,
  runExample,
} from "../../utils/shared";
import { PromptTemplate as LangChainPromptTemplate } from "langchain/prompts";
import { jsonSchemaToZod } from "../../utils/langchain";
import prisma from "../../prisma";
import { AVAILABLE_MODELS } from "../../utils/models";

export default new Action({
  name: "🏃 Run a benchmark",
  handler: async () => {
    const benchmark = await requireBenchmark();
    const inputVariables = Object.keys(benchmark.input_schema["properties"]);

    const allTemplates = await prisma.prompt_templates.findMany({
      where: {
        benchmark: benchmark.id,
      },
    });

    const model = await io.select.single("Select a model to run against", {
      options: Object.keys(AVAILABLE_MODELS),
    });

    let promptTemplate;
    if (allTemplates.length > 0) {
      const { choice, returnValue: data } = await io
        .search("Select a prompt template to use", {
          renderResult: benchmark => ({
            label: benchmark.name,
          }),
          onSearch: async query => {
            return await prisma.prompt_templates.findMany({
              where: {
                benchmark: benchmark.id,
                name: { contains: query },
              },
            });
          },
          initialResults: allTemplates,
        })
        .optional()
        .withChoices(["Select", "Create new template instead"])
        .validate(({ choice, returnValue }) => {
          if (choice === "Select" && !returnValue) {
            return "Please select a template or create a new one";
          }
        });

      if (choice === "Select") {
        promptTemplate = data;
      }
    }

    if (!promptTemplate) {
      promptTemplate = await createPromptTemplate(benchmark);
    }

    await io.display.markdown(
      `## Selected prompt template\n\n\When run against chat based models, **System prompt** will be passed as a [system message](https://platform.openai.com/docs/guides/chat/introduction), and **Input prompt** will subsequently be passed as a user message. For non chat-based models, both prompts will simply be concatenated with a couple newlines in between.\n\n### System prompt\n\n\`\`\`\`\n${promptTemplate.system_template}\n\`\`\`\`\n\n### Input prompt\n\n\`\`\`\`\n${promptTemplate.input_template}\n\`\`\`\``
    );

    // TODO optionally allow for selecting examples for few-shot learning?

    const examples = await prisma.examples.findMany({
      where: {
        benchmark: benchmark.id,
      },
    });

    const confirmed = await io.confirm(`Run ${benchmark.name}?`, {
      helpText: `This will run against ${benchmark._count.examples} examples.`,
    });

    if (!confirmed) {
      return "Run cancelled";
    }

    const benchmarkRun = await prisma.benchmark_runs.create({
      data: {
        benchmark: benchmark.id,
        model,
        prompt_template: promptTemplate.id,
      },
    });

    ctx.loading.start({
      label: "Running benchmark",
      itemsInQueue: examples.length,
    });

    const systemPrompt = new LangChainPromptTemplate({
      template: promptTemplate.system_template,
      inputVariables: [
        ...inputVariables.filter(v =>
          promptTemplate.system_template.includes(`{${v}}`)
        ),
      ],
    });

    const inputPrompt = promptTemplate.input_template ? new LangChainPromptTemplate({
      template: promptTemplate.input_template,
      inputVariables: [
        ...inputVariables.filter(v =>
          promptTemplate.input_template.includes(`{${v}}`)
        ),
      ],
    }) : null;

    const outputSchema = jsonSchemaToZod(benchmark.output_schema);

    for (const example of examples) {
      await runExample({
        exampleRun: null,
        benchmark,
        benchmarkRun,
        example,
        systemPrompt,
        inputPrompt,
        outputSchema,
        completionFn: AVAILABLE_MODELS[model],
        model,
      });

      ctx.loading.completeOne();
    }

    const exampleRuns = await prisma.example_runs.findMany({
      where: {
        benchmark_run: benchmarkRun.id,
      },
      include: {
        examples: {
          select: {
            expected_outputs: true,
          },
        },
      },
    });

    const sampleRun = exampleRuns[0];
    const columns = Object.keys(sampleRun.examples.expected_outputs).flatMap(
      key => {
        return [
          {
            label: `Expected output: ${key}`,
            renderCell: row => row.examples.expected_outputs[key],
          },
          {
            label: `Output: ${key}`,
            renderCell: row => (row.outputs ? row.outputs[key] : null),
          },
        ];
      }
    );

    await io.group([
      io.display.table("Results", {
        data: exampleRuns,
        columns: [
          ...columns,
          {
            label: "Success",
            renderCell: row =>
              row.success
                ? "✅"
                : row.success === false
                ? "❌"
                : "⏳ Needs evaluation",
          },
          {
            label: "Duration (seconds)",
            renderCell: row => (row.durationMs ? row.durationMs / 1000 : null),
          },
          {
            label: "",
            renderCell: row => ({
              label: "View example run details",
              route: "llm-bench/example-run-details",
              params: { id: row.id },
            }),
          },
        ],
      }),
    ]);

    return "All done!";
  },
});
