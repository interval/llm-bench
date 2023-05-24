import { Page, Layout, io, ctx } from "@interval/sdk";
import { requireBenchmark } from "../../utils/shared";
import { z } from "zod";
import prisma from "../../prisma";

export default new Page({
  name: "Prompt template details",
  unlisted: true,
  handler: async () => {
    let { id } = z
      .object({
        id: z
          .preprocess(val => parseInt(val as string, 10), z.number())
          .optional(),
      })
      .parse(ctx.params);

    const data = await prisma.prompt_templates.findUnique({
      where: {
        id,
      },
      select: {
        name: true,
        system_template: true,
        input_template: true,
        created_at: true,
        benchmarks: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const benchmark = data.benchmarks;

    return new Layout({
      title: data.name,
      menuItems: [
        {
          label: "Run",
          route: "llm-bench/run-benchmark",
          params: { id: benchmark.id },
          theme: "primary",
        },
      ],
      children: [
        io.display.code("System template", {
          code: data.system_template,
        }),
        io.display.code("Input template", {
          code: data.input_template,
        }),
      ],
    });
  },
});
