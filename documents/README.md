# Document Generators

Source code for canonical Start Today™ documents. Each subdirectory contains
the generator script(s) needed to rebuild the document. The output `.docx`
files themselves live in the platform's `compliance-policies` storage bucket
and are registered in `st_internal_policies`.

| Directory | Document | Policy number | Class |
|---|---|---|---|
| `thesis-v2/` | Master's Thesis v2.0 | ST-STRAT-Thesis | strategy |
| `ar-workflow-v1.1/` | AR Collection Workflow v1.1 | ST-OPS-ARCollectionWorkflow | operational_sop |

## Build

Each generator is a Node.js script. Requires `npm install -g docx` (>= 9.6.1).

```bash
NODE_PATH=/home/claude/.npm-global/lib/node_modules node content-3.js   # thesis
NODE_PATH=/home/claude/.npm-global/lib/node_modules node build-ar-workflow.js
```

Output is written to the script's working directory.
