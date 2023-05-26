import { z } from "zod";
import { parseSchema } from "json-schema-to-zod";
import { StructuredOutputParser } from "langchain/output_parsers";

export const jsonSchemaToZod = jsonSchema => {
  const outputSchemaStr = parseSchema(jsonSchema);
  const args = "...args";
  const convert = new Function(
    args,
    `const [z] = args; const schema = ${outputSchemaStr}; return schema;`
  );
  return convert(z);
};

export const jsonFormatInstructions = schema => {
  const parser = StructuredOutputParser.fromZodSchema(schema);
  return parser.getFormatInstructions().toString();
};
