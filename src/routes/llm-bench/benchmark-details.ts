import { Page, Layout, io, ctx } from "@interval/sdk";
import { requireBenchmark } from "../../utils/shared";
import { z } from "zod";
import prisma from "../../prisma";

export default new Page({
  name: "Benchmark details",
  unlisted: true,
  handler: async () => {
    const benchmark = await requireBenchmark();

    const exampleRuns = await prisma.example_runs.findMany({
      select: {
        outputs: true,
        durationMs: true,
        benchmark_runs: {
          select: {
            id: true,
            created_at: true,
            benchmark: true,
            model: true,
            prompt_templates: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        examples: {
          select: {
            expected_outputs: true,
          },
        },
      },
    });

    const benchmarkRunsData = exampleRuns.reduce((acc, exampleRun) => {
      const benchmarkRun = exampleRun.benchmark_runs;
      let success = true;
      Object.keys(exampleRun.examples.expected_outputs).forEach(key => {
        if (
          exampleRun.outputs === null ||
          exampleRun.examples.expected_outputs[key] !== exampleRun.outputs[key]
        ) {
          success = false;
        }
      });

      if (acc[benchmarkRun.id]) {
        acc[benchmarkRun.id]["successCount"] += success ? 1 : 0;
        acc[benchmarkRun.id]["totalCount"] += 1;
        acc[benchmarkRun.id]["totalMs"] += exampleRun.durationMs || 0;
        acc[benchmarkRun.id]["totalMsCount"] += exampleRun.durationMs ? 1 : 0;
      } else {
        acc[benchmarkRun.id] = {
          id: benchmarkRun.id,
          model: benchmarkRun.model,
          createdAt: benchmarkRun.created_at,
          promptTemplate: benchmarkRun.prompt_templates.id,
          promptTemplateName: benchmarkRun.prompt_templates.name,
          successCount: success ? 1 : 0,
          totalCount: 1,
          totalMs: exampleRun.durationMs || 0,
          totalMsCount: exampleRun.durationMs ? 1 : 0,
        };
      }

      return acc;
    }, {});

    console.log("benchmarkRunsData", benchmarkRunsData);

    const examples = await prisma.examples.findMany({
      where: {
        benchmark: benchmark.id,
      },
      select: {
        inputs: true,
        expected_outputs: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const exampleData = examples.map(example => {
      const columns = {};

      Object.keys(example.inputs).forEach(key => {
        columns[`Input: ${key}`] = example.inputs[key];
      });

      Object.keys(example.expected_outputs).forEach(key => {
        columns[`Output: ${key}`] = example.expected_outputs[key];
      });

      return columns;
    });

    return new Layout({
      title: benchmark.name,
      menuItems: [
        {
          label: "Run",
          route: "llm-bench/run-benchmark",
          params: { id: benchmark.id },
          theme: "primary",
        },
        {
          label: "Add examples",
          route: "llm-bench/add-example",
          params: { id: benchmark.id },
          theme: "secondary",
        },
        {
          label: "Bulk add examples",
          route: "llm-bench/add-many-examples",
          params: { id: benchmark.id },
          theme: "secondary",
        },
      ],
      children: [
        io.display.table("Previous runs", {
          data: Object.keys(benchmarkRunsData).map(
            key => benchmarkRunsData[key]
          ),
          columns: [
            {
              label: "Model",
              renderCell: row => row.model,
            },
            {
              label: "Prompt template",
              renderCell: row => {
                if (row.promptTemplate) {
                  return {
                    label: row.promptTemplateName,
                    route: "llm-bench/prompt-template-details",
                    params: { id: row.promptTemplate },
                  };
                } else {
                  return "N/A";
                }
              },
            },
            {
              label: "# of examples run",
              renderCell: row => row.totalCount,
            },
            {
              label: "Accuracy",
              renderCell: row => row.successCount / row.totalCount,
            },
            {
              label: "Avg duration (seconds)",
              renderCell: row => row.totalMs / row.totalMsCount / 1000,
            },
            {
              label: "Created at",
              renderCell: row => new Date(row.createdAt).toLocaleString(),
            },
            {
              label: "",
              renderCell: row => ({
                label: "View run details",
                route: "llm-bench/benchmark-run-details",
                params: { id: row.id },
              }),
            },
          ],
        }),
        io.display.table("Examples", {
          data: exampleData,
        }),
      ],
    });
  },
});
