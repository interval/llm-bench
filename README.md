# ┳━┳ LLM Bench

While the best examples of LLM functionality are eye-popping, putting them in production while ensuring reliability across all the inputs and scenarios is a challenge. LLM Bench is a lightweight tool for quickly building up "integration tests" to ensure LLMs are doing what you want:

* Test that prompts perform well across a wide spectrum of inputs
* Compare models, and make informed trade-offs between performance, latency, and cost
* Understand the limitations of the models you use and where they fall short
* Learn to prompt better systematically, rather than with one-off tests

LLM Bench is designed to be easy-to-use and extensible. It's built with TypeScript and [runs on Interval](https://interval.com/)

Features:
* Simple UI for building up custom benchmarks to evaluate and experiment across different models and prompts
* Compare results quickly and view past benchmark runs to detect regressions
* No coding required, but hacker friendly and easy to customize
* Automatically prompt and ensure LLMs output type-checked JSON for easier evaluation of tasks and completions.
* Evals run locally by default
* Unopinionated and extensible

Maybe coming soon:
* LLM generated examples based off existing benchmark + prompt
* More eval methods beyond string matching, custom function
* Human-in-the-loop benchmark evals
* Integrate application specific context via embeddings
* Compare benchmark results side by side in a table
* Export benchmarks as CSVs

## Getting up and running

To run LLM Bench you'll need the following:

* [An Interval account to host the dashboard](https://interval.com/)
* A Postgres database (feel free to run it locally, or use a service like [Supabase](https://supabase.com/) for a free, hosted db)
* Some API keys for LLM access (or you can run your own model)

Here's the step-by-step to get started. First pull down the code to run locally.

```
git clone git@github.com:interval/llm-bench.git
cd llm-bench
yarn install
```

Next set the following environment variables in your `.env` file. (You can use `.env.sample` as a template.)

```
INTERVAL_KEY=
DATABASE_URL=
OPENAI_KEY=
COHERE_KEY=
```

Create or find an existing Interval key in your [Interval dashboard](https://interval.com/dashboard/develop/keys). `DATABASE_URL` should point to your Postgres database. Set the [OpenAI](https://platform.openai.com/account/api-keys) or [Cohere](https://dashboard.cohere.ai/api-keys) keys depending on which API based LLMs you plan to utilize.

Next, initialize your database with the required schema.

```
yarn prisma migrate dev --name init
```

You can now start the app.

```
yarn dev
```

Access LLM bench in [your Interval dashboard](https://interval.com/dashboard/actions).
