#include "root.h"

#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/JSObjectInlines.h>
#include "JavaScriptCore/JSCast.h"
#include <JavaScriptCore/JSPromise.h>
#include <JavaScriptCore/JSArray.h>

#include <JavaScriptCore/WriteBarrier.h>
#include "BunStreamInlines.h"
#include "BunTeeState.h"
#include "JSAbortSignal.h"

#include <JavaScriptCore/Completion.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/Completion.h>
#include "BunReadableStreamPipeToOperation.h"

#include "BunReadableStreamDefaultReader.h"
#include "BunReadableStreamBYOBReader.h"
#include "BunWritableStream.h"
#include "BunWritableStreamDefaultWriter.h"
#include "BunReadableStream.h"
#include "BunReadableStreamDefaultController.h"

#include "BunPromiseInlines.h"

namespace Bun {

using namespace JSC;

JSC::GCClient::IsoSubspace* JSReadableStream::subspaceForImpl(JSC::VM& vm)
{
    return WebCore::subspaceForImpl<JSReadableStream, WebCore::UseCustomHeapCellType::No>(
        vm,
        [](auto& spaces) { return spaces.m_clientSubspaceForReadableStream.get(); },
        [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForReadableStream = std::forward<decltype(space)>(space); },
        [](auto& spaces) { return spaces.m_subspaceForReadableStream.get(); },
        [](auto& spaces, auto&& space) { spaces.m_subspaceForReadableStream = std::forward<decltype(space)>(space); });
}

JSReadableStreamDefaultReader* JSReadableStream::reader() const
{
    return jsCast<JSReadableStreamDefaultReader*>(m_reader.get());
}

JSReadableStreamDefaultController* JSReadableStream::controller() const
{
    return jsCast<JSReadableStreamDefaultController*>(m_controller.get());
}

JSValue JSReadableStream::getReader(VM& vm, JSGlobalObject* globalObject, JSValue options)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    if (locked()) {
        throwTypeError(globalObject, scope, "ReadableStream is locked"_s);
        return {};
    }

    auto* domGlobalObject = defaultGlobalObject(globalObject);
    auto& streams = domGlobalObject->streams();

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

            Structure* readerStructure = streams.structure<JSReadableStreamBYOBReader>(domGlobalObject);
            auto* reader = JSReadableStreamBYOBReader::create(vm, globalObject, readerStructure, this);
            m_reader.set(vm, this, reader);
            return reader;
        }
    }

    Structure* readerStructure = streams.structure<JSReadableStreamDefaultReader>(domGlobalObject);
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
        return Bun::createFulfilledPromise(globalObject, jsUndefined());

    if (m_state == State::Errored) {
        return JSPromise::rejectedPromise(globalObject, storedError());
    }

    m_disturbed = true;

    if (!m_controller)
        return Bun::createFulfilledPromise(globalObject, jsUndefined());

    auto* controller = this->controller();
    JSObject* cancelAlgorithm = controller->cancelAlgorithm();
    m_controller.clear();

    JSC::CallData callData = JSC::getCallData(cancelAlgorithm);

    if (callData.type == JSC::CallData::Type::None)
        return Bun::createFulfilledPromise(globalObject, jsUndefined());

    MarkedArgumentBuffer args;
    args.append(reason);
    JSValue result = JSC::profiledCall(globalObject, ProfilingReason::API, cancelAlgorithm, callData, controller->underlyingSource(), args);

    RETURN_IF_EXCEPTION(scope, nullptr);

    if (auto* promise = jsDynamicCast<JSPromise*>(result))
        return promise;

    return Bun::createFulfilledPromise(globalObject, result);
}

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

    bool preventClose [[maybe_unused]] = false;
    bool preventAbort [[maybe_unused]] = false;
    bool preventCancel [[maybe_unused]] = false;
    JSObject* signal [[maybe_unused]] = nullptr;

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

    auto* domGlobalObject = defaultGlobalObject(globalObject);
    auto& streams = domGlobalObject->streams();
    auto* reader = JSReadableStreamDefaultReader::create(vm, globalObject, streams.structure<JSReadableStreamDefaultReader>(domGlobalObject), this);
    m_reader.set(vm, this, reader);

    auto* writer [[maybe_unused]] = JSWritableStreamDefaultWriter::create(vm, streams.structure<JSWritableStreamDefaultWriter>(domGlobalObject), writableStream);
    JSPromise* promise = JSPromise::create(vm, globalObject->promiseStructure());

    // auto* pipeToOperation = PipeToOperation::create(vm, globalObject, reader, writer, preventClose, preventAbort, preventCancel, signal, promise);
    // pipeToOperation->perform(vm, globalObject);
    // promise->reject(globalObject, )

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

    auto* domGlobalObject = defaultGlobalObject(globalObject);
    auto& streams = domGlobalObject->streams();

    if (m_state == State::Errored) {
        auto* error = m_storedError.get();
        Structure* streamStructure = streams.structure<JSReadableStream>(domGlobalObject);
        auto* stream1 = JSReadableStream::create(vm, globalObject, streamStructure);
        auto* stream2 = JSReadableStream::create(vm, globalObject, streamStructure);
        stream1->error(globalObject, error);
        stream2->error(globalObject, error);
        firstStream = stream1;
        secondStream = stream2;
        return;
    }

    m_disturbed = true;

    auto* reader = JSReadableStreamDefaultReader::create(vm, globalObject, streams.structure<JSReadableStreamDefaultReader>(domGlobalObject), this);
    m_reader.set(vm, this, reader);

    Structure* streamStructure = streams.structure<JSReadableStream>(domGlobalObject);
    auto* branch1 = JSReadableStream::create(vm, globalObject, streamStructure);
    auto* branch2 = JSReadableStream::create(vm, globalObject, streamStructure);

    firstStream = branch1;
    secondStream = branch2;

    TeeState* teeState = TeeState::create(vm, globalObject, reader, branch1, branch2);
    teeState->perform(vm, globalObject);
}

