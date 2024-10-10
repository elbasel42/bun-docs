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
const String = bun.String;

const Arena = std.heap.ArenaAllocator;

pub usingnamespace JSC.Codegen.JSGlob;
pub usingnamespace bun.New(Glob);

// TODO(dylan-conway): delete
pattern_utf8: ?ZigString.Slice,

pattern: String,
has_pending_activity: std.atomic.Value(usize) = std.atomic.Value(usize).init(0),

const ScanOpts = struct {
    cwd: ?[]const u8,
    dot: bool,
    absolute: bool,
    only_files: bool,
    follow_symlinks: bool,
    error_on_broken_symlinks: bool,

    fn parseCWD(globalThis: *JSGlobalObject, allocator: std.mem.Allocator, cwdVal: JSC.JSValue, absolute: bool, comptime fnName: string) ?[]const u8 {
        const cwd_str_raw = cwdVal.toSlice(globalThis, allocator);
        if (cwd_str_raw.len == 0) return "";

        const cwd_str = cwd_str: {
            // If its absolute return as is
            if (ResolvePath.Platform.auto.isAbsolute(cwd_str_raw.slice())) {
                const cwd_str = cwd_str_raw.clone(allocator) catch {
                    globalThis.throwOutOfMemory();
                    return null;
                };
                break :cwd_str cwd_str.ptr[0..cwd_str.len];
            }

            var path_buf2: [bun.MAX_PATH_BYTES * 2]u8 = undefined;

            if (!absolute) {
                const cwd_str = ResolvePath.joinStringBuf(&path_buf2, &[_][]const u8{cwd_str_raw.slice()}, .auto);
                break :cwd_str allocator.dupe(u8, cwd_str) catch {
                    globalThis.throwOutOfMemory();
                    return null;
                };
            }

            // Convert to an absolute path
            var path_buf: bun.PathBuffer = undefined;
            const cwd = switch (bun.sys.getcwd((&path_buf))) {
                .result => |cwd| cwd,
                .err => |err| {
                    const errJs = err.toJSC(globalThis);
                    globalThis.throwValue(errJs);
                    return null;
                },
            };

            const cwd_str = ResolvePath.joinStringBuf(&path_buf2, &[_][]const u8{
                cwd,
                cwd_str_raw.slice(),
            }, .auto);

            break :cwd_str allocator.dupe(u8, cwd_str) catch {
                globalThis.throwOutOfMemory();
                return null;
            };
        };

        if (cwd_str.len > bun.MAX_PATH_BYTES) {
            globalThis.throw("{s}: invalid `cwd`, longer than {d} bytes", .{ fnName, bun.MAX_PATH_BYTES });
            return null;
        }

        return cwd_str;
    }

    fn fromJS(globalThis: *JSGlobalObject, arguments: *ArgumentsSlice, comptime fnName: []const u8, arena: *Arena) ?ScanOpts {
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
                if (parseCWD(globalThis, arena.allocator(), optsObj, out.absolute, fnName)) |result| {
                    if (result.len > 0) {
                        out.cwd = result;
                    }
                } else {
                    // error
                    return null;
                }
                return out;
            }
            globalThis.throw("{s}: expected first argument to be an object", .{fnName});
            return null;
        }

        if (optsObj.getTruthy(globalThis, "onlyFiles")) |only_files| {
            out.only_files = if (only_files.isBoolean()) only_files.asBoolean() else false;
        }

        if (optsObj.getTruthy(globalThis, "throwErrorOnBrokenSymlink")) |error_on_broken| {
            out.error_on_broken_symlinks = if (error_on_broken.isBoolean()) error_on_broken.asBoolean() else false;
        }

        if (optsObj.getTruthy(globalThis, "followSymlinks")) |followSymlinksVal| {
            out.follow_symlinks = if (followSymlinksVal.isBoolean()) followSymlinksVal.asBoolean() else false;
        }

        if (optsObj.getTruthy(globalThis, "absolute")) |absoluteVal| {
            out.absolute = if (absoluteVal.isBoolean()) absoluteVal.asBoolean() else false;
        }

        if (optsObj.getTruthy(globalThis, "cwd")) |cwdVal| {
            if (!cwdVal.isString()) {
                globalThis.throw("{s}: invalid `cwd`, not a string", .{fnName});
                return null;
            }

            if (parseCWD(globalThis, arena.allocator(), cwdVal, out.absolute, fnName)) |result| {
                if (result.len > 0) {
                    out.cwd = result;
                }
            } else {
                // error
                return null;
            }
        }

        if (optsObj.getTruthy(globalThis, "dot")) |dot| {
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
    globalThis: *JSGlobalObject,
    arguments: *ArgumentsSlice,
    pattern: []const u8,
    comptime fnName: []const u8,
    alloc: Allocator,
    arena: *Arena,
) ?*GlobWalker {
    const matchOpts = ScanOpts.fromJS(globalThis, arguments, fnName, arena) orelse return null;
    const cwd = matchOpts.cwd;
    const dot = matchOpts.dot;
    const absolute = matchOpts.absolute;
    const follow_symlinks = matchOpts.follow_symlinks;
    const error_on_broken_symlinks = matchOpts.error_on_broken_symlinks;
    const only_files = matchOpts.only_files;

    if (cwd != null) {
        var globWalker = alloc.create(GlobWalker) catch {
            globalThis.throwOutOfMemory();
            return null;
        };

        globWalker.* = .{};

        switch (globWalker.initWithCwd(
            arena,
            pattern,
            cwd.?,
            dot,
            absolute,
            follow_symlinks,
            error_on_broken_symlinks,
            only_files,
        ) catch {
            globalThis.throwOutOfMemory();
            return null;
        }) {
            .err => |err| {
                globalThis.throwValue(err.toJSC(globalThis));
                return null;
            },
            else => {},
        }
        return globWalker;
    }
    var globWalker = alloc.create(GlobWalker) catch {
        globalThis.throwOutOfMemory();
        return null;
    };

    globWalker.* = .{};
    switch (globWalker.init(
        arena,
        pattern,
        dot,
        absolute,
        follow_symlinks,
        error_on_broken_symlinks,
        only_files,
    ) catch {
        globalThis.throwOutOfMemory();
        return null;
    }) {
        .err => |err| {
            globalThis.throwValue(err.toJSC(globalThis));
            return null;
        },
        else => {},
    }

    return globWalker;
}

