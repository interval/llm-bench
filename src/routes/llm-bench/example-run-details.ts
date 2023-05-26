import { Page, Layout, io, ctx } from "@interval/sdk";
import { requireBenchmark } from "../../utils/shared";
import { z } from "zod";
import prisma from "../../prisma";

export default new Page({
  name: "Example run",
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
    const example = data.examples;

    const menuItems = [
      {
        label: "Back to benchmark run",
        route: "llm-bench/benchmark-run-details",
        params: { id: benchmarkRun.id },
      },
    ];

    if (data.success === null) {
      menuItems.push({
        label: "Evaluate",
        route: "llm-bench/evaluate-example-run",
        params: { id: data.id },
      });
    }

    return new Layout({
      title: `Example run details`,
      description: `This is one example result for the ${benchmark.name} benchmark.`,
      menuItems,
      children: [
        io.display.metadata("Details", {
          layout: "card",
          data: [
            {
              label: "Success?",
              value: data.success
                ? "✅"
                : data.success === false
                ? "❌"
                : "⏳ Needs evaluation",
            },
            {
              label: "Model",
              value: benchmarkRun.model,
            },
            {
              label: "Run at",
              value: new Date(data.created_at).toLocaleString(),
            },
          ],
        }),
        io.display.object("Outputs", {
          data: data.outputs,
        }),
        io.display.object("Expected outputs", {
          data: example.expected_outputs,
        }),
        io.display.code("Raw prompt", {
          code: data.raw_prompt,
        }),
        io.display.code("Raw response", {
          code: data.error
            ? `Error: ${data.error}${
                data.raw_response ? `\n\n${data.raw_response}` : ""
              }`
            : data.raw_response || "",
        }),
      ],
    });
  },
});
