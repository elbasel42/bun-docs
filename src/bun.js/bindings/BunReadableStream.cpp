#include "root.h"

#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/JSObjectInlines.h>
#include "JavaScriptCore/JSCast.h"
#include <JavaScriptCore/JSPromise.h>
#include <JavaScriptCore/JSArray.h>
#include "BunReadableStream.h"
#include <JavaScriptCore/WriteBarrier.h>
#include "BunStreamInlines.h"
#include "BunTeeState.h"
#include "JSAbortSignal.h"
#include "BunReadableStreamDefaultController.h"
#include <JavaScriptCore/Completion.h>
#include "BunReadableStreamDefaultReader.h"
#include "BunReadableStreamBYOBReader.h"
#include "BunWritableStream.h"
#include "BunWritableStreamDefaultWriter.h"
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/Completion.h>

namespace Bun {

using namespace JSC;

JSC::GCClient::IsoSubspace* JSReadableStream::subspaceForImpl(JSC::VM& vm)
{
    return WebCore::subspaceForImpl<JSReadableStream, WebCore::UseCustomHeapCellType::No>(
        vm,
        [](auto& spaces) { return spaces.m_clientSubspaceForJSReadableStream.get(); },
        [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForJSReadableStream = std::forward<decltype(space)>(space); },
        [](auto& spaces) { return spaces.m_subspaceForJSReadableStream.get(); },
        [](auto& spaces, auto&& space) { spaces.m_subspaceForJSReadableStream = std::forward<decltype(space)>(space); });
}

JSValue JSReadableStream::getReader(VM& vm, JSGlobalObject* globalObject, JSValue options)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    if (locked()) {
        throwTypeError(globalObject, scope, "ReadableStream is locked"_s);
        return {};
    }

    if (!options.isUndefined()) {
        JSObject* optionsObject = options.toObject(globalObject);
        RETURN_IF_EXCEPTION(scope, {});

        JSValue mode = optionsObject->get(globalObject, Identifier::fromString(vm, "mode"_s));
        RETURN_IF_EXCEPTION(scope, {});

        if (mode.getString(globalObject) == "byob"_s) {
            auto* controller = jsCast<JSReadableStreamDefaultController*>(m_controller.get());
            if (!controller || !controller->isByteController()) {
                throwTypeError(globalObject, scope, "Cannot get a BYOB reader for a non-byte stream"_s);
                return {};
            }

            auto* zigGlobalObject = jsCast<Zig::GlobalObject*>(globalObject);
            Structure* readerStructure = zigGlobalObject->readableStreamBYOBReaderStructure();
            auto* reader = JSReadableStreamBYOBReader::create(vm, globalObject, readerStructure, this);
            m_reader.set(vm, this, reader);
            return reader;
        }
    }

    auto* zigGlobalObject = jsCast<Zig::GlobalObject*>(globalObject);
    Structure* readerStructure = zigGlobalObject->readableStreamDefaultReaderStructure();
    auto* reader = JSReadableStreamDefaultReader::create(vm, globalObject, readerStructure, this);
    m_reader.set(vm, this, reader);
    return reader;
}

JSPromise* JSReadableStream::cancel(VM& vm, JSGlobalObject* globalObject, JSValue reason)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    if (locked()) {
        throwTypeError(globalObject, scope, "ReadableStream is locked"_s);
        return nullptr;
    }

    if (m_state == State::Closed)
        return JSPromise::resolvedPromise(globalObject, jsUndefined());

    if (m_state == State::Errored) {
        return JSPromise::rejectedPromise(globalObject, storedError());
    }

    m_disturbed = true;

    if (!m_controller)
        return JSPromise::resolvedPromise(globalObject, jsUndefined());

    auto* controller = jsCast<JSReadableStreamDefaultController*>(m_controller.get());
    JSObject* cancelAlgorithm = controller->cancelAlgorithm();
    m_controller.clear();

    JSC::JSObject* function = jsCast<JSC::JSObject*>(cancelAlgorithm);
    JSC::CallData callData = JSC::getCallData(function);

    if (callData.type == JSC::CallData::Type::None)
        return JSPromise::resolvedPromise(globalObject, jsUndefined());

    MarkedArgumentBuffer args;
    args.append(reason);
    JSValue result = JSC::profiledCall(globalObject, ProfilingReason::API, function, callData, jsUndefined(), args);

    RETURN_IF_EXCEPTION(scope, nullptr);

    if (auto* promise = jsDynamicCast<JSPromise*>(result))
        return promise;

    return JSPromise::resolvedPromise(globalObject, result);
}

class PipeToOperation {
public:
    static PipeToOperation* create(JSC::VM& vm, JSC::JSGlobalObject* globalObject,
        JSReadableStreamDefaultReader* reader, JSWritableStreamDefaultWriter* writer,
        bool preventClose, bool preventAbort, bool preventCancel, JSC::JSObject* signal, JSC::JSPromise* promise)
    {
        // Implementation needed
        return nullptr;
    }

    void perform()
    {
        // Implementation needed
    }
};

