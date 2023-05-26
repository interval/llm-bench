-- CreateEnum
CREATE TYPE "EvalMethod" AS ENUM ('equality', 'human');

-- CreateTable
CREATE TABLE "benchmark_runs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT,
    "benchmark" INTEGER,
    "prompt_template" INTEGER,

    CONSTRAINT "benchmark_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmarks" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "input_schema" JSON,
    "output_schema" JSON,
    "eval_method" "EvalMethod" NOT NULL DEFAULT 'equality',

    CONSTRAINT "benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "example_runs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "benchmark_run" INTEGER,
    "example" INTEGER,
    "outputs" JSON,
    "success" BOOLEAN,
    "error" TEXT,
    "raw_response" TEXT,
    "raw_prompt" TEXT,
    "durationMs" INTEGER,

    CONSTRAINT "example_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examples" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "inputs" JSON,
    "expected_outputs" JSON,
    "benchmark" INTEGER,

    CONSTRAINT "examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "input_template" TEXT,
    "benchmark" INTEGER,
    "name" TEXT,
    "system_template" TEXT,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_benchmark_fkey" FOREIGN KEY ("benchmark") REFERENCES "benchmarks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_prompt_template_fkey" FOREIGN KEY ("prompt_template") REFERENCES "prompt_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "example_runs" ADD CONSTRAINT "example_runs_benchmark_run_fkey" FOREIGN KEY ("benchmark_run") REFERENCES "benchmark_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "example_runs" ADD CONSTRAINT "example_runs_example_fkey" FOREIGN KEY ("example") REFERENCES "examples"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "examples" ADD CONSTRAINT "examples_benchmark_fkey" FOREIGN KEY ("benchmark") REFERENCES "benchmarks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_benchmark_fkey" FOREIGN KEY ("benchmark") REFERENCES "benchmarks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
