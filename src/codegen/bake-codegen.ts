import assert from "node:assert";
import { existsSync, writeFileSync, rmSync  } from "node:fs";
import { watch } from "node:fs/promises";
import { basename, join } from "node:path";

// arg parsing
const options = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith("--")) {
    console.error("Unknown argument " + arg);
    process.exit(1);
  }
  const split = arg.split("=");
  const value = split[1] || "true";
  options[split[0].slice(2)] = value;
}

let { codegen_root, debug, live } = options as any;
if (!codegen_root) {
  console.error("Missing --codegen_root=...");
  process.exit(1);
}
if (debug === "false" || debug === "0" || debug == "OFF") debug = false;

const base_dir = join(import.meta.dirname, "../bake");
process.chdir(base_dir); // to make bun build predictable in development

async function run(){

const results = await Promise.allSettled(
  ["client", "server", "error"].map(async file => {
    const side = file === 'error' ? 'client' : file;
    let result = await Bun.build({
      entrypoints: [join(base_dir, `hmr-runtime-${file}.ts`)],
      define: {
        side: JSON.stringify(side),
        IS_BUN_DEVELOPMENT: String(!!debug),
      },
      minify: {
        syntax: true,
      },
    });
    if (!result.success) throw new AggregateError(result.logs);
    assert(result.outputs.length === 1, "must bundle to a single file");
    // @ts-ignore
    let code = await result.outputs[0].text();

  // A second pass is used to convert global variables into parameters, while
  // allowing for renaming to properly function when minification is enabled.
  const in_names = [
    file !== 'error' && 'input_graph',
    file !== 'error' && 'config',
    file === 'server' && 'server_exports'
  ].filter(Boolean);
  const combined_source = file === 'error' ? code : `
    __marker__;
    ${in_names.length > 0 ? 'let' : ''} ${in_names.join(",")};
    __marker__(${in_names.join(",")});
    ${code};
  `;
    const generated_entrypoint = join(base_dir, `.runtime-${file}.generated.ts`);

    writeFileSync(generated_entrypoint, combined_source);

    result = await Bun.build({
      entrypoints: [generated_entrypoint],
      minify: {
        syntax: true,
        whitespace: !debug,
        identifiers: !debug,
      },
    });
    if (!result.success) throw new AggregateError(result.logs);
    assert(result.outputs.length === 1, "must bundle to a single file");
    code = (await result.outputs[0].text()).replace(`// ${basename(generated_entrypoint)}`, "").trim();

    rmSync(generated_entrypoint);

    if(file !== 'error') {
      let names: string = "";
      code = code
        .replace(/(\n?)\s*__marker__.*__marker__\((.+?)\);\s*/s, (_, n, captured) => {
          names = captured;
          return n;
        })
        .trim();
      assert(names, "missing name");

      if (debug) {
        code = "\n  " + code.replace(/\n/g, "\n  ") + "\n";
      }

      if (code[code.length - 1] === ";") code = code.slice(0, -1);

      if (side === "server") {
        const server_fetch_function = names.split(",")[2].trim();
        code = debug ? `${code}  return ${server_fetch_function};\n` : `${code};return ${server_fetch_function};`;
      }

      code = debug ? `((${names}) => {${code}})({\n` : `((${names})=>{${code}})({`;

      if (side === "server") {
        code = `export default await ${code}`;
      }
    }

    writeFileSync(join(codegen_root, `bake.${file}.js`), code);
  }),
);

// print failures in a de-duplicated fashion.
interface Err {
  kind: ("client" | "server" | "error")[];
  err: any;
}
const failed = [
  { kind: ["client"], result: results[0] },
  { kind: ["server"], result: results[1] },
  { kind: ["error"], result: results[2] },
]
  .filter(x => x.result.status === "rejected")
  .map(x => ({ kind: x.kind, err: x.result.reason })) as Err[];
if (failed.length > 0) {
  const flattened_errors: Err[] = [];
  for (const { kind, err } of failed) {
    if (err instanceof AggregateError) {
      flattened_errors.push(...err.errors.map(err => ({ kind, err })));
    }
    flattened_errors.push({ kind, err });
  }
  for (let i = 0; i < flattened_errors.length; i++) {
    const x = flattened_errors[i];
    if (!x.err?.message) continue;
    for (const other of flattened_errors.slice(0, i)) {
      if (other.err?.message === x.err.message || other.err.stack === x.err.stack) {
        other.kind = [...x.kind, ...other.kind];
        flattened_errors.splice(i, 1);
        i -= 1;
        continue;
      }
    }
  }
  for (const { kind, err } of flattened_errors) {
    const map = { error: "error runtime", client: "client runtime", server: "server runtime" };
    console.error(`Errors while bundling Bake ${kind.map(x=>map[x]).join(' and ')}:`);
    console.error(err);
  }
  if(!live)
    process.exit(1);
} else {
  console.log("-> bake.client.js, bake.server.js, bake.error.js");

  const empty_file = join(codegen_root, "bake_empty_file");
  if (!existsSync(empty_file)) writeFileSync(empty_file, "this is used to fulfill a cmake dependency");
}
}

await run();

if (live) {
  const watcher = watch(base_dir, { recursive: true }) as any;
  for await (const event of watcher) {
    if(event.filename.endsWith('.zig')) continue;
    if(event.filename.startsWith('.')) continue;
    try {
      await run();
    }catch(e) {
      console.log(e);
    }
  }
}