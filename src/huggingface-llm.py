import os
import modal
import fastapi
from typing import Dict

stub = modal.Stub("huggingface-llm")

volume = modal.SharedVolume().persist("llm_volume")
CACHE_PATH = "/root/model_cache"

model = "tiiuae/falcon-7b-instruct"
# model = "openaccess-ai-collective/manticore-13b"


@stub.cls(
    gpu="A100",
    timeout=2000,
    image=modal.Image.debian_slim().pip_install(
        "torch",
        "einops",
        "xformers",
        "accelerate",
        "transformers==4.29.2",
    ),
    shared_volumes={CACHE_PATH: volume},
    secrets=[
        modal.Secret.from_dict({"TRANSFORMERS_CACHE": CACHE_PATH}),
    ],
)
class LLM:
    def __enter__(self):
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import transformers
        import torch

        self.tokenizer = transformers.AutoTokenizer.from_pretrained(model)
        self.pipeline = transformers.pipeline(
            "text-generation",
            model=model,
            tokenizer=self.tokenizer,
            torch_dtype=torch.bfloat16,
            trust_remote_code=True,
            device_map="auto",
        )

    @modal.method()
    def completion(self, prompt: str):
        sequences = self.pipeline(
            prompt,
            max_new_tokens=150,
            return_full_text=False,
            do_sample=True,
            top_k=10,
            num_return_sequences=1,
            eos_token_id=self.tokenizer.eos_token_id,
        )

        return sequences[0]["generated_text"]


@stub.function()
@modal.web_endpoint(method="POST")
async def f(params: Dict):
    return {"completion": LLM.completion.call(params["prompt"])}