pub fn constructor(
    globalThis: *JSC.JSGlobalObject,
    callframe: *JSC.CallFrame,
) ?*Glob {
    const arguments_ = callframe.arguments(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();
    const pat_arg = arguments.nextEat() orelse {
        globalThis.throw("Glob.constructor: expected 1 arguments, got 0", .{});
        return null;
    };

    if (!pat_arg.isString()) {
        globalThis.throw("Glob.constructor: first argument is not a string", .{});
        return null;
    }

    const pattern_str = bun.String.fromJSRef(pat_arg, globalThis);

    return Glob.new(.{
        .pattern = pattern_str,
        .pattern_utf8 = null,
    });
}

pub fn finalize(
    this: *Glob,
) callconv(.C) void {
    this.pattern.deref();
    if (this.pattern_utf8) |utf8| {
        utf8.deinit();
    }
    this.destroy();
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

pub fn __scan(this: *Glob, globalThis: *JSGlobalObject, callframe: *JSC.CallFrame) JSC.JSValue {
    const arguments_ = callframe.arguments(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();

    const pattern = this.pattern_utf8 orelse pattern: {
        this.pattern_utf8 = this.pattern.toUTF8(bun.default_allocator);
        break :pattern this.pattern_utf8.?;
    };

    var arena = std.heap.ArenaAllocator.init(bun.default_allocator);
    const globWalker = makeGlobWalker(globalThis, &arguments, pattern.slice(), "scan", bun.default_allocator, &arena) orelse {
        arena.deinit();
        return .undefined;
    };

    incrPendingActivityFlag(&this.has_pending_activity);
    var task = WalkTask.create(globalThis, bun.default_allocator, globWalker, &this.has_pending_activity) catch {
        decrPendingActivityFlag(&this.has_pending_activity);
        globalThis.throwOutOfMemory();
        return .undefined;
    };
    task.schedule();

    return task.promise.value();
}

pub fn __scanSync(this: *Glob, globalThis: *JSGlobalObject, callframe: *JSC.CallFrame) JSC.JSValue {
    const arguments_ = callframe.arguments(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();

    const pattern = this.pattern_utf8 orelse pattern: {
        this.pattern_utf8 = this.pattern.toUTF8(bun.default_allocator);
        break :pattern this.pattern_utf8.?;
    };

    var arena = std.heap.ArenaAllocator.init(bun.default_allocator);
    var globWalker = makeGlobWalker(globalThis, &arguments, pattern.slice(), "scanSync", bun.default_allocator, &arena) orelse {
        arena.deinit();
        return .undefined;
    };
    defer globWalker.deinit(true);

    switch (globWalker.walk() catch {
        globalThis.throwOutOfMemory();
        return .undefined;
    }) {
        .err => |err| {
            globalThis.throwValue(err.toJSC(globalThis));
            return JSValue.undefined;
        },
        .result => {},
    }

    const matchedPaths = globWalkResultToJS(globWalker, globalThis);

    return matchedPaths;
}

pub fn match(this: *Glob, globalThis: *JSGlobalObject, callframe: *JSC.CallFrame) JSC.JSValue {
    const arguments_ = callframe.arguments(1);
    var arguments = JSC.Node.ArgumentsSlice.init(globalThis.bunVM(), arguments_.slice());
    defer arguments.deinit();
    const str_arg = arguments.nextEat() orelse {
        globalThis.throw("Glob.matchString: expected 1 arguments, got 0", .{});
        return .undefined;
    };

    if (!str_arg.isString()) {
        globalThis.throw("Glob.matchString: first argument is not a string", .{});
        return .undefined;
    }

    const path_str = String.fromJSRef(str_arg, globalThis);
    defer path_str.deref();

    if (path_str.isUTF16()) {
        if (this.pattern.isUTF16()) {
            return if (globImpl.match(.utf16, this.pattern.utf16(), .utf16, path_str.utf16()).matches()) .true else .false;
        }
        return if (globImpl.match(.latin1, this.pattern.latin1(), .utf16, path_str.utf16()).matches()) .true else .false;
    }

    if (this.pattern.isUTF16()) {
        return if (globImpl.match(.utf16, this.pattern.utf16(), .latin1, path_str.latin1()).matches()) .true else .false;
    }
    return if (globImpl.match(.latin1, this.pattern.latin1(), .latin1, path_str.latin1()).matches()) .true else .false;
}
