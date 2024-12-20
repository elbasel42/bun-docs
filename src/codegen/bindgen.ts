// The binding generator to rule them all.
// Converts binding definition files (.bind.ts) into C++ and Zig code.
//
// Generated bindings are available in `bun.generated.<basename>.*` in Zig,
// or `Generated::<basename>::*` in C++ from including `Generated<basename>.h`.
import * as path from "node:path";
import * as fs from "node:fs";
import {
  CodeWriter,
  TypeImpl,
  cAbiTypeName,
  cap,
  extDispatchVariant,
  extJsFunction,
  files,
  snake,
  src,
  str,
  Struct,
  type CAbiType,
  type DictionaryField,
  type ReturnStrategy,
  type TypeKind,
  type Variant,
  typeHashToNamespace,
  typeHashToReachableType,
  zid,
  ArgStrategyChildItem,
  inspect,
  pascal,
  alignForward,
  isFunc,
  Func,
  zigEnums,
  NodeValidator,
  cAbiIntegerLimits,
  extInternalDispatchVariant,
  TypeData,
  extCustomZigValidator,
} from "./bindgen-lib-internal";
import assert from "node:assert";
import { argParse, readdirRecursiveWithExclusionsAndExtensionsSync, writeIfNotChanged } from "./helpers";
import { CustomCpp, CustomCppArg, CustomZig, CustomZigArg } from "bindgen";

// arg parsing
let {
  "codegen-root": codegenRoot,
  debug,
  zig: zigPath = Bun.which("zig", {
    PATH: path.join(import.meta.dirname, "../../vendor/zig") + path.delimiter + process.env.PATH,
  }),
} = argParse(["codegen-root", "debug", "zig"]);
if (debug === "false" || debug === "0" || debug == "OFF") debug = false;
if (!codegenRoot) {
  console.error("Missing --codegen-root=...");
  process.exit(1);
}

const start = performance.now();
const emittedZigValidateFunctions = new Set<string>();

let currentStatus: string | null = null;
const { enableANSIColors } = Bun;
function status(newStatus: string) {
  if (!enableANSIColors) return console.log("bindgen: " + newStatus);
  if (currentStatus) {
    // move up and clear the line
    process.stdout.write(`\x1b[1A\x1b[2K`);
  }
  newStatus = "bindgen: " + newStatus;
  currentStatus = newStatus;
  console.log(newStatus);
}

function resolveVariantStrategies(vari: Variant, name: string) {
  let argIndex = 0;
  let communicationStruct: Struct | undefined;
  for (const arg of vari.args) {
    if (arg.type.isVirtualArgument() && vari.globalObjectArg === undefined) {
      vari.globalObjectArg = argIndex;
    }
    argIndex += 1;

    // If `extern struct` can represent this type, that is the simplest way to cross the C-ABI boundary.
    const isNullable = arg.type.flags.optional && !("default" in arg.type.flags);
    const abiType = !isNullable && arg.type.canDirectlyMapToCAbi();
    if (abiType) {
      arg.loweringStrategy = {
        // This does not work in release builds, possibly due to a Zig 0.13 bug
        // regarding by-value extern structs in C functions.
        // type: cAbiTypeInfo(abiType)[0] > 8 ? "c-abi-pointer" : "c-abi-value",
        // Always pass an argument by-pointer for now.
        type:
          abiType === "*anyopaque" || abiType === "*JSGlobalObject" || abiType === "*bun.wtf.String"
            ? "c-abi-value"
            : "c-abi-pointer",
        abiType,
      };
      continue;
    }

    communicationStruct ??= new Struct();
    const prefix = `${arg.name}`;
    const children = isNullable
      ? resolveNullableArgumentStrategy(arg.type, prefix, communicationStruct)
      : resolveComplexArgumentStrategy(arg.type, prefix, communicationStruct);
    arg.loweringStrategy = {
      type: "uses-communication-buffer",
      prefix,
      children,
    };
  }

  if (vari.globalObjectArg === undefined) {
    vari.globalObjectArg = "hidden";
  }

  return_strategy: {
    if (vari.ret.kind === "undefined") {
      vari.returnStrategy = { type: "void" };
      break return_strategy;
    }
    if (vari.ret.kind === "any") {
      vari.returnStrategy = { type: "jsvalue" };
      break return_strategy;
    }
    const abiType = vari.ret.canDirectlyMapToCAbi();
    if (abiType) {
      vari.returnStrategy = {
        type: "basic-out-param",
        abiType,
      };
      break return_strategy;
    }
  }

  communicationStruct?.reorderForSmallestSize();
  communicationStruct?.assignGeneratedName(name);
  vari.communicationStruct = communicationStruct;
}

function resolveNullableArgumentStrategy(
  type: TypeImpl,
  prefix: string,
  communicationStruct: Struct,
): ArgStrategyChildItem[] {
  assert(type.flags.optional && !("default" in type.flags));
  communicationStruct.add(`${prefix}Set`, "bool");
  return resolveComplexArgumentStrategy(type, `${prefix}Value`, communicationStruct);
}

function resolveComplexArgumentStrategy(
  type: TypeImpl,
  prefix: string,
  communicationStruct: Struct,
): ArgStrategyChildItem[] {
  const abiType = type.canDirectlyMapToCAbi();
  if (abiType) {
    communicationStruct.add(prefix, abiType);
    return [
      {
        type: "c-abi-compatible",
        abiType,
      },
    ];
  }

  switch (type.kind) {
    // case "sequence": {
    //   const child = type.data as TypeData<"sequence">;
    //   break;
    // }
    case "customZig":
      communicationStruct.add(prefix, "JSValue");
      return [
        {
          type: "c-abi-compatible",
          abiType: "JSValue",
        },
      ];
    default:
      throw new Error(`TODO: resolveComplexArgumentStrategy for ${type.kind}`);
  }
}

