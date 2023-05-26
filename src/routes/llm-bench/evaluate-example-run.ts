import { Action, io, ctx } from "@interval/sdk";
import { requireBenchmark, evaluateExampleRun } from "../../utils/shared";
import { z } from "zod";
import prisma from "../../prisma";

export default new Action({
  name: "Evaluate example run",
  unlisted: true,
  handler: async () => {
    let { id } = z
      .object({
        id: z
          .preprocess(val => parseInt(val as string, 10), z.number())
          .optional(),
      })
      .parse(ctx.params);

    const exampleRun = await prisma.example_runs.findUnique({
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

    if (exampleRun.success !== null) {
      return `This example run has already been evaluated.`;
    }

    await evaluateExampleRun(exampleRun);

    return `All done!`;
  },
});
