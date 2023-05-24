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