function emitCppCallToVariant(className: string, name: string, variant: Variant, dispatchFunctionName: string) {
  cpp.line(`auto& vm = JSC::getVM(global);`);
  cpp.line(`auto throwScope = DECLARE_THROW_SCOPE(vm);`);
  if (variant.minRequiredArgs > 0) {
    cpp.line(`size_t argumentCount = callFrame->argumentCount();`);
    cpp.line(`if (argumentCount < ${variant.minRequiredArgs}) {`);
    cpp.line(`    return JSC::throwVMError(global, throwScope, createNotEnoughArgumentsError(global));`);
    cpp.line(`}`);
  }
  const communicationStruct = variant.communicationStruct;
  if (communicationStruct) {
    cpp.line(`${communicationStruct.name()} buf;`);
    communicationStruct.emitCpp(cppInternal, communicationStruct.name());
  }

  let i = 0;
  for (const arg of variant.args) {
    const type = arg.type;
    if (type.isVirtualArgument()) continue;
    if (type.isIgnoredUndefinedType()) {
      i += 1;
      continue;
    }

    const exceptionContext: ExceptionContext = {
      type: "argument",
      argIndex: i,
      argName: arg.name,
      className,
      functionName: name,
    };

    const strategy = arg.loweringStrategy!;
    assert(strategy);

    const get = variant.minRequiredArgs > i ? "uncheckedArgument" : "argument";
    cpp.line(`JSC::EnsureStillAliveScope arg${i} = callFrame->${get}(${i});`);

    let storageLocation;
    let needDeclare = true;
    switch (strategy.type) {
      case "c-abi-pointer":
      case "c-abi-value":
        storageLocation = "arg" + cap(arg.name);
        break;
      case "uses-communication-buffer":
        storageLocation = `buf.${strategy.prefix}`;
        needDeclare = false;
        break;
      default:
        throw new Error(`TODO: emitCppCallToVariant for ${inspect(strategy)}`);
    }

    const jsValueRef = `arg${i}.value()`;

    /** If JavaScript may pass null or undefined */
    const isOptionalToUser = type.flags.optional || "default" in type.flags;
    /** If the final representation may include null */
    const isNullable = type.flags.optional && !("default" in type.flags);

    if (isOptionalToUser) {
      if (needDeclare) {
        addHeaderForType(type);
        cpp.line(`${type.cppName()} ${storageLocation};`);
      }
      const isUndefinedOrNull = type.flags.nonNull ? "isUndefined" : "isUndefinedOrNull";
      if (isNullable) {
        assert(strategy.type === "uses-communication-buffer");
        cpp.line(`if ((${storageLocation}Set = !${jsValueRef}.${isUndefinedOrNull}())) {`);
        storageLocation = `${storageLocation}Value`;
      } else {
        cpp.line(`if (!${jsValueRef}.${isUndefinedOrNull}()) {`);
      }
      cpp.indent();
      emitConvertValue(storageLocation, arg.type, jsValueRef, exceptionContext, isOptionalToUser, "assign");
      cpp.dedent();
      if ("default" in type.flags) {
        cpp.line(`} else {`);
        cpp.indent();
        cpp.add(`${storageLocation} = `);
        type.emitCppDefaultValue(cpp);
        cpp.line(";");
        cpp.dedent();
      } else {
        assert(isNullable);
      }
      cpp.line(`}`);
    } else {
      emitConvertValue(
        storageLocation,
        arg.type,
        jsValueRef,
        exceptionContext,
        isOptionalToUser,
        needDeclare ? "declare" : "assign",
      );
    }

    i += 1;
  }

  const returnStrategy = variant.returnStrategy!;
  switch (returnStrategy.type) {
    case "jsvalue":
      cpp.line(`return ${dispatchFunctionName}(`);
      break;
    case "basic-out-param":
      cpp.line(`${cAbiTypeName(returnStrategy.abiType)} out;`);
      cpp.line(`if (!${dispatchFunctionName}(`);
      break;
    case "void":
      cpp.line(`if (!${dispatchFunctionName}(`);
      break;
    default:
      throw new Error(`TODO: emitCppCallToVariant for ${inspect(returnStrategy)}`);
  }

  let emittedFirstArgument = false;
  function addCommaAfterArgument() {
    if (emittedFirstArgument) {
      cpp.line(",");
    } else {
      emittedFirstArgument = true;
    }
  }

  const totalArgs = variant.args.length;
  i = 0;
  cpp.indent();

  if (variant.globalObjectArg === "hidden") {
    addCommaAfterArgument();
    cpp.add("global");
  }

  for (const arg of variant.args) {
    i += 1;
    if (arg.type.isIgnoredUndefinedType()) continue;

    if (arg.type.isVirtualArgument()) {
      switch (arg.type.kind) {
        case "zigVirtualMachine":
        case "globalObject":
          addCommaAfterArgument();
          cpp.add("global");
          break;
        default:
          throw new Error(`TODO: emitCppCallToVariant for ${inspect(arg.type)}`);
      }
    } else {
      const storageLocation = `arg${cap(arg.name)}`;
      const strategy = arg.loweringStrategy!;
      switch (strategy.type) {
        case "c-abi-pointer":
          addCommaAfterArgument();
          cpp.add(`&${storageLocation}`);
          break;
        case "c-abi-value":
          addCommaAfterArgument();
          cpp.add(`${storageLocation}`);
          break;
        case "uses-communication-buffer":
          break;
        default:
          throw new Error(`TODO: emitCppCallToVariant for ${inspect(strategy)}`);
      }
    }
  }

  if (communicationStruct) {
    addCommaAfterArgument();
    cpp.add("&buf");
  }

  switch (returnStrategy.type) {
    case "jsvalue":
      cpp.dedent();
      if (totalArgs === 0) {
        cpp.trimLastNewline();
      }
      cpp.line(");");
      break;
    case "void":
      cpp.dedent();
      cpp.line(")) {");
      cpp.line(`    return {};`);
      cpp.line("}");
      cpp.line("return JSC::JSValue::encode(JSC::jsUndefined());");
      break;
    case "basic-out-param":
      addCommaAfterArgument();
      cpp.add("&out");
      cpp.line();
      cpp.dedent();
      cpp.line(")) {");
      cpp.line(`    return {};`);
      cpp.line("}");
      const simpleType = getSimpleIdlType(variant.ret);
      if (simpleType) {
        cpp.line(`return JSC::JSValue::encode(WebCore::toJS<${simpleType}>(*global, out));`);
        break;
      }
      switch (variant.ret.kind) {
        case "UTF8String":
        case "USVString":
        case "ByteString":
          // already validated against
          assert(false);
        case "DOMString":
          cpp.line(`return JSC::JSValue::encode(WebCore::toJS<WebCore::IDLDOMString>(*global, out));`);
          break;
        case "BunString":
          cpp.line(`JSC::JSValue js = JSC::jsString(vm, out.toWTFString());`);
          cpp.line(`out.deref();`);
          cpp.line(`return JSC::JSValue::encode(js);`);
          break;
      }
      break;
    default:
      throw new Error(`TODO: emitCppCallToVariant for ${inspect(returnStrategy)}`);
  }
}

function ensureHeader(filename: string, reason?: string) {
  if (!headers.has(filename)) {
    headers.set(filename, reason || "");
  }
}

/** If a simple IDL type mapping exists, it also currently means there is a direct C ABI mapping */
function getSimpleIdlType(type: TypeImpl): string | undefined {
  const map: { [K in TypeKind]?: string } = {
    boolean: "WebCore::IDLBoolean",
    undefined: "WebCore::IDLUndefined",
    usize: "WebCore::IDLUnsignedLongLong",
    u8: "WebCore::IDLOctet",
    u16: "WebCore::IDLUnsignedShort",
    u32: "WebCore::IDLUnsignedLong",
    u64: "WebCore::IDLUnsignedLongLong",
    i8: "WebCore::IDLByte",
    i16: "WebCore::IDLShort",
    i32: "WebCore::IDLLong",
    i64: "WebCore::IDLLongLong",
  };
  let entry = map[type.kind];
  if (!entry) {
    switch (type.kind) {
      case "f64":
        entry = type.flags.finite //
          ? "WebCore::IDLDouble"
          : "WebCore::IDLUnrestrictedDouble";
        break;
      case "stringEnum":
      case "zigEnum":
        // const cType = cAbiTypeForEnum(type.data.length);
        // entry = map[cType as IntegerTypeKind]!;
        entry = `WebCore::IDLEnumeration<${type.cppClassName()}>`;
        break;
      default:
        return;
    }
  }

  if (type.flags.range) {
    const { range, nodeValidator } = type.flags;
    if ((range[0] === "enforce" && range[1] !== "abi") || nodeValidator) {
      if (nodeValidator) assert(nodeValidator === NodeValidator.validateInteger); // TODO?

      const [abiMin, abiMax] = cAbiIntegerLimits(type.kind as CAbiType);
      let [_, min, max] = range as [string, bigint | number | "abi", bigint | number | "abi"];
      if (min === "abi") min = abiMin;
      if (max === "abi") max = abiMax;

      ensureHeader("BindgenCustomEnforceRange.h");
      entry = `Bun::BindgenCustomEnforceRange<${cAbiTypeName(type.kind as CAbiType)}, ${min}, ${max}, Bun::BindgenCustomEnforceRangeKind::${
        nodeValidator ? "Node" : "Web"
      }>`;
    } else {
      const rangeAdaptor = {
        "clamp": "WebCore::IDLClampAdaptor",
        "enforce": "WebCore::IDLEnforceRangeAdaptor",
      }[range[0]];
      assert(rangeAdaptor);
      entry = `${rangeAdaptor}<${entry}>`;
    }
  }

  return entry;
}

type ExceptionContext =
  | { type: "none" }
  | { type: "argument"; argIndex: number; argName: string; className: string; functionName: string };

