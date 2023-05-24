import { Page, Layout, io, ctx } from "@interval/sdk";
import prisma from "../../prisma";

export default new Page({
  name: "┳━┳ LLM Bench",
  handler: async () => {
    const data = await prisma.benchmarks.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { examples: true },
        },
      },
    });

    return new Layout({
      title: "┳━┳ LLM Bench",
      description:
        "Create and run suites of tests for your prompts and models.",
      menuItems: [
        {
          label: "Create benchmark",
          route: "llm-bench/create-benchmark",
        },
      ],
      children: [
        io.display.table("Your benchmarks", {
          data,
          columns: [
            {
              label: "name",
              renderCell: row => ({
                label: row.name,
                route: "llm-bench/benchmark-details",
                params: { id: row.id },
              }),
            },
            {
              label: "Number of examples",
              renderCell: row => row._count.examples,
            },
          ],
        }),
      ],
    });
  },
});
