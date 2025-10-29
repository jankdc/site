---
title: Writing a (relatively) fast schema-aware JSON parser
layout: post
date: 2025-10-26
description: Writing a (relatively) fast schema-aware JSON parser
---

## Background

Imagine this fairly common scenario in backend development: 

You have an http server with endpoints that can take in some JSON in the body, that an http client can send as part of the request. Once the endpoint handler parses the raw JSON string (usually the idiomatic `JSON.parse()`) into a JSON object, the handler of that endpoint will then validate that object based on some shape (your favourite validation library here like `zod` or `json-schema`). 

Now, imagine if that endpoint expected a small JSON shape, only for the client to send a large JSON payload:

<!-- Write an example showing a JSON payload and a Zod schema proving the above and below sentences -->

```json
{
    "some-json-key-here": "some-json-value-here"
}
```

Given the following parsing + validation flow, we can easily see that we're using a lot of time parsing the whole JSON into a valid JSON object, and not a lot of time validating. This is where I thought of an idea, where instead of validating later, we bake in the validation process in the parsing by creating a parser that only parses based on the given JSON shape. That way, the process can fail early instead of continuing on with parsing the rest of the invalid JSON.

Now I know what you're thinking: Another developer trying to create their own JSON parser. I'm aware that this project will most likely never beat the years of hardcore optimization and C++ magickery that browser developers had come up with to make `JSON.parse` so fast. However, I'd still like to see how far I can push this heuristic, to see if it can be superior in the imagined use case compared to the parsing + validation method.

> A simple but dirty approach would be to roughly check if the raw JSON string is too long for parsing, based on the expected shape, and that could possibly work in this scenario - regardless, it wouldn't be a technical blog without some over-engineering now would it?

## AI-assisted Development 

I was actually playing with agentic coding before I started this project. A JSON parser seemed like the perfect start for an agent to develop the implementation with. It has the following hallmarks for some AI-assisted work:

1. The JSON notation has defined spec(s) to write an implementation against (more on this later)
2. Plenty of JSON conformance tests in battle-hardened parsers that we can use to verify if the AI slop does work
3. Experience with parsing techniques to verify if the AI slop is doing something off
4. I'm unemployed so lots and lots of free time