function emitConvertValue(
  storageLocation: string,
  type: TypeImpl,
  jsValueRef: string,
  exceptionContext: ExceptionContext,
  isOptionalToUser: boolean,
  decl: "declare" | "assign",
) {
  if (decl === "declare") {
    addHeaderForType(type);
  }

  const simpleType = getSimpleIdlType(type);
  if (simpleType) {
    const cAbiType = type.canDirectlyMapToCAbi();
    assert(cAbiType);
    let exceptionHandler: ExceptionHandler | null = null;
    switch (exceptionContext.type) {
      case "none":
        break;
      case "argument":
        exceptionHandler = getIDLExceptionHandler(type, exceptionContext, jsValueRef, isOptionalToUser);
    }

    if (decl === "declare") {
      cpp.add(`${type.cppName()} `);
    }

    let exceptionHandlerText = exceptionHandler ? `, ${exceptionHandler.params} { ${exceptionHandler.body} }` : "";
    cpp.line(`${storageLocation} = WebCore::convert<${simpleType}>(*global, ${jsValueRef}${exceptionHandlerText});`);

    if (type.flags.range && type.flags.range[0] === "clamp" && type.flags.range[1] !== "abi") {
      emitRangeModifierCheck(cAbiType, storageLocation, type.flags.range);
    }

    cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);
  } else {
    switch (type.kind) {
      case "any": {
        if (decl === "declare") {
          cpp.add(`${type.cppName()} `);
        }
        cpp.line(`${storageLocation} = JSC::JSValue::encode(${jsValueRef});`);
        break;
      }
      case "USVString":
      case "DOMString":
      case "ByteString": {
        const temp = cpp.nextTemporaryName("wtfString");
        cpp.line(`WTF::String ${temp} = WebCore::convert<WebCore::IDL${type.kind}>(*global, ${jsValueRef});`);
        cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);

        if (decl === "declare") {
          cpp.add(`${type.cppName()} `);
        }
        cpp.line(`${storageLocation} = ${temp}.impl();`);
        break;
      }
      case "UTF8String":
      case "BunString": {
        const temp = cpp.nextTemporaryName("wtfString");
        cpp.line(`WTF::String ${temp} = WebCore::convert<WebCore::IDLDOMString>(*global, ${jsValueRef});`);
        cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);

        if (decl === "declare") {
          cpp.add(`${type.cppName()} `);
        }
        cpp.line(`${storageLocation} = Bun::toString(${temp});`);
        break;
      }
      case "dictionary": {
        if (decl === "declare") {
          cpp.line(`${type.cppName()} ${storageLocation};`);
        }
        cpp.line(`if (!convert${type.cppInternalName()}(&${storageLocation}, global, ${jsValueRef}))`);
        cpp.indent();
        cpp.line(`return {};`);
        cpp.dedent();
        break;
      }
      case "customZig": {
        cpp.line(`${storageLocation} = JSC::JSValue::encode(${jsValueRef});`);
        const customZig = type.data as CustomZig;
        if (customZig.validateFunction) {
          ensureCppHasValidationForwardDecl(customZig);
          cpp.line(`if (!${extCustomZigValidator(customZig.validateFunction)}(${storageLocation})) {`);
          cpp.indent();
          cpp.line(
            getCppThrowNodeJsTypeError("global", exceptionContext, customZig.validateErrorDescription!, jsValueRef),
          );
          cpp.line(`return {};`);
          cpp.dedent();
          cpp.line(`}`);
        }
        break;
      }
      case "customCpp": {
        const customCpp = type.data as CustomCpp;
        const headers = typeof customCpp.header === "string" ? [customCpp.header] : customCpp.header;
        for (const arg of headers) {
          ensureHeader(arg, `customCpp ${customCpp.zigType ?? customCpp.cppType}`);
        }
        if (decl === "declare") {
          cpp.line(`${type.cppName()} ${storageLocation};`);
        }
        cpp.line(
          `if (!${customCpp.fromJSFunction}(${customCpp.fromJSArgs.map(x => mapCustomCppArg(x, jsValueRef, storageLocation))})) {`,
        );
        cpp.indent();
        cpp.line(
          getCppThrowNodeJsTypeError("global", exceptionContext, customCpp.validateErrorDescription!, jsValueRef),
        );
        cpp.line(`return {};`);
        cpp.dedent();
        cpp.line(`}`);
        break;
      }
      case "any": {
        cpp.line(`${storageLocation} = JSC::JSValue::encode(${jsValueRef});`);
        break;
      }
      default:
        throw new Error(`TODO: emitConvertValue for Type ${type.kind}`);
    }
  }
}

function ensureCppHasValidationForwardDecl({ validateFunction }: CustomZig) {
  assert(validateFunction);
  if (emittedZigValidateFunctions.has(validateFunction)) return;
  emittedZigValidateFunctions.add(validateFunction);
  cppInternal.line(`extern "C" bool ${extCustomZigValidator(validateFunction)}(JSC::EncodedJSValue);`);

  zigInternal.line(`pub export fn ${extCustomZigValidator(validateFunction)}(value: JSValue) bool {`);
  zigInternal.indent();
  zigInternal.line(`return ${validateFunction}(value);`);
  zigInternal.dedent();
  zigInternal.line("}");
}

function getCppThrowNodeJsTypeError(
  global: string,
  exceptionContext: ExceptionContext,
  message: string,
  jsValueRef: string,
) {
  let argumentOrProperty = "";
  if (exceptionContext.type === "argument") {
    argumentOrProperty = `\"${exceptionContext.argName}\" argument`;
  } else {
    assert(exceptionContext.type !== "none"); // missing info on what to throw
    throw new Error(`TODO: implement exception thrower for type error`);
  }
  ensureHeader("BindgenNodeErrors.h");
  const desc = message;
  return `throwNodeInvalidArgTypeErrorForBindgen(throwScope, ${global}, ${str(argumentOrProperty)}_s, ${str(desc)}_s, ${jsValueRef});`;
}

function getCppThrowNodeJsValueError(
  global: string,
  exceptionContext: ExceptionContext,
  message: string,
  jsValueRef: string,
) {
  let argumentOrProperty = "";
  if (exceptionContext.type === "argument") {
    argumentOrProperty = `argument '${exceptionContext.argName}'`;
  } else {
    assert(exceptionContext.type !== "none"); // missing info on what to throw
    throw new Error(`TODO: implement exception thrower for type error`);
  }
  ensureHeader("BindgenNodeErrors.h");
  const desc = message;
  return `throwNodeInvalidArgValueErrorForBindgen(throwScope, ${global}, ${str(argumentOrProperty)}_s, ${str(desc)}_s, ${jsValueRef});`;
}

interface ExceptionHandler {
  /** @example "[](JSC::JSGlobalObject& global, ThrowScope& scope)" */
  params: string;
  /** @example "WebCore::throwTypeError(global, scope)" */
  body: string;
}

function getIDLExceptionHandler(
  type: TypeImpl,
  context: ExceptionContext,
  jsValueRef: string,
  // optionality depends on the context
  isOptional: boolean,
): ExceptionHandler | null {
  const { nodeValidator } = type.flags;
  if (nodeValidator) {
    switch (nodeValidator) {
      case NodeValidator.validateInteger:
        ensureHeader("ErrorCode.h");
        assert(context.type === "argument"); // TODO:
        return {
          params: `[]()`,
          body: `return ${str(context.argName)}_s;`,
        };
      default:
        throw new Error(`TODO: implement exception thrower for node validator ${nodeValidator}`);
    }
  }
  switch (type.kind) {
    case "zigEnum":
    case "stringEnum": {
      // This is what validateOneOf in Node.js does, which is higher quality
      // than webkit's enum error.
      const values: string[] =
        type.kind === "stringEnum" //
          ? type.data.map(x => `'${x}'`)
          : zigEnums.get(type.hash())!.variants.map(x => `'${x.name}'`);
      if (isOptional) {
        if (!type.flags.nonNull) values.push("null");
        values.push("undefined");
      }
      return {
        // TODO: avoid &
        params: `[&](JSC::JSGlobalObject& global, JSC::ThrowScope& scope)`,
        body: getCppThrowNodeJsValueError("&global", context, "one of: " + values.join(", "), jsValueRef),
      };
    }
  }
  return null;
}

/**
 * The built in WebCore range adaptors do not support arbitrary ranges, but that
 * is something we want to have. They aren't common, so they are just tacked
 * onto the webkit one.
 */
function emitRangeModifierCheck(
  cAbiType: CAbiType,
  storageLocation: string,
  range: ["clamp" | "enforce", bigint, bigint],
) {
  const [kind, min, max] = range;
  if (kind === "clamp") {
    cpp.line(`if (${storageLocation} < ${min}) ${storageLocation} = ${min};`);
    cpp.line(`else if (${storageLocation} > ${max}) ${storageLocation} = ${max};`);
  } else {
    // Implemented in BindgenCustomEnforceRange
    throw new Error(`This should not be called for 'enforceRange' types.`);
  }
}

function addHeaderForType(type: TypeImpl) {
  if (type.lowersToNamedType()) {
    ensureHeader(`Generated${pascal(type.ownerFileBasename())}.h`);
  }
}

function emitConvertDictionaryFunction(type: TypeImpl) {
  assert(type.kind === "dictionary");
  const fields = type.data as DictionaryField[];

  addHeaderForType(type);

  cpp.line(`// Internal dictionary parse for ${type.name()}`);
  cpp.line(
    `bool convert${type.cppInternalName()}(${type.cppName()}* result, JSC::JSGlobalObject* global, JSC::JSValue value) {`,
  );
  cpp.indent();

  cpp.line(`auto& vm = JSC::getVM(global);`);
  cpp.line(`auto throwScope = DECLARE_THROW_SCOPE(vm);`);
  cpp.line(`bool isNullOrUndefined = value.isUndefinedOrNull();`);
  cpp.line(`auto* object = isNullOrUndefined ? nullptr : value.getObject();`);
  cpp.line(`if (UNLIKELY(!isNullOrUndefined && !object)) {`);
  cpp.line(`    throwTypeError(global, throwScope);`);
  cpp.line(`    return false;`);
  cpp.line(`}`);
  cpp.line(`JSC::JSValue propValue;`);

  for (const field of fields) {
    const { key, type: fieldType } = field;
    cpp.line("// " + key);
    cpp.line(`if (isNullOrUndefined) {`);
    cpp.line(`    propValue = JSC::jsUndefined();`);
    cpp.line(`} else {`);
    ensureHeader("ObjectBindings.h");
    cpp.line(
      `    propValue = Bun::getIfPropertyExistsPrototypePollutionMitigation(vm, global, object, JSC::Identifier::fromString(vm, ${str(key)}_s));`,
    );
    cpp.line(`    RETURN_IF_EXCEPTION(throwScope, false);`);
    cpp.line(`}`);
    cpp.line(`if (!propValue.isUndefined()) {`);
    cpp.indent();
    const isOptional = !type.flags.required || "default" in fieldType.flags;
    emitConvertValue(`result->${key}`, fieldType, "propValue", { type: "none" }, isOptional, "assign");
    cpp.dedent();
    cpp.line(`} else {`);
    cpp.indent();
    if (type.flags.required) {
      cpp.line(`throwTypeError(global, throwScope);`);
      cpp.line(`return false;`);
    } else if ("default" in fieldType.flags) {
      cpp.add(`result->${key} = `);
      fieldType.emitCppDefaultValue(cpp);
      cpp.line(";");
    } else {
      throw new Error(`TODO: optional dictionary field`);
    }
    cpp.dedent();
    cpp.line(`}`);
  }

  cpp.line(`return true;`);
  cpp.dedent();
  cpp.line(`}`);
  cpp.line();
}

function emitZigStruct(type: TypeImpl) {
  zig.add(`${type.flags.exported ? "pub " : ""}const ${type.name()} = `);

  switch (type.kind) {
    case "zigEnum": {
      const zigEnum = zigEnums.get(type.hash())!;
      zig.line(`@import(${str(path.relative(src + "bun.js/bindings", zigEnum.file))}).${zigEnum.name};`);
      return;
    }
    case "stringEnum": {
      const tagType = `u${alignForward(type.data.length, 8)}`;
      zig.line(`enum(${tagType}) {`);
      zig.indent();
      for (const value of type.data) {
        zig.line(`${snake(value)},`);
      }
      zig.dedent();
      zig.line("};");
      return;
    }
  }

  const externLayout = type.canDirectlyMapToCAbi();
  if (externLayout) {
    if (typeof externLayout === "string") {
      zig.line(externLayout + ";");
    } else {
      externLayout.emitZig(zig, "with-semi");
    }
    return;
  }

  switch (type.kind) {
    case "dictionary": {
      zig.line("struct {");
      zig.indent();
      for (const { key, type: fieldType } of type.data as DictionaryField[]) {
        zig.line(`    ${snake(key)}: ${zigTypeName(fieldType)},`);
      }
      zig.dedent();
      zig.line(`};`);
      break;
    }
    default: {
      throw new Error(`TODO: emitZigStruct for Type ${type.kind}`);
    }
  }
}

function emitCppStructHeader(w: CodeWriter, type: TypeImpl) {
  if (type.kind === "zigEnum" || type.kind === "stringEnum") {
    emitCppEnumHeader(w, type);
    return;
  }

  const externLayout = type.canDirectlyMapToCAbi();
  if (externLayout) {
    if (typeof externLayout === "string") {
      w.line(`typedef ${cAbiTypeName(externLayout)} ${type.name()};`);
    } else {
      externLayout.emitCpp(w, type.name());
      w.line();
    }
    return;
  }

  switch (type.kind) {
    default: {
      throw new Error(`TODO: emitZigStruct for Type ${type.kind}`);
    }
  }
}

function emitCppEnumHeader(w: CodeWriter, type: TypeImpl) {
  if (type.kind === "stringEnum") {
    const intBits = alignForward(type.data.length, 8);
    const tagType = `uint${intBits}_t`;
    w.line(`enum class ${type.name()} : ${tagType} {`);
    for (const value of type.data) {
      w.line(`    ${pascal(value)},`);
    }
    w.line(`};`);
    w.line();
  } else if (type.kind === "zigEnum") {
    const zigEnum = zigEnums.get(type.hash())!;
    w.line(`enum class ${type.name()} : ${cAbiTypeName(zigEnum.tag)} {`);
    w.indent();
    for (const value of zigEnum.variants) {
      w.line(`${pascal(value.name)} = ${value.value},`);
    }
    w.dedent();
    w.line("};");
  }
}

// This function assumes in the WebCore namespace
function emitConvertEnumFunction(w: CodeWriter, type: TypeImpl) {
  assert(type.kind === "zigEnum" || type.kind === "stringEnum");
  const values =
    type.kind === "stringEnum"
      ? //
        type.data.map((name, i) => ({ name, value: i }))
      : zigEnums.get(type.hash())!.variants;
  assert(values.length > 0);

  const name = "Generated::" + type.cppName();
  ensureHeader("JavaScriptCore/JSCInlines.h");
  ensureHeader("JavaScriptCore/JSString.h");
  ensureHeader("wtf/NeverDestroyed.h");
  ensureHeader("wtf/SortedArrayMap.h");

  const sortedValues = values.slice().sort((a, b) => {
    // sorted by name
    return a.name.localeCompare(b.name);
  });

  w.line(`String convertEnumerationToString(${name} enumerationValue) {`);
  w.indent();
  if (type.kind === "stringEnum") {
    w.line(`static const NeverDestroyed<String> values[] = {`);
    w.indent();
    for (const value of values) {
      w.line(`MAKE_STATIC_STRING_IMPL(${str(value.name)}),`);
    }
    w.dedent();
    w.line(`};`);
    w.line(`return values[static_cast<size_t>(enumerationValue)];`);
  } else {
    // Cannot guarantee that the enum values are contiguous.
    w.line(`switch (enumerationValue) {`);
    w.indent();
    for (const value of values) {
      w.line(`case ${name}::${pascal(value.name)}: return MAKE_STATIC_STRING_IMPL(${str(value.name)});`);
    }
    w.line(`default: RELEASE_ASSERT_NOT_REACHED();`);
    w.dedent();
    w.line("};");
  }
  w.dedent();
  w.line(`}`);
  w.line();
  w.line(`template<> JSString* convertEnumerationToJS(JSC::JSGlobalObject& global, ${name} enumerationValue) {`);
  w.line(`    return jsStringWithCache(global.vm(), convertEnumerationToString(enumerationValue));`);
  w.line(`}`);
  w.line();
  w.line(`template<> std::optional<${name}> parseEnumerationFromString<${name}>(const String& stringValue)`);
  w.line(`{`);
  w.line(`    static constexpr std::pair<ComparableASCIILiteral, ${name}> mappings[] = {`);
  for (const value of sortedValues) {
    w.line(`        { ${str(value.name)}_s, ${name}::${pascal(value.name)} },`);
  }
  w.line(`    };`);
  w.line(`    static constexpr SortedArrayMap enumerationMapping { mappings };`);
  w.line(`    if (auto* enumerationValue = enumerationMapping.tryGet(stringValue); LIKELY(enumerationValue))`);
  w.line(`        return *enumerationValue;`);
  w.line(`    return std::nullopt;`);
  w.line(`}`);
  w.line();
  w.line(
    `template<> std::optional<${name}> parseEnumeration<${name}>(JSGlobalObject& lexicalGlobalObject, JSValue value)`,
  );
  w.line(`{`);
  w.line(`    return parseEnumerationFromString<${name}>(value.toWTFString(&lexicalGlobalObject));`);
  w.line(`}`);
  w.line();
  w.line(`template<> ASCIILiteral expectedEnumerationValues<${name}>()`);
  w.line(`{`);
  w.line(`    return ${str(values.map(value => `${str(value.name)}`).join(", "))}_s;`);
  w.line(`}`);
  w.line();
}

function zigTypeName(type: TypeImpl): string {
  let name = zigTypeNameInner(type);
  if (type.flags.optional) {
    name = "?" + name;
  }
  return name;
}

function zigTypeNameInner(type: TypeImpl): string {
  if (type.lowersToNamedType()) {
    const namespace = typeHashToNamespace.get(type.hash());
    return namespace ? `${namespace}.${type.name()}` : type.name();
  }
  switch (type.kind) {
    case "globalObject":
    case "zigVirtualMachine":
      return "*JSC.JSGlobalObject";
    case "customCpp": {
      const customCpp = type.data as CustomCpp;
      assert(customCpp.zigType);
      return customCpp.zigType;
    }
    default:
      const cAbiType = type.canDirectlyMapToCAbi();
      if (cAbiType) {
        if (typeof cAbiType === "string") {
          return cAbiType;
        }
        return cAbiType.name();
      }
      throw new Error(`TODO: emitZigTypeName for Type ${type.kind}`);
  }
}

