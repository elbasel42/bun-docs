const Glob = @This();
const globImpl = @import("../../glob.zig");
const globImplAscii = @import("../../glob_ascii.zig");
const GlobWalker = globImpl.BunGlobWalker;
const PathLike = @import("../node/types.zig").PathLike;
const ArgumentsSlice = @import("../node/types.zig").ArgumentsSlice;
const Syscall = @import("../../sys.zig");
const std = @import("std");
const Allocator = std.mem.Allocator;

const bun = @import("root").bun;
const BunString = bun.String;
const string = bun.string;
const JSC = bun.JSC;
const JSArray = @import("../bindings/bindings.zig").JSArray;
const JSValue = @import("../bindings/bindings.zig").JSValue;
const ZigString = @import("../bindings/bindings.zig").ZigString;
const Base = @import("../base.zig");
const JSGlobalObject = @import("../bindings/bindings.zig").JSGlobalObject;
const ResolvePath = @import("../../resolver/resolve_path.zig");
const isAllAscii = @import("../../string_immutable.zig").isAllASCII;
const CodepointIterator = @import("../../string_immutable.zig").UnsignedCodepointIterator;

const Arena = std.heap.ArenaAllocator;

pub usingnamespace JSC.Codegen.JSGlob;

pattern: []const u8,
pattern_codepoints: ?std.ArrayList(u32) = null,
is_ascii: bool,
has_pending_activity: std.atomic.Value(usize) = std.atomic.Value(usize).init(0),

const ScanOpts = struct {
    cwd: ?[]const u8,
    dot: bool,
    absolute: bool,
    only_files: bool,
    follow_symlinks: bool,
    error_on_broken_symlinks: bool,

    fn parseCWD(globalThis: *JSGlobalObject, allocator: std.mem.Allocator, cwdVal: JSC.JSValue, absolute: bool, comptime fnName: string) bun.JSError![]const u8 {
        const cwd_str_raw = cwdVal.toSlice(globalThis, allocator);
        if (cwd_str_raw.len == 0) return "";

        const cwd_str = cwd_str: {
            // If its absolute return as is
            if (ResolvePath.Platform.auto.isAbsolute(cwd_str_raw.slice())) {
                const cwd_str = try cwd_str_raw.clone(allocator);
                break :cwd_str cwd_str.ptr[0..cwd_str.len];
            }

            var path_buf2: [bun.MAX_PATH_BYTES * 2]u8 = undefined;

            if (!absolute) {
                const cwd_str = ResolvePath.joinStringBuf(&path_buf2, &[_][]const u8{cwd_str_raw.slice()}, .auto);
                break :cwd_str try allocator.dupe(u8, cwd_str);
            }

            // Convert to an absolute path
            var path_buf: bun.PathBuffer = undefined;
            const cwd = switch (bun.sys.getcwd((&path_buf))) {
                .result => |cwd| cwd,
                .err => |err| {
                    const errJs = err.toJSC(globalThis);
                    return globalThis.throwValue(errJs);
                },
            };

            const cwd_str = ResolvePath.joinStringBuf(&path_buf2, &[_][]const u8{
                cwd,
                cwd_str_raw.slice(),
            }, .auto);

            break :cwd_str try allocator.dupe(u8, cwd_str);
        };

        if (cwd_str.len > bun.MAX_PATH_BYTES) {
            return globalThis.throw("{s}: invalid `cwd`, longer than {d} bytes", .{ fnName, bun.MAX_PATH_BYTES });
        }

        return cwd_str;
    }

    fn fromJS(globalThis: *JSGlobalObject, arguments: *ArgumentsSlice, comptime fnName: []const u8, arena: *Arena) bun.JSError!?ScanOpts {
        const optsObj: JSValue = arguments.nextEat() orelse return null;
        var out: ScanOpts = .{
            .cwd = null,
            .dot = false,
            .absolute = false,
            .follow_symlinks = false,
            .error_on_broken_symlinks = false,
            .only_files = true,
        };
        if (optsObj.isUndefinedOrNull()) return out;
        if (!optsObj.isObject()) {
            if (optsObj.isString()) {
                {
                    const result = try parseCWD(globalThis, arena.allocator(), optsObj, out.absolute, fnName);
                    if (result.len > 0) {
                        out.cwd = result;
                    }
                }
                return out;
            }
            return globalThis.throw("{s}: expected first argument to be an object", .{fnName});
        }

        if (try optsObj.getTruthy(globalThis, "onlyFiles")) |only_files| {
            out.only_files = if (only_files.isBoolean()) only_files.asBoolean() else false;
        }

        if (try optsObj.getTruthy(globalThis, "throwErrorOnBrokenSymlink")) |error_on_broken| {
            out.error_on_broken_symlinks = if (error_on_broken.isBoolean()) error_on_broken.asBoolean() else false;
        }

        if (try optsObj.getTruthy(globalThis, "followSymlinks")) |followSymlinksVal| {
            out.follow_symlinks = if (followSymlinksVal.isBoolean()) followSymlinksVal.asBoolean() else false;
        }

        if (try optsObj.getTruthy(globalThis, "absolute")) |absoluteVal| {
            out.absolute = if (absoluteVal.isBoolean()) absoluteVal.asBoolean() else false;
        }

        if (try optsObj.getTruthy(globalThis, "cwd")) |cwdVal| {
            if (!cwdVal.isString()) {
                return globalThis.throw("{s}: invalid `cwd`, not a string", .{fnName});
            }

            {
                const result = try parseCWD(globalThis, arena.allocator(), cwdVal, out.absolute, fnName);
                if (result.len > 0) {
                    out.cwd = result;
                }
            }
        }

        if (try optsObj.getTruthy(globalThis, "dot")) |dot| {
            out.dot = if (dot.isBoolean()) dot.asBoolean() else false;
        }

        return out;
    }
};