JSPromise* JSReadableStream::pipeTo(VM& vm, JSGlobalObject* globalObject, JSObject* destination, JSValue options)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    if (!destination) {
        throwTypeError(globalObject, scope, "Destination must be a WritableStream"_s);
        return nullptr;
    }

    JSWritableStream* writableStream = jsDynamicCast<JSWritableStream*>(destination);
    if (!writableStream) {
        throwTypeError(globalObject, scope, "Destination must be a WritableStream"_s);
        return nullptr;
    }

    if (locked() || writableStream->isLocked()) {
        throwTypeError(globalObject, scope, "Cannot pipe to/from a locked stream"_s);
        return nullptr;
    }

    bool preventClose = false;
    bool preventAbort = false;
    bool preventCancel = false;
    JSObject* signal = nullptr;

    if (!options.isUndefined()) {
        JSObject* optionsObject = options.toObject(globalObject);
        RETURN_IF_EXCEPTION(scope, nullptr);

        JSValue preventCloseValue = optionsObject->get(globalObject, Identifier::fromString(vm, "preventClose"_s));
        RETURN_IF_EXCEPTION(scope, nullptr);
        preventClose = preventCloseValue.toBoolean(globalObject);
        RETURN_IF_EXCEPTION(scope, nullptr);

        JSValue preventAbortValue = optionsObject->get(globalObject, Identifier::fromString(vm, "preventAbort"_s));
        RETURN_IF_EXCEPTION(scope, nullptr);
        preventAbort = preventAbortValue.toBoolean(globalObject);
        RETURN_IF_EXCEPTION(scope, nullptr);

        JSValue preventCancelValue = optionsObject->get(globalObject, Identifier::fromString(vm, "preventCancel"_s));
        RETURN_IF_EXCEPTION(scope, nullptr);
        preventCancel = preventCancelValue.toBoolean(globalObject);
        RETURN_IF_EXCEPTION(scope, nullptr);

        JSValue signalValue = optionsObject->get(globalObject, Identifier::fromString(vm, "signal"_s));
        RETURN_IF_EXCEPTION(scope, nullptr);
        if (!signalValue.isUndefined()) {
            signal = signalValue.toObject(globalObject);
            if (!signal) {
                throwTypeError(globalObject, scope, "Signal must be an object"_s);
                return nullptr;
            }
        }
    }

    m_disturbed = true;

    auto* zigGlobalObject = jsCast<Zig::GlobalObject*>(globalObject);
    auto* reader = JSReadableStreamDefaultReader::create(vm, globalObject, zigGlobalObject->readableStreamDefaultReaderStructure(), this);
    m_reader.set(vm, this, reader);

    Structure* writerStructure = zigGlobalObject->writableStreamDefaultWriterStructure();
    auto* writer = JSWritableStreamDefaultWriter::create(vm, writerStructure, writableStream);
    JSPromise* promise = JSPromise::create(vm, globalObject->promiseStructure());

    auto* pipeToOperation = PipeToOperation::create(vm, globalObject, reader, writer, preventClose, preventAbort, preventCancel, signal, promise);
    pipeToOperation->perform();

    return promise;
}

JSValue JSReadableStream::pipeThrough(VM& vm, JSGlobalObject* globalObject, JSObject* transform, JSValue options)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    if (!transform) {
        throwTypeError(globalObject, scope, "Transform must be an object"_s);
        return {};
    }

    JSValue readableValue = transform->get(globalObject, Identifier::fromString(vm, "readable"_s));
    RETURN_IF_EXCEPTION(scope, {});

    JSValue writableValue = transform->get(globalObject, Identifier::fromString(vm, "writable"_s));
    RETURN_IF_EXCEPTION(scope, {});

    JSReadableStream* readable = jsDynamicCast<JSReadableStream*>(readableValue);
    if (UNLIKELY(!readable)) {
        throwTypeError(globalObject, scope, "Transform must have readable property that is a stream"_s);
        return {};
    }

    JSWritableStream* writable = jsDynamicCast<JSWritableStream*>(writableValue);
    if (UNLIKELY(!writable)) {
        throwTypeError(globalObject, scope, "Transform must have writable property that is a stream"_s);
        return {};
    }

    JSPromise* pipePromise = pipeTo(vm, globalObject, jsCast<JSWritableStream*>(writable), options);
    RETURN_IF_EXCEPTION(scope, {});

    // We don't want to expose the pipeTo promise to user code
    pipePromise->markAsHandled(globalObject);

    return readable;
}

void JSReadableStream::tee(VM& vm, JSGlobalObject* globalObject, JSValue& firstStream, JSValue& secondStream)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    if (locked()) {
        throwTypeError(globalObject, scope, "ReadableStream is locked"_s);
        return;
    }

    if (m_state == State::Errored) {
        auto* error = m_storedError.get();
        auto* zigGlobalObject = jsCast<Zig::GlobalObject*>(globalObject);
        Structure* streamStructure = zigGlobalObject->readableStreamStructure();
        auto* stream1 = JSReadableStream::create(vm, globalObject, streamStructure);
        auto* stream2 = JSReadableStream::create(vm, globalObject, streamStructure);
        stream1->error(error);
        stream2->error(error);
        firstStream = stream1;
        secondStream = stream2;
        return;
    }

    m_disturbed = true;

    auto* zigGlobalObject = jsCast<Zig::GlobalObject*>(globalObject);
    auto* reader = JSReadableStreamDefaultReader::create(vm, globalObject, zigGlobalObject->readableStreamDefaultReaderStructure(), this);
    m_reader.set(vm, this, reader);

    Structure* streamStructure = zigGlobalObject->readableStreamStructure();
    auto* branch1 = JSReadableStream::create(vm, globalObject, streamStructure);
    auto* branch2 = JSReadableStream::create(vm, globalObject, streamStructure);

    firstStream = branch1;
    secondStream = branch2;

    TeeState* teeState = TeeState::create(vm, globalObject, reader, branch1, branch2);
    teeState->perform(vm, globalObject);
}

const ClassInfo JSReadableStream::s_info = { "ReadableStream"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSReadableStream) };
}