function returnStrategyCppType(strategy: ReturnStrategy): string {
  switch (strategy.type) {
    case "basic-out-param":
    case "void":
      return "bool"; // true=success, false=exception
    case "jsvalue":
      return "JSC::EncodedJSValue";
    default:
      throw new Error(
        `TODO: returnStrategyCppType for ${Bun.inspect(strategy satisfies never, { colors: Bun.enableANSIColors })}`,
      );
  }
}

function returnStrategyZigType(strategy: ReturnStrategy): string {
  switch (strategy.type) {
    case "basic-out-param":
    case "void":
      return "bool"; // true=success, false=exception
    case "jsvalue":
      return "JSValue";
    default:
      throw new Error(
        `TODO: returnStrategyZigType for ${Bun.inspect(strategy satisfies never, { colors: Bun.enableANSIColors })}`,
      );
  }
}

function typeHasComplexControlFlow(type: TypeImpl): boolean {
  if (type.kind === "customZig") {
    return (type.data as CustomZig).deinitMethod !== undefined;
  }
  return false;
}

function emitNullableZigDecoder(
  argsWriter: CodeWriter,
  prefix: string,
  type: TypeImpl,
  children: ArgStrategyChildItem[],
) {
  assert(children.length > 0);
  const indent = children[0].type !== "c-abi-compatible";
  argsWriter.add(`if (${prefix}_set)`);
  if (indent) {
    argsWriter.indent();
  } else {
    argsWriter.add(` `);
  }
  emitComplexZigDecoder(argsWriter, prefix + "_value", type, children);
  if (indent) {
    argsWriter.line();
    argsWriter.dedent();
  } else {
    argsWriter.add(` `);
  }
  argsWriter.add(`else`);
  if (indent) {
    argsWriter.indent();
  } else {
    argsWriter.add(` `);
  }
  argsWriter.add(`null`);
  if (indent) argsWriter.dedent();
}

function emitComplexZigDecoder(
  argsWriter: CodeWriter,
  prefix: string,
  type: TypeImpl,
  children: ArgStrategyChildItem[],
) {
  assert(children.length > 0);
  switch (type.kind) {
    case "boolean":
    case "u8":
    case "i32":
    case "i64":
    case "usize":
    case "u16":
    case "u32":
    case "u64":
    case "customCpp":
      argsWriter.add(`${prefix}`);
      break;
    case "customZig": {
      const customZig = type.data as CustomZig;
      argsWriter.add(
        `${customZig.fromJSFunction}(${customZig.fromJSArgs.map(arg => mapCustomZigArg(arg, prefix)).join(", ")})`,
      );
      if (customZig.fromJSReturn === "error") {
        argsWriter.line(` catch |err| switch (err) {`);
        argsWriter.indent();
        argsWriter.line(`error.JSError => return false,`);
        argsWriter.line(`error.OutOfMemory => global.throwOutOfMemory() catch return false,`);
        argsWriter.dedent();
        argsWriter.add(`}`);
      } else if (customZig.fromJSReturn === "optional") {
        argsWriter.line(` orelse {`);
        argsWriter.line(`    @panic("TODO");`);
        argsWriter.add(`}`);
      }
      break;
    }
    default:
      throw new Error(`TODO: emitComplexZigDecoder for Type ${type.kind}`);
  }
}

function emitZigDeinitializer(w: CodeWriter, name: string, type: TypeImpl, children: ArgStrategyChildItem[]) {
  assert(children.length > 0);
  w.add("defer ");
  const isOptional = type.flags.optional && !("default" in type.flags);
  if (isOptional) {
    w.add(`if (${name}) |v| `);
    name = "v";
  }
  switch (type.kind) {
    case "customZig":
      const customZig = type.data as CustomZig;
      w.add(
        `${name}.${customZig.deinitMethod}(${(customZig.deinitArgs ?? []).map(arg => mapCustomZigArg(arg, name)).join(", ")});`,
      );
      break;
    default:
      throw new Error(`TODO: emitZigDeinitializer for Type ${type.kind}`);
  }
  w.line();
}

function mapCustomZigArg(arg: CustomZigArg, name: string) {
  if (typeof arg === "string") {
    switch (arg) {
      case "allocator":
        return "bun.default_allocator";
      case "global":
        return "global";
      case "value":
        return name;
    }
  }
  return arg.text;
}

function mapCustomCppArg(arg: CustomCppArg, name: string, storageLocation) {
  if (typeof arg === "string") {
    switch (arg) {
      case "global":
        return "global";
      case "value":
        return name;
      case "encoded-value":
        return `JSC::JSValue::encode(${name})`;
      case "out":
        return "&" + storageLocation;
    }
  }
  return arg.text;
}

function throwAt(message: string, caller: string) {
  const err = new Error(message);
  err.stack = `Error: ${message}\n${caller}`;
  throw err;
}

type DistinguishablePrimitive = "undefined" | "string" | "number" | "boolean" | "object";
type DistinguishStrategy = DistinguishablePrimitive;

function typeCanDistinguish(t: TypeImpl[]) {
  const seen: Record<DistinguishablePrimitive, boolean> = {
    undefined: false,
    string: false,
    number: false,
    boolean: false,
    object: false,
  };
  let strategies: DistinguishStrategy[] = [];

  for (const type of t) {
    let primitive: DistinguishablePrimitive | null = null;
    if (type.kind === "undefined") {
      primitive = "undefined";
    } else if (type.isStringType()) {
      primitive = "string";
    } else if (type.isNumberType()) {
      primitive = "number";
    } else if (type.kind === "boolean") {
      primitive = "boolean";
    } else if (type.isObjectType()) {
      primitive = "object";
    }
    if (primitive) {
      if (seen[primitive]) {
        return null;
      }
      seen[primitive] = true;
      strategies.push(primitive);
      continue;
    }
    return null; // TODO:
  }

  return strategies;
}

/** This is an arbitrary classifier to allow consistent sorting for distinguishing arguments */
function typeDistinguishmentWeight(type: TypeImpl): number {
  if (type.kind === "undefined") {
    return 100;
  }

  if (type.isObjectType()) {
    return 10;
  }

  if (type.isStringType()) {
    return 5;
  }

  if (type.isNumberType()) {
    return 3;
  }

  if (type.kind === "boolean") {
    return -1;
  }

  return 0;
}

function getDistinguishCode(strategy: DistinguishStrategy, type: TypeImpl, value: string) {
  switch (strategy) {
    case "string":
      return { condition: `${value}.isString()`, canThrow: false };
    case "number":
      return { condition: `${value}.isNumber()`, canThrow: false };
    case "boolean":
      return { condition: `${value}.isBoolean()`, canThrow: false };
    case "object":
      return { condition: `${value}.isObject()`, canThrow: false };
    case "undefined":
      return { condition: `${value}.isUndefined()`, canThrow: false };
    default:
      throw new Error(`TODO: getDistinguishCode for ${strategy}`);
  }
}

