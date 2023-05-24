import { Action, io, ctx } from "@interval/sdk";
import { requireBenchmark } from "../../utils/shared";
import { parse } from "csv-parse";
import { Readable } from "stream";
import prisma from "../../prisma";

export default new Action({
  name: "➕ Upload example CSV",
  unlisted: true,
  handler: async () => {
    const benchmark = await requireBenchmark();

    const inputKeys = Object.keys(benchmark.input_schema["properties"]);
    const outputKeys = Object.keys(benchmark.output_schema["properties"]);

    const [_, csv] = await io.group([
      io.display.markdown(
        `## Bulk adding examples for benchmark ${benchmark.name}`
      ),
      io.input.file("Upload CSV", {
        helpText:
          "Must be a CSV file with the following columns: " +
          inputKeys.join(", ") +
          ", " +
          outputKeys.join(", "),
        allowedExtensions: [".csv"],
      }),
    ]);

    const csvText = await csv.text();
    const totalExamples = csvText.split("\n").length - 1;
    const parser = Readable.from(csvText).pipe(
      parse({ columns: true, trim: true })
    );

    await ctx.loading.start({
      label: "Adding examples...",
      itemsInQueue: totalExamples,
    });

    const examples = [];
    for await (const record of parser) {
      const inputs = {};
      const expected_outputs = {};
      for (const key of inputKeys) {
        inputs[key] = record[key];
      }
      for (const key of outputKeys) {
        expected_outputs[key] = record[key];
      }
      examples.push({
        benchmark: benchmark.id,
        inputs,
        expected_outputs,
      });

      await ctx.loading.completeOne();
    }

    await prisma.examples.createMany({
      data: examples,
    });

    return `Added ${examples.length} examples to ${benchmark.name}`;
  },
});
