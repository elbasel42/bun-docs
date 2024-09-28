import { spawn, spawnSync } from "bun";
import { beforeAll, describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tmpdirSync, isWindows } from "harness";
import assert from "node:assert";
import fs from "node:fs/promises";
import { join, basename } from "path";

enum Runtime {
  node,
  bun,
}

enum BuildMode {
  debug,
  release,
}

// clang-cl does not work on Windows with node-gyp 10.2.0, so we should not let that affect the
// test environment
delete bunEnv.CC;
delete bunEnv.CXX;
if (process.platform == "darwin") {
  bunEnv.CXXFLAGS ??= "";
  bunEnv.CXXFLAGS += "-std=gnu++17";
}
// https://github.com/isaacs/node-tar/blob/bef7b1e4ffab822681fea2a9b22187192ed14717/lib/get-write-flag.js
// prevent node-tar from using UV_FS_O_FILEMAP
if (process.platform == "win32") {
  bunEnv.__FAKE_PLATFORM__ = "linux";
}

const srcDir = join(__dirname, "v8-module");
const directories = {
  bunRelease: "",
  bunDebug: "",
  node: "",
  badModules: "",
};

async function install(srcDir: string, tmpDir: string, runtime: Runtime): Promise<void> {
  await fs.cp(srcDir, tmpDir, { recursive: true });
  const install = spawn({
    cmd: [bunExe(), "install", "--ignore-scripts"],
    cwd: tmpDir,
    env: bunEnv,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await install.exited;
  if (install.exitCode != 0) {
    throw new Error("build failed");
  }
}

async function build(
  srcDir: string,
  tmpDir: string,
  runtime: Runtime,
  buildMode: BuildMode,
): Promise<{ out: string; err: string; description: string }> {
  const build = spawn({
    cmd:
      runtime == Runtime.bun
        ? [bunExe(), "x", "--bun", "node-gyp", "rebuild", buildMode == BuildMode.debug ? "--debug" : "--release"]
        : ["npx", "node-gyp", "rebuild", "--release"], // for node.js we don't bother with debug mode
    cwd: tmpDir,
    env: bunEnv,
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
  });
  await build.exited;
  const out = await new Response(build.stdout).text();
  const err = await new Response(build.stderr).text();
  if (build.exitCode != 0) {
    console.error(err);
    throw new Error("build failed");
  }
  return {
    out,
    err,
    description: `build ${basename(srcDir)} with ${Runtime[runtime]} in ${BuildMode[buildMode]} mode`,
  };
}

beforeAll(async () => {
  // set up clean directories for our 4 builds
  directories.bunRelease = tmpdirSync();
  directories.bunDebug = tmpdirSync();
  directories.node = tmpdirSync();
  directories.badModules = tmpdirSync();

  await install(srcDir, directories.bunRelease, Runtime.bun);
  await install(srcDir, directories.bunDebug, Runtime.bun);
  await install(srcDir, directories.node, Runtime.node);
  await install(join(__dirname, "bad-modules"), directories.badModules, Runtime.node);

  const results = await Promise.all([
    build(srcDir, directories.bunRelease, Runtime.bun, BuildMode.release),
    build(srcDir, directories.bunDebug, Runtime.bun, BuildMode.debug),
    build(srcDir, directories.node, Runtime.node, BuildMode.release),
    build(join(__dirname, "bad-modules"), directories.badModules, Runtime.node, BuildMode.release),
  ]);
  for (const r of results) {
    console.log(r.description, "stdout:");
    console.log(r.out);
    console.log(r.description, "stderr:");
    console.log(r.err);
  }
});

describe("module lifecycle", () => {
  it("can call a basic native function", () => {
    checkSameOutput("test_v8_native_call", []);
  });
});

describe("primitives", () => {
  it("can create and distinguish between null, undefined, true, and false", () => {
    checkSameOutput("test_v8_primitives", []);
  });
});

describe("Number & Integer", () => {
  it("can create small integer", () => {
    checkSameOutput("test_v8_number_int", []);
  });
  it("can create large integer", () => {
    checkSameOutput("test_v8_number_large_int", []);
  });
  it("can create fraction", () => {
    checkSameOutput("test_v8_number_fraction", []);
  });
});

describe("Value", () => {
  describe("Uint32Value & NumberValue", () => {
    it("coerces correctly", () => {
      checkSameOutput("test_v8_value_uint32value_and_numbervalue", []);
    });
    it("throws in the right cases", () => {
      checkSameOutput("test_v8_value_uint32value_and_numbervalue_throw", []);
    });
  });
  describe("ToString", () => {
    it("returns the right result", () => {
      checkSameOutput("test_v8_value_to_string", []);
    });
    it("handles exceptions", () => {
      checkSameOutput("test_v8_value_to_string_exceptions", []);
    });
  });
});

describe("String", () => {
  it("can create and read back strings with only ASCII characters", () => {
    checkSameOutput("test_v8_string_ascii", []);
  });
  // non-ASCII strings are not implemented yet
  it("can create and read back strings with UTF-8 characters", () => {
    checkSameOutput("test_v8_string_utf8", []);
  });
  it("handles replacement correctly in strings with invalid UTF-8 sequences", () => {
    checkSameOutput("test_v8_string_invalid_utf8", []);
  });
  it("can create strings from null-terminated Latin-1 data", () => {
    checkSameOutput("test_v8_string_latin1", []);
  });
  describe("WriteUtf8", () => {
    it("truncates the string correctly", () => {
      checkSameOutput("test_v8_string_write_utf8", []);
    });
  });
});

describe("External", () => {
  it("can create an external and read back the correct value", () => {
    checkSameOutput("test_v8_external", []);
  });
});

describe("Object", () => {
  it("can create an object and set properties", () => {
    checkSameOutput("test_v8_object", []);
  });
  it("uses proxies properly", () => {
    checkSameOutput("test_v8_object_set_proxy", []);
  });
  it("can handle failure in Set()", () => {
    checkSameOutput("test_v8_object_set_failure", []);
  });
});
describe("Array", () => {
  // v8::Array::New is broken as it still tries to reinterpret locals as JSValues
  it.skip("can create an array from a C array of Locals", () => {
    checkSameOutput("test_v8_array_new", []);
  });
});

describe("ObjectTemplate", () => {
  it("creates objects with internal fields", () => {
    checkSameOutput("test_v8_object_template", []);
  });
});

describe("FunctionTemplate", () => {
  it("keeps the data parameter alive", () => {
    checkSameOutput("test_v8_function_template", []);
  });
  // calls tons of functions we don't implement yet
  it.skip("can create an object with prototype properties, instance properties, and an accessor", () => {
    checkSameOutput("test_v8_function_template_instance", []);
  });
});

describe("Function", () => {
  // TODO call native from native and napi from native
  it("correctly receives all its arguments from JS", () => {
    // this will print out all the values we pass it
    checkSameOutput("print_values_from_js", [5.0, true, null, false, "meow", {}, [5, 6]]);
    checkSameOutput("print_native_function", []);
  });

  it("correctly receives the this value from JS", () => {
    checkSameOutput("call_function_with_weird_this_values", []);
  });

  it("can call a JS function from native code", () => {
    checkSameOutput("call_js_functions_from_native", []);
  });
});

describe("error handling", () => {
  it("throws an error for modules built using the wrong ABI version", () => {
    expect(() => require(join(directories.badModules, "build/Release/mismatched_abi_version.node"))).toThrow(
      "The module 'mismatched_abi_version' was compiled against a different Node.js ABI version using NODE_MODULE_VERSION 42.",
    );
  });

  it("throws an error for modules with no entrypoint", () => {
    expect(() => require(join(directories.badModules, "build/Release/no_entrypoint.node"))).toThrow(
      "The module 'no_entrypoint' has no declared entry point.",
    );
  });
});

describe("Global", () => {
  it("can create, modify, and read the value from global handles", () => {
    checkSameOutput("test_v8_global", []);
  });
});

describe("HandleScope", () => {
  it("can hold a lot of locals", () => {
    checkSameOutput("test_many_v8_locals", []);
  });
  it("keeps GC objects alive", () => {
    checkSameOutput("test_handle_scope_gc", []);
  }, 10000);
});

describe("EscapableHandleScope", () => {
  it("keeps handles alive in the outer scope", () => {
    checkSameOutput("test_v8_escapable_handle_scope", []);
  });
});

describe("uv_os_getpid", () => {
  it.skipIf(isWindows)("returns the same result as getpid on POSIX", () => {
    checkSameOutput("test_uv_os_getpid", []);
  });
});

describe("uv_os_getppid", () => {
  it.skipIf(isWindows)("returns the same result as getppid on POSIX", () => {
    checkSameOutput("test_uv_os_getppid", []);
  });
});

function checkSameOutput(testName: string, args: any[], thisValue?: any) {
  const nodeResult = runOn(Runtime.node, BuildMode.release, testName, args, thisValue).trim();
  let bunReleaseResult = runOn(Runtime.bun, BuildMode.release, testName, args, thisValue);
  let bunDebugResult = runOn(Runtime.bun, BuildMode.debug, testName, args, thisValue);

  // remove all debug logs
  bunReleaseResult = bunReleaseResult.replaceAll(/^\[\w+\].+$/gm, "").trim();
  bunDebugResult = bunDebugResult.replaceAll(/^\[\w+\].+$/gm, "").trim();

  expect(bunReleaseResult, `test ${testName} printed different output under bun vs. under node`).toBe(nodeResult);
  expect(bunDebugResult, `test ${testName} printed different output under bun in debug mode vs. under node`).toBe(
    nodeResult,
  );
  return nodeResult;
}

function runOn(runtime: Runtime, buildMode: BuildMode, testName: string, jsArgs: any[], thisValue?: any) {
  if (runtime == Runtime.node) {
    assert(buildMode == BuildMode.release);
  }
  const baseDir =
    runtime == Runtime.node
      ? directories.node
      : buildMode == BuildMode.debug
        ? directories.bunDebug
        : directories.bunRelease;
  const exe = runtime == Runtime.node ? "node" : bunExe();

  const cmd = [
    exe,
    ...(runtime == Runtime.bun ? ["--smol"] : []),
    join(baseDir, "main.js"),
    testName,
    JSON.stringify(jsArgs),
    JSON.stringify(thisValue ?? null),
  ];
  if (buildMode == BuildMode.debug) {
    cmd.push("debug");
  }

  const exec = spawnSync({
    cmd,
    cwd: baseDir,
    env: bunEnv,
  });
  const errs = exec.stderr.toString();
  const crashMsg = `test ${testName} crashed under ${Runtime[runtime]} in ${BuildMode[buildMode]} mode`;
  if (errs !== "") {
    throw new Error(`${crashMsg}: ${errs}`);
  }
  expect(exec.success, crashMsg).toBeTrue();
  return exec.stdout.toString();
}