/** The variation selector implementation decides which variation dispatch to call. */
function emitCppVariationSelector(fn: Func, namespaceVar: string) {
  let minRequiredArgs = Infinity;
  let maxArgs = 0;

  const variationsByArgumentCount = new Map<number, Variant[]>();

  const pushToList = (argCount: number, vari: Variant) => {
    assert(typeof argCount === "number");
    let list = variationsByArgumentCount.get(argCount);
    if (!list) {
      list = [];
      variationsByArgumentCount.set(argCount, list);
    }
    list.push(vari);
  };

  for (const vari of fn.variants) {
    const vmra = vari.minRequiredArgs;
    minRequiredArgs = Math.min(minRequiredArgs, vmra);
    maxArgs = Math.max(maxArgs, vari.args.length);
    const allArgCount = vari.args.filter(arg => !arg.type.isVirtualArgument()).length;
    pushToList(vmra, vari);
    if (allArgCount != vmra) {
      pushToList(allArgCount, vari);
    }
  }

  cpp.line(`auto& vm = JSC::getVM(global);`);
  cpp.line(`auto throwScope = DECLARE_THROW_SCOPE(vm);`);
  if (minRequiredArgs > 0) {
    cpp.line(`size_t argumentCount = std::min<size_t>(callFrame->argumentCount(), ${maxArgs});`);
    cpp.line(`if (argumentCount < ${minRequiredArgs}) {`);
    cpp.line(`    return JSC::throwVMError(global, throwScope, createNotEnoughArgumentsError(global));`);
    cpp.line(`}`);
  }

  const sorted = [...variationsByArgumentCount.entries()]
    .map(([key, value]) => ({ argCount: key, variants: value }))
    .sort((a, b) => b.argCount - a.argCount);
  let argCountI = 0;
  for (const { argCount, variants } of sorted) {
    argCountI++;
    const checkArgCount = argCountI < sorted.length && argCount !== minRequiredArgs;
    if (checkArgCount) {
      cpp.line(`if (argumentCount >= ${argCount}) {`);
      cpp.indent();
    }

    if (variants.length === 1) {
      cpp.line(`return ${extInternalDispatchVariant(namespaceVar, fn.name, variants[0].suffix)}(global, callFrame);`);
    } else {
      let argIndex = 0;
      let strategies: DistinguishStrategy[] | null = null;
      while (argIndex < argCount) {
        strategies = typeCanDistinguish(
          variants.map(v => v.args.filter(v => !v.type.isVirtualArgument())[argIndex].type),
        );
        if (strategies) {
          break;
        }
        argIndex++;
      }
      if (!strategies) {
        const err = new Error(
          `\x1b[0mVariations with ${argCount} required arguments must have at least one argument that can distinguish between them.\n` +
            `Variations:\n${variants.map(v => `    ${inspect(v.args.filter(a => !a.type.isVirtualArgument()).map(x => x.type))}`).join("\n")}`,
        );
        err.stack = `Error: ${err.message}\n${fn.snapshot}`;
        throw err;
      }

      const getArgument = minRequiredArgs > 0 ? "uncheckedArgument" : "argument";
      cpp.line(`JSC::JSValue distinguishingValue = callFrame->${getArgument}(${argIndex});`);
      const sortedVariants = variants
        .map((v, i) => ({
          variant: v,
          type: v.args.filter(a => !a.type.isVirtualArgument())[argIndex].type,
          strategy: strategies[i],
        }))
        .sort((a, b) => typeDistinguishmentWeight(a.type) - typeDistinguishmentWeight(b.type));
      for (const { variant: v, strategy: s } of sortedVariants) {
        const arg = v.args[argIndex];
        const { condition, canThrow } = getDistinguishCode(s, arg.type, "distinguishingValue");
        cpp.line(`if (${condition}) {`);
        cpp.indent();
        cpp.line(`return ${extInternalDispatchVariant(namespaceVar, fn.name, v.suffix)}(global, callFrame);`);
        cpp.dedent();
        cpp.line(`}`);
        if (canThrow) {
          cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);
        }
      }
    }

    if (checkArgCount) {
      cpp.dedent();
      cpp.line(`}`);
    }
  }
}

// BEGIN MAIN CODE GENERATION

const allZigFiles = readdirRecursiveWithExclusionsAndExtensionsSync(src, ["node_modules", ".git"], [".zig"]);
const unsortedFiles = readdirRecursiveWithExclusionsAndExtensionsSync(src, ["node_modules", ".git"], [".bind.ts"]);
// Sort for deterministic output
for (const fileName of [...unsortedFiles].sort()) {
  const zigFile = path.relative(src, fileName.replace(/\.bind\.ts$/, ".zig"));
  let file = files.get(zigFile);
  if (!file) {
    file = { functions: [], typedefs: [], anonTypedefs: [] };
    files.set(zigFile, file);
  }

  status(`Loading ${path.relative(src, fileName)}`);
  const exports = import.meta.require(fileName);

  // Mark all exported TypeImpl as reachable
  for (let [key, value] of Object.entries(exports)) {
    if (value == null || typeof value !== "object") continue;

    if (value instanceof TypeImpl) {
      value.assignName(key);
      value.markReachable();
      value.flags.exported = true;
      file.typedefs.push({ name: key, type: value });
    }

    if (value[isFunc]) {
      const func = value as Func;
      func.name = key;
      for (const vari of func.variants) {
        for (const arg of vari.args) {
          arg.type.markReachable();
        }
      }
    }
  }

  for (const fn of file.functions) {
    if (fn.name === "") {
      throwAt(`This function definition needs to be exported`, fn.snapshot);
    }
    fn.className ||= path.basename(zigFile, ".zig");
  }
}

for (const type of typeHashToReachableType.values()) {
  if (!type.flags.exported) {
    const ownerFile = files.get(type.ownerFile.slice(0, -".bind.ts".length) + ".zig");
    assert(ownerFile);
    ownerFile.anonTypedefs.push(type);
  }
}

const zig = new CodeWriter();
const zigInternal = new CodeWriter();
// TODO: split each *.bind file into a separate .cpp file
const cpp = new CodeWriter();
const cppInternal = new CodeWriter();
// Key: filename, Value: reason comment
const headers = new Map<string, string>();

zig.line('const bun = @import("root").bun;');
zig.line("const JSC = bun.JSC;");
zig.line("const JSValue = JSC.JSValue;");
zig.line("const JSHostFunctionType = JSC.JSHostFunctionType;\n");

zigInternal.line("const binding_internals = struct {");
zigInternal.indent();

cpp.line("namespace Generated {");
cpp.line();

cppInternal.line("// These definitions are for communication between C++ and Zig.");
cppInternal.line('// Field layout depends on implementation details in "bindgen.ts", and');
cppInternal.line("// is not intended for usage outside generated binding code.");

ensureHeader("root.h");
ensureHeader("IDLTypes.h");
ensureHeader("JSDOMBinding.h");
ensureHeader("JSDOMConvertBase.h");
ensureHeader("JSDOMConvertBoolean.h");
ensureHeader("JSDOMConvertNumbers.h");
ensureHeader("JSDOMConvertStrings.h");
ensureHeader("JSDOMExceptionHandling.h");
ensureHeader("JSDOMOperation.h");

/**
 * Indexed by `zigFile`, values are the generated zig identifier name, without
 * collisions.
 */
const fileMap = new Map<string, string>();
const fileNames = new Set<string>();

for (const [filename, { functions, typedefs, anonTypedefs }] of files) {
  const basename = path.basename(filename, ".zig");
  let varName = basename;
  if (fileNames.has(varName)) {
    throw new Error(`File name collision: ${basename}.zig`);
  }
  fileNames.add(varName);
  fileMap.set(filename, varName);

  if (functions.length === 0) continue;

  for (const td of typedefs) {
    typeHashToNamespace.set(td.type.hash(), varName);
  }
  for (const td of anonTypedefs) {
    typeHashToNamespace.set(td.hash(), varName);
  }
}

{
  const zigEnumCode = new CodeWriter();
  zigEnumCode.buffer += /* zig */ `pub const bun = @import("./bun.zig");

const std = @import("std");

pub fn main() !void {
    var buf = std.io.bufferedWriter(std.io.getStdOut().writer());
    defer buf.flush() catch {};
    const w = buf.writer();

    var jsonw = std.json.writeStream(w, .{ .whitespace = .indent_2 });

    try jsonw.beginArray();
    inline for (.{
`;
  zigEnumCode.level = 3;
  for (const zigEnum of zigEnums.values()) {
    const candidates = allZigFiles.filter(file => file.endsWith(path.sep + zigEnum.file));
    if (candidates.length === 0) {
      throwAt(`Cannot find a file named ${str(zigEnum.file)}`, zigEnum.snapshot);
      continue;
    }
    if (candidates.length > 1) {
      throwAt(`${str(zigEnum.file)} is not specific enough, matches: ${JSON.stringify(candidates)}`, zigEnum.snapshot);
      continue;
    }
    zigEnum.file = candidates[0];
    zigEnumCode.line(`@import(${str(path.relative(src, zigEnum.file))}).${zigEnum.name},`);
  }
  zigEnumCode.level = 0;
  zigEnumCode.buffer += `    }) |enum_type| {
        try jsonw.beginObject();

        try jsonw.objectField("tag");
        const tag_int = @typeInfo(@typeInfo(enum_type).Enum.tag_type).Int;
        const tag_rounded = std.fmt.comptimePrint("{c}{d}", .{
            switch (tag_int.signedness) {
                .signed => 'i',
                .unsigned => 'u',
            },
            comptime std.mem.alignForward(u16, tag_int.bits, 8),
        });
        try jsonw.write(tag_rounded);

        try jsonw.objectField("values");
        try jsonw.beginArray();

        for (std.enums.values(enum_type)) |tag| {
            try jsonw.beginObject();

            try jsonw.objectField("name");
            try jsonw.write(@tagName(tag));

            try jsonw.objectField("value");
            try jsonw.write(@as(i52, @intFromEnum(tag)));

            try jsonw.endObject();
        }

        try jsonw.endArray();
        try jsonw.endObject();
    }
    try jsonw.endArray();
    jsonw.deinit();
}
`;
  status(`Extracting ${zigEnums.size} enum definitions`);
  writeIfNotChanged(path.join(src, "generated_enum_extractor.zig"), zigEnumCode.buffer);
  const generatedBindingsFile = path.join(src, "bun.js/bindings/GeneratedBindings.zig");
  if (!fs.existsSync(generatedBindingsFile)) {
    fs.writeFileSync(generatedBindingsFile, "// stub for code generator");
  }
  const result = Bun.spawnSync({
    cmd: [zigPath, "build", "enum-extractor", "-Dno-compiler-info", "-Dignore-missing-generated-paths"],
    stdio: ["inherit", "pipe", "inherit"],
  });
  if (!result.success) {
    console.error("Failed to extract enums, see above for the error.");
    console.error("");
    console.error("If you just added a new t.zigEnum, check the file for top-level comptime blocks,");
    console.error("they may need to add new checks for `if (bun.Environment.export_cpp_apis)` to");
    console.error("avoid exporting and referencing code when being compiled from the code generator.");
    console.error("");
    console.error("If that does not work, then move the desired Zig enum to a new file, or consider");
    console.error("cutting down on namespace indirection.");
    process.exit(1);
  }
  const out = JSON.parse(result.stdout.toString("utf-8"));
  const zigEnumValues = [...zigEnums.values()];
  for (let i = 0; i < out.length; i++) {
    const { tag, values } = out[i];
    const zigEnum = zigEnumValues[i];
    zigEnum.tag = tag;
    zigEnum.variants = values;
    zigEnum.resolved = true;
  }
}