pub const WalkTask = struct {
    walker: *GlobWalker,
    alloc: Allocator,
    err: ?Err = null,
    global: *JSC.JSGlobalObject,
    has_pending_activity: *std.atomic.Value(usize),

    pub const Err = union(enum) {
        syscall: Syscall.Error,
        unknown: anyerror,

        pub fn toJSC(this: Err, globalThis: *JSGlobalObject) JSValue {
            return switch (this) {
                .syscall => |err| err.toJSC(globalThis),
                .unknown => |err| ZigString.fromBytes(@errorName(err)).toJS(globalThis),
            };
        }
    };

    pub const AsyncGlobWalkTask = JSC.ConcurrentPromiseTask(WalkTask);

    pub fn create(
        globalThis: *JSC.JSGlobalObject,
        alloc: Allocator,
        globWalker: *GlobWalker,
        has_pending_activity: *std.atomic.Value(usize),
    ) !*AsyncGlobWalkTask {
        const walkTask = try alloc.create(WalkTask);
        walkTask.* = .{
            .walker = globWalker,
            .global = globalThis,
            .alloc = alloc,
            .has_pending_activity = has_pending_activity,
        };
        return try AsyncGlobWalkTask.createOnJSThread(alloc, globalThis, walkTask);
    }

    pub fn run(this: *WalkTask) void {
        defer decrPendingActivityFlag(this.has_pending_activity);
        const result = this.walker.walk() catch |err| {
            this.err = .{ .unknown = err };
            return;
        };
        switch (result) {
            .err => |err| {
                this.err = .{ .syscall = err };
            },
            .result => {},
        }
    }

    pub fn then(this: *WalkTask, promise: *JSC.JSPromise) void {
        defer this.deinit();

        if (this.err) |err| {
            const errJs = err.toJSC(this.global);
            promise.reject(this.global, errJs);
            return;
        }

        const jsStrings = globWalkResultToJS(this.walker, this.global);
        promise.resolve(this.global, jsStrings);
    }

    fn deinit(this: *WalkTask) void {
        this.walker.deinit(true);
        this.alloc.destroy(this);
    }
};

fn globWalkResultToJS(globWalk: *GlobWalker, globalThis: *JSGlobalObject) JSValue {
    if (globWalk.matchedPaths.keys().len == 0) {
        return JSC.JSValue.createEmptyArray(globalThis, 0);
    }

    return BunString.toJSArray(globalThis, globWalk.matchedPaths.keys());
}

/// The reference to the arena is not used after the scope because it is copied
/// by `GlobWalker.init`/`GlobWalker.initWithCwd` if all allocations work and no
/// errors occur
fn makeGlobWalker(
    this: *Glob,
    globalThis: *JSGlobalObject,
    arguments: *ArgumentsSlice,
    comptime fnName: []const u8,
    alloc: Allocator,
    arena: *Arena,
) bun.JSError!?*GlobWalker {
    const matchOpts = try ScanOpts.fromJS(globalThis, arguments, fnName, arena) orelse return null;
    const cwd = matchOpts.cwd;
    const dot = matchOpts.dot;
    const absolute = matchOpts.absolute;
    const follow_symlinks = matchOpts.follow_symlinks;
    const error_on_broken_symlinks = matchOpts.error_on_broken_symlinks;
    const only_files = matchOpts.only_files;

    var globWalker = try alloc.create(GlobWalker);
    errdefer alloc.destroy(globWalker);
    globWalker.* = .{};

    if (cwd != null) {
        switch (try globWalker.initWithCwd(
            arena,
            this.pattern,
            cwd.?,
            dot,
            absolute,
            follow_symlinks,
            error_on_broken_symlinks,
            only_files,
        )) {
            .err => |err| {
                return globalThis.throwValue(err.toJSC(globalThis));
            },
            else => {},
        }
        return globWalker;
    }

    switch (try globWalker.init(
        arena,
        this.pattern,
        dot,
        absolute,
        follow_symlinks,
        error_on_broken_symlinks,
        only_files,
    )) {
        .err => |err| {
            return globalThis.throwValue(err.toJSC(globalThis));
        },
        else => {},
    }
    return globWalker;
}