const ClassInfo JSReadableStream::s_info = { "ReadableStream"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSReadableStream) };

template<typename Visitor>
void JSReadableStream::visitChildrenImpl(JSCell* cell, Visitor& visitor)
{
    auto* thisObject = jsCast<JSReadableStream*>(cell);
    ASSERT_GC_OBJECT_INHERITS(thisObject, info());
    Base::visitChildren(thisObject, visitor);

    visitor.append(thisObject->m_reader);
    visitor.append(thisObject->m_controller);
    visitor.append(thisObject->m_storedError);
}

DEFINE_VISIT_CHILDREN(JSReadableStream);

bool JSReadableStream::isLocked() const
{
    return locked();
}

JSReadableStream* JSReadableStream::create(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::Structure* structure)
{
    JSReadableStream* stream = new (NotNull, allocateCell<JSReadableStream>(vm)) JSReadableStream(vm, structure);
    stream->finishCreation(vm);
    return stream;
}

JSReadableStream::JSReadableStream(VM& vm, Structure* structure)
    : Base(vm, structure)
{
}

void JSReadableStream::finishCreation(VM& vm)
{
    Base::finishCreation(vm);
    m_state = State::Readable;
    m_disturbed = false;
}

void JSReadableStream::setController(JSC::VM& vm, JSReadableStreamDefaultController* controller)
{
    m_controller.set(vm, this, controller);
}

Structure* JSReadableStream::createStructure(VM& vm, JSGlobalObject* globalObject, JSValue prototype)
{
    return Structure::create(vm, globalObject, prototype, TypeInfo(ObjectType, StructureFlags), info());
}

void JSReadableStream::close(JSGlobalObject* globalObject)
{
    m_state = State::Closed;
    if (auto* reader = this->reader())
        reader->closedPromise()->resolve(globalObject, jsUndefined());
}

void JSReadableStream::error(JSGlobalObject* globalObject, JSValue error)
{
    VM& vm = globalObject->vm();
    m_state = State::Errored;
    m_storedError.set(vm, this, error.toObject(globalObject));
    if (auto* reader = this->reader())
        reader->closedPromise()->reject(globalObject, error);
}

void JSReadableStream::setReader(JSC::VM& vm, JSReadableStreamDefaultReader* reader)
{
    if (reader) {
        m_reader.set(vm, this, reader);
    } else {
        m_reader.clear();
    }
}

}