let needsWebCore = false;
for (const type of typeHashToReachableType.values()) {
  // Emit convert functions for compound types in the Generated namespace
  switch (type.kind) {
    case "dictionary":
      emitConvertDictionaryFunction(type);
      break;
    case "stringEnum":
      needsWebCore = true;
      break;
  }
}

for (const [filename, { functions, typedefs, anonTypedefs }] of files) {
  const namespaceVar = fileMap.get(filename)!;
  assert(namespaceVar, `namespaceVar not found for ${filename}, ${inspect(fileMap)}`);
  zigInternal.line(`const import_${namespaceVar} = @import(${str(path.relative(src + "/bun.js", filename))});`);

  zig.line(`/// Generated for "src/${filename}"`);
  zig.line(`pub const ${namespaceVar} = struct {`);
  zig.indent();

  for (const fn of functions) {
    cpp.line(`// Dispatch for \"fn ${zid(fn.name)}(...)\" in \"src/${fn.zigFile}\"`);
    const externName = extJsFunction(namespaceVar, fn.name);

    // C++ forward declarations
    let variNum = 1;
    for (const vari of fn.variants) {
      resolveVariantStrategies(
        vari,
        `${pascal(namespaceVar)}${pascal(fn.name)}Arguments${fn.variants.length > 1 ? variNum : ""}`,
      );
      const dispatchName = extDispatchVariant(namespaceVar, fn.name, variNum);
      const internalDispatchName = extInternalDispatchVariant(namespaceVar, fn.name, variNum);

      const args: string[] = [];

      if (vari.globalObjectArg === "hidden") {
        args.push("JSC::JSGlobalObject*");
      }
      for (const arg of vari.args) {
        if (arg.type.isIgnoredUndefinedType()) continue;
        const strategy = arg.loweringStrategy!;
        switch (strategy.type) {
          case "c-abi-pointer":
            addHeaderForType(arg.type);
            args.push(`const ${arg.type.cppName()}*`);
            break;
          case "c-abi-value":
            addHeaderForType(arg.type);
            args.push(arg.type.cppName());
            break;
          case "uses-communication-buffer":
            break;
          default:
            throw new Error(`TODO: C++ dispatch function for ${inspect(strategy)}`);
        }
      }
      const { communicationStruct } = vari;
      if (communicationStruct) {
        args.push(`${communicationStruct.name()}*`);
      }
      const returnStrategy = vari.returnStrategy!;
      if (returnStrategy.type === "basic-out-param") {
        args.push(cAbiTypeName(returnStrategy.abiType) + "*");
      }

      cpp.line(`extern "C" ${returnStrategyCppType(vari.returnStrategy!)} ${dispatchName}(${args.join(", ")});`);

      if (fn.variants.length > 1) {
        // Emit separate variant dispatch functions
        cpp.line(
          `extern "C" SYSV_ABI JSC::EncodedJSValue ${internalDispatchName}(JSC::JSGlobalObject* global, JSC::CallFrame* callFrame)`,
        );
        cpp.line(`{`);
        cpp.indent();
        cpp.resetTemporaries();
        emitCppCallToVariant(fn.className, fn.name, vari, dispatchName);
        cpp.dedent();
        cpp.line(`}`);
      }
      variNum += 1;
    }

    // Public function
    zig.line(
      `pub const ${zid("js" + cap(fn.name))} = @extern(*const JSHostFunctionType, .{ .name = ${str(externName)} });`,
    );

    // Generated JSC host function
    cpp.line(
      `extern "C" SYSV_ABI JSC::EncodedJSValue ${externName}(JSC::JSGlobalObject* global, JSC::CallFrame* callFrame)`,
    );
    cpp.line(`{`);
    cpp.indent();
    cpp.resetTemporaries();

    if (fn.variants.length === 1) {
      emitCppCallToVariant(fn.className, fn.name, fn.variants[0], extDispatchVariant(namespaceVar, fn.name, 1));
    } else {
      emitCppVariationSelector(fn, namespaceVar);
    }

    cpp.dedent();
    cpp.line(`}`);
    cpp.line();

    // Generated Zig dispatch functions
    variNum = 1;
    for (const vari of fn.variants) {
      const dispatchName = extDispatchVariant(namespaceVar, fn.name, variNum);
      const args: string[] = [];
      const returnStrategy = vari.returnStrategy!;
      const { communicationStruct } = vari;
      if (communicationStruct) {
        zigInternal.add(`const ${communicationStruct.name()} = `);
        communicationStruct.emitZig(zigInternal, "with-semi");
      }

      assert(vari.globalObjectArg !== undefined);

      let globalObjectArg = "";
      if (vari.globalObjectArg === "hidden") {
        args.push(`global: *JSC.JSGlobalObject`);
        globalObjectArg = "global";
      }
      let argNum = 0;
      for (const arg of vari.args) {
        if (arg.type.isIgnoredUndefinedType()) continue;
        let argName = `arg_${snake(arg.name)}`;
        if (vari.globalObjectArg === argNum) {
          if (arg.type.kind !== "globalObject") {
            argName = "global";
          }
          globalObjectArg = argName;
        }
        argNum += 1;
        arg.zigMappedName = argName;
        const strategy = arg.loweringStrategy!;
        switch (strategy.type) {
          case "c-abi-pointer":
            args.push(`${argName}: *const ${zigTypeName(arg.type)}`);
            break;
          case "c-abi-value":
            args.push(`${argName}: ${zigTypeName(arg.type)}`);
            break;
          case "uses-communication-buffer":
            break;
          default:
            throw new Error(`TODO: zig dispatch function for ${inspect(strategy)}`);
        }
      }
      assert(globalObjectArg, `globalObjectArg not found from ${vari.globalObjectArg}`);

      if (communicationStruct) {
        args.push(`buf: *${communicationStruct.name()}`);
      }

      if (returnStrategy.type === "basic-out-param") {
        args.push(`out: *${zigTypeName(vari.ret)}`);
      }

      zigInternal.line(`export fn ${zid(dispatchName)}(${args.join(", ")}) ${returnStrategyZigType(returnStrategy)} {`);
      zigInternal.indent();

      zigInternal.line(
        `if (!@hasDecl(import_${namespaceVar}${fn.zigPrefix.length > 0 ? "." + fn.zigPrefix.slice(0, -1) : ""}, ${str(fn.name + vari.suffix)}))`,
      );
      zigInternal.line(
        `    @compileError(${str(`Missing binding declaration "${fn.zigPrefix}${fn.name + vari.suffix}" in "${path.basename(filename)}"`)});`,
      );

      for (const arg of vari.args) {
        if (arg.type.kind === "UTF8String") {
          zigInternal.line(`const ${arg.zigMappedName}_utf8 = ${arg.zigMappedName}.toUTF8(bun.default_allocator);`);
          zigInternal.line(`defer ${arg.zigMappedName}_utf8.deinit();`);
        }
      }

      const mainCall = new CodeWriter();
      mainCall.level = zigInternal.level;

      switch (returnStrategy.type) {
        case "jsvalue":
          mainCall.add(`return JSC.toJSHostValue(${globalObjectArg}, `);
          break;
        case "basic-out-param":
          mainCall.add(`out.* = @as(bun.JSError!${returnStrategy.abiType}, `);
          break;
        case "void":
          zigInternal.add(`@as(bun.JSError!void, `);
          break;
      }

      mainCall.line(`${zid("import_" + namespaceVar)}.${fn.zigPrefix}${fn.name + vari.suffix}(`);
      mainCall.indent();
      for (const arg of vari.args) {
        const argName = arg.zigMappedName!;

        if (arg.type.isIgnoredUndefinedType()) continue;

        if (arg.type.isVirtualArgument()) {
          switch (arg.type.kind) {
            case "zigVirtualMachine":
              mainCall.line(`${argName}.bunVM(),`);
              break;
            case "globalObject":
              mainCall.line(`${argName},`);
              break;
            default:
              throw new Error("unexpected");
          }
          continue;
        }

        const strategy = arg.loweringStrategy!;
        const hasTemporaries = typeHasComplexControlFlow(arg.type);

        let decodeWriter = mainCall;
        if (hasTemporaries) {
          zigInternal.add(`const ${argName} = `);
          decodeWriter = zigInternal;
        }
        const type = arg.type;
        const isNullable = type.flags.optional && !("default" in type.flags);
        switch (strategy.type) {
          case "c-abi-pointer":
            if (type.kind === "UTF8String") {
              decodeWriter.add(`${argName}_utf8.slice()`);
              break;
            }
            decodeWriter.add(`${argName}.*`);
            break;
          case "c-abi-value":
            decodeWriter.add(`${argName}`);
            break;
          case "uses-communication-buffer":
            const prefix = `buf.${snake(arg.name)}`;
            if (isNullable) emitNullableZigDecoder(decodeWriter, prefix, type, strategy.children);
            else emitComplexZigDecoder(decodeWriter, prefix, type, strategy.children);
            break;
          default:
            throw new Error(`TODO: zig dispatch function for ${inspect(strategy satisfies never)}`);
        }
        if (hasTemporaries) {
          assert(strategy.type === "uses-communication-buffer");
          decodeWriter.line(`;`);
          mainCall.add(`${argName}`);
          emitZigDeinitializer(zigInternal, argName, type, strategy.children);
        }
        mainCall.line(`,`);
      }
      mainCall.dedent();
      switch (returnStrategy.type) {
        case "jsvalue":
          mainCall.line(`));`);
          break;
        case "basic-out-param":
        case "void":
          mainCall.line(`)) catch |err| switch (err) {`);
          mainCall.line(`    error.JSError => return false,`);
          mainCall.line(`    error.OutOfMemory => ${globalObjectArg}.throwOutOfMemory() catch return false,`);
          mainCall.line(`};`);
          mainCall.line(`return true;`);
          break;
      }
      zigInternal.add(mainCall.buffer);
      zigInternal.dedent();
      zigInternal.line(`}`);
      variNum += 1;
    }
  }
  if (functions.length > 0) {
    zig.line();
  }
  for (const fn of functions) {
    // Wrapper to init JSValue
    const wrapperName = zid("create" + cap(fn.name) + "Callback");
    const minArgCount = fn.variants.reduce((acc, vari) => Math.min(acc, vari.args.length), Number.MAX_SAFE_INTEGER);
    zig.line(`pub fn ${wrapperName}(global: *JSC.JSGlobalObject) callconv(JSC.conv) JSValue {`);
    zig.line(
      `    return JSC.NewRuntimeFunction(global, JSC.ZigString.static(${str(fn.name)}), ${minArgCount}, js${cap(fn.name)}, false, false, null);`,
    );
    zig.line(`}`);
  }

  if (typedefs.length > 0 || anonTypedefs.length > 0) {
    zig.line();
  }
  for (const td of typedefs) {
    emitZigStruct(td.type);
  }
  if (anonTypedefs.length > 0) {
    zig.line(`// To make these "pub", export them from ${path.basename(filename, ".zig")}.bind.ts`);
  }
  for (const td of anonTypedefs) {
    emitZigStruct(td);
  }

  zig.dedent();
  zig.line(`};`);
  zig.line();
}