pub fn constructor(globalThis: *JSC.JSGlobalObject, callframe: *JSC.CallFrame) bun.JSError!*Glob {
    const alloc = bun.default_allocator;

    const arguments_ = callframe.arguments_old(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();
    const pat_arg: JSValue = arguments.nextEat() orelse {
        return globalThis.throw("Glob.constructor: expected 1 arguments, got 0", .{});
    };

    if (!pat_arg.isString()) {
        return globalThis.throw("Glob.constructor: first argument is not a string", .{});
    }

    const pat_str: []u8 = @constCast((pat_arg.toSliceClone(globalThis) orelse return error.JSError).slice());

    const all_ascii = isAllAscii(pat_str);

    var glob = alloc.create(Glob) catch bun.outOfMemory();
    glob.* = .{ .pattern = pat_str, .is_ascii = all_ascii };

    if (!all_ascii) {
        var codepoints = try std.ArrayList(u32).initCapacity(alloc, glob.pattern.len * 2);
        errdefer codepoints.deinit();

        try convertUtf8(&codepoints, glob.pattern);

        glob.pattern_codepoints = codepoints;
    }

    return glob;
}

pub fn finalize(
    this: *Glob,
) callconv(.C) void {
    const alloc = JSC.VirtualMachine.get().allocator;
    alloc.free(this.pattern);
    if (this.pattern_codepoints) |*codepoints| {
        codepoints.deinit();
    }
    alloc.destroy(this);
}

pub fn hasPendingActivity(this: *Glob) callconv(.C) bool {
    @fence(.seq_cst);
    return this.has_pending_activity.load(.seq_cst) > 0;
}

fn incrPendingActivityFlag(has_pending_activity: *std.atomic.Value(usize)) void {
    @fence(.seq_cst);
    _ = has_pending_activity.fetchAdd(1, .seq_cst);
}

fn decrPendingActivityFlag(has_pending_activity: *std.atomic.Value(usize)) void {
    @fence(.seq_cst);
    _ = has_pending_activity.fetchSub(1, .seq_cst);
}

pub fn __scan(this: *Glob, globalThis: *JSGlobalObject, callframe: *JSC.CallFrame) bun.JSError!JSC.JSValue {
    const alloc = bun.default_allocator;

    const arguments_ = callframe.arguments_old(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();

    var arena = std.heap.ArenaAllocator.init(alloc);
    const globWalker = try this.makeGlobWalker(globalThis, &arguments, "scan", alloc, &arena) orelse {
        arena.deinit();
        return .undefined;
    };

    incrPendingActivityFlag(&this.has_pending_activity);
    var task = WalkTask.create(globalThis, alloc, globWalker, &this.has_pending_activity) catch {
        decrPendingActivityFlag(&this.has_pending_activity);
        return globalThis.throwOutOfMemory();
    };
    task.schedule();

    return task.promise.value();
}

pub fn __scanSync(this: *Glob, globalThis: *JSGlobalObject, callframe: *JSC.CallFrame) bun.JSError!JSC.JSValue {
    const alloc = bun.default_allocator;

    const arguments_ = callframe.arguments_old(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();

    var arena = std.heap.ArenaAllocator.init(alloc);
    var globWalker = try this.makeGlobWalker(globalThis, &arguments, "scanSync", alloc, &arena) orelse {
        arena.deinit();
        return .undefined;
    };
    defer globWalker.deinit(true);

    switch (try globWalker.walk()) {
        .err => |err| {
            return globalThis.throwValue(err.toJSC(globalThis));
        },
        .result => {},
    }

    const matchedPaths = globWalkResultToJS(globWalker, globalThis);

    return matchedPaths;
}

pub fn match(this: *Glob, globalThis: *JSGlobalObject, callframe: *JSC.CallFrame) bun.JSError!JSC.JSValue {
    const alloc = bun.default_allocator;
    var arena = Arena.init(alloc);
    defer arena.deinit();

    const arguments_ = callframe.arguments_old(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();
    const str_arg = arguments.nextEat() orelse {
        return globalThis.throw("Glob.matchString: expected 1 arguments, got 0", .{});
    };

    if (!str_arg.isString()) {
        return globalThis.throw("Glob.matchString: first argument is not a string", .{});
    }

    var str = str_arg.toSlice(globalThis, arena.allocator());
    defer str.deinit();

    if (this.is_ascii and isAllAscii(str.slice())) return JSC.JSValue.jsBoolean(globImplAscii.match(this.pattern, str.slice()));

    const codepoints = codepoints: {
        if (this.pattern_codepoints) |cp| break :codepoints cp.items[0..];

        var codepoints = try std.ArrayList(u32).initCapacity(alloc, this.pattern.len * 2);
        errdefer codepoints.deinit();

        try convertUtf8(&codepoints, this.pattern);

        this.pattern_codepoints = codepoints;

        break :codepoints codepoints.items[0..codepoints.items.len];
    };

    return if (globImpl.matchImpl(codepoints, str.slice()).matches()) .true else .false;
}

pub fn convertUtf8(codepoints: *std.ArrayList(u32), pattern: []const u8) !void {
    const iter = CodepointIterator.init(pattern);
    var cursor = CodepointIterator.Cursor{};
    while (iter.next(&cursor)) {
        try codepoints.append(@intCast(cursor.c));
    }
}
