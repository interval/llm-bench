import { Action, Layout, io, ctx } from "@interval/sdk";
import { requireBenchmark } from "../../utils/shared";
import { z } from "zod";
import prisma from "../../prisma";
import { runExample } from "../../utils/shared";
import { PromptTemplate as LangChainPromptTemplate } from "langchain/prompts";
import { jsonSchemaToZod } from "../../utils/langchain";
import { AVAILABLE_MODELS } from "../../utils/models";

export default new Action({
  name: "Retry example run",
  unlisted: true,
  handler: async () => {
    let { id } = z
      .object({
        id: z
          .preprocess(val => parseInt(val as string, 10), z.number())
          .optional(),
      })
      .parse(ctx.params);

    const data = await prisma.example_runs.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        created_at: true,
        success: true,
        outputs: true,
        error: true,
        examples: {
          select: {
            inputs: true,
            expected_outputs: true,
          },
        },
        benchmark_runs: {
          select: {
            id: true,
            model: true,
            benchmarks: {
              select: {
                name: true,
                eval_method: true,
                input_schema: true,
                output_schema: true,
              },
            },
            prompt_templates: {
              select: {
                system_template: true,
                input_template: true,
              },
            },
          },
        },
        raw_prompt: true,
        raw_response: true,
      },
    });

    const benchmarkRun = data.benchmark_runs;
    const benchmark = data.benchmark_runs.benchmarks;
    const promptTemplate = data.benchmark_runs.prompt_templates;
    const systemTemplate = data.benchmark_runs.prompt_templates.system_template;
    const inputTemplate = data.benchmark_runs.prompt_templates.input_template;
    const inputVariables = Object.keys(benchmark.input_schema["properties"]);
    const example = data.examples;

    const confirmed = await io.confirm(
      "Are you sure you want to retry this example?",
      {
        helpText: "This will clear the existing result.",
      }
    );

    if (!confirmed) {
      await ctx.redirect({
        action: "llm-bench/example-run-details",
        params: { id: data.id },
      });
    }

    const systemPrompt = new LangChainPromptTemplate({
      template: promptTemplate.system_template,
      inputVariables: [
        ...inputVariables.filter(v =>
          promptTemplate.system_template.includes(`{${v}}`)
        ),
      ],
    });

    let inputPrompt = ""

    if (promptTemplate.input_template) {
      const inputPrompt = new LangChainPromptTemplate({
        template: promptTemplate.input_template,
        inputVariables: [
          ...inputVariables.filter(v =>
            promptTemplate.input_template.includes(`{${v}}`)
          ),
        ],
      });
    }

    const outputSchema = jsonSchemaToZod(benchmark.output_schema);

    await runExample({
      exampleRun: data,
      benchmark,
      benchmarkRun,
      example,
      systemPrompt,
      inputPrompt,
      outputSchema,
      completionFn: AVAILABLE_MODELS[benchmarkRun.model],
      model: benchmarkRun.model,
    });

    await ctx.redirect({
      action: "llm-bench/example-run-details",
      params: { id: data.id },
    });

    return "All done";
  },
});