cpp.line("} // namespace Generated");
cpp.line();
if (needsWebCore) {
  cpp.line(`namespace WebCore {`);
  cpp.line();
  for (const [, reachableType] of typeHashToReachableType) {
    switch (reachableType.kind) {
      case "zigEnum":
      case "stringEnum":
        emitConvertEnumFunction(cpp, reachableType);
        break;
    }
  }
  cpp.line(`} // namespace WebCore`);
  cpp.line();
}

zigInternal.dedent();
zigInternal.line("};");
zigInternal.line();
zigInternal.line("comptime {");
zigInternal.line(`    if (bun.Environment.export_cpp_apis) {`);
zigInternal.line("        for (@typeInfo(binding_internals).Struct.decls) |decl| {");
zigInternal.line("            _ = &@field(binding_internals, decl.name);");
zigInternal.line("        }");
zigInternal.line("    }");
zigInternal.line("}");

status("Writing GeneratedBindings.cpp");
writeIfNotChanged(
  path.join(codegenRoot, "GeneratedBindings.cpp"),
  [...headers].map(([name, reason]) => `#include ${str(name)}${reason ? ` // ${reason}` : ""}\n`).join("") +
    "\n" +
    cppInternal.buffer +
    "\n" +
    cpp.buffer,
);
status("Writing GeneratedBindings.zig");
writeIfNotChanged(path.join(src, "bun.js/bindings/GeneratedBindings.zig"), zig.buffer + zigInternal.buffer);

// Headers
for (const [filename, { functions, typedefs, anonTypedefs }] of files) {
  const headerName = `Generated${pascal(path.basename(filename, ".zig"))}.h`;
  status(`Writing ${headerName}`);
  const namespaceVar = fileMap.get(filename)!;
  const header = new CodeWriter();
  const headerIncludes = new Set<string>();
  let needsWebCoreNamespace = false;

  headerIncludes.add("root.h");

  header.line(`namespace {`);
  header.line();
  for (const fn of functions) {
    const externName = extJsFunction(namespaceVar, fn.name);
    header.line(`extern "C" SYSV_ABI JSC::EncodedJSValue ${externName}(JSC::JSGlobalObject*, JSC::CallFrame*);`);
  }
  header.line();
  header.line(`} // namespace`);
  header.line();

  header.line(`namespace Generated {`);
  header.line();
  header.line(`/// Generated binding code for src/${filename}`);
  header.line(`namespace ${namespaceVar} {`);
  header.line();
  for (const td of typedefs) {
    emitCppStructHeader(header, td.type);

    switch (td.type.kind) {
      case "zigEnum":
      case "stringEnum":
      case "dictionary":
        needsWebCoreNamespace = true;
        break;
    }
  }
  for (const td of anonTypedefs) {
    emitCppStructHeader(header, td);

    switch (td.kind) {
      case "zigEnum":
      case "stringEnum":
      case "dictionary":
        needsWebCoreNamespace = true;
        break;
    }
  }
  for (const fn of functions) {
    const externName = extJsFunction(namespaceVar, fn.name);
    header.line(`constexpr auto* js${cap(fn.name)} = &${externName};`);
  }
  header.line();
  header.line(`} // namespace ${namespaceVar}`);
  header.line();
  header.line(`} // namespace Generated`);
  header.line();

  if (needsWebCoreNamespace) {
    header.line(`namespace WebCore {`);
    header.line();
    for (const type of typedefs.map(td => td.type).concat(anonTypedefs)) {
      switch (type.kind) {
        case "zigEnum":
        case "stringEnum":
          headerIncludes.add("JSDOMConvertEnumeration.h");
          const basename = type.name();
          const name = `Generated::${namespaceVar}::${basename}`;
          header.line(`// Implement WebCore::IDLEnumeration trait for ${basename}`);
          header.line(`String convertEnumerationToString(${name});`);
          header.line(`template<> JSC::JSString* convertEnumerationToJS(JSC::JSGlobalObject&, ${name});`);
          header.line(`template<> std::optional<${name}> parseEnumerationFromString<${name}>(const String&);`);
          header.line(
            `template<> std::optional<${name}> parseEnumeration<${name}>(JSC::JSGlobalObject&, JSC::JSValue);`,
          );
          header.line(`template<> ASCIILiteral expectedEnumerationValues<${name}>();`);
          header.line();
          break;
        case "dictionary":
          // TODO:
          // header.line(`// Implement WebCore::IDLDictionary trait for ${td.type.name()}`);
          // header.line(
          //   "template<> FetchRequestInit convertDictionary<FetchRequestInit>(JSC::JSGlobalObject&, JSC::JSValue);",
          // );
          // header.line();
          break;
        default:
      }
    }
    header.line(`} // namespace WebCore`);
  }

  header.buffer =
    "#pragma once\n" + [...headerIncludes].map(name => `#include ${str(name)}\n`).join("") + "\n" + header.buffer;

  writeIfNotChanged(path.join(codegenRoot, headerName), header.buffer);
}

const duration = (performance.now() - start).toFixed(0);
status(`processed ${files.size} files, ${typeHashToReachableType.size} types. (${duration}ms)`);
