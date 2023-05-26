import { Page, Layout, io, ctx } from "@interval/sdk";
import { requireBenchmark } from "../../utils/shared";
import { z } from "zod";
import prisma from "../../prisma";

export default new Page({
  name: "Benchmark run",
  unlisted: true,
  handler: async () => {
    let { id } = z
      .object({
        id: z
          .preprocess(val => parseInt(val as string, 10), z.number())
          .optional(),
      })
      .parse(ctx.params);

    const data = await prisma.benchmark_runs.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        model: true,
        created_at: true,
        benchmarks: {
          select: {
            id: true,
            name: true,
          },
        },
        prompt_templates: {
          select: {
            name: true,
          },
        },
      },
    });

    const benchmark = data.benchmarks;
    const promptTemplate = data.prompt_templates;
    const exampleRuns = await prisma.example_runs.findMany({
      where: {
        benchmark_run: id,
      },
      include: {
        examples: {
          select: {
            expected_outputs: true,
          },
        },
      },
    });

    const needsEvaluation =
      exampleRuns.filter(
        run => run.success === null // or undefined?
      ).length > 0;

    // should display prompts somewhere w/ comparison

    const successfulExampleRuns = exampleRuns.filter(
      exampleRun => exampleRun.success
    );
    const accuracy = successfulExampleRuns.length / exampleRuns.length;

    const columns = Object.keys(
      exampleRuns[0].examples.expected_outputs
    ).flatMap(key => {
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
    });

    const menuItems = [
      {
        label: "Back to benchmark",
        route: "llm-bench/benchmark-details",
        params: { id: benchmark.id },
      },
    ];

    const metadata = [
      {
        label: "Model",
        value: data.model,
      },
      {
        label: "Prompt template",
        value: promptTemplate.name,
      },
      {
        label: "Accuracy",
        value: accuracy,
      },
    ];

    if (needsEvaluation) {
      menuItems.push({
        label: "Evaluate",
        route: "llm-bench/evaluate-benchmark-run",
        params: { id: data.id },
      });
    }

    return new Layout({
      title: `${new Date(data.created_at).toLocaleString()} run for ${
        benchmark.name
      }`,
      description: needsEvaluation
        ? "⚠️ This run has examples that stil need to be evaluated by a human."
        : "",
      menuItems,
      children: [
        io.display.metadata("Details", {
          layout: "card",
          data: metadata,
        }),
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
              renderCell: row =>
                row.durationMs ? row.durationMs / 1000 : null,
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
      ],
    });
  },
});
