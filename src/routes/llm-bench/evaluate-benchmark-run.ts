import { Action, io, ctx } from "@interval/sdk";
import { requireBenchmark, evaluateExampleRun } from "../../utils/shared";
import { z } from "zod";
import prisma from "../../prisma";

export default new Action({
  name: "Evaluate benchmark run",
  unlisted: true,
  handler: async () => {
    let { id } = z
      .object({
        id: z
          .preprocess(val => parseInt(val as string, 10), z.number())
          .optional(),
      })
      .parse(ctx.params);

    const data = await prisma.example_runs.findMany({
      where: {
        benchmark_run: id,
        success: null,
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

    for (const exampleRun of data) {
      await evaluateExampleRun(exampleRun);
    }

    return `All done!`;
  },
});
