/*
    This file is part of the WebKit open source project.
    This file has been generated by generate-bindings.pl. DO NOT MODIFY!

    This library is free software; you can redistribute it and/or
    modify it under the terms of the GNU Library General Public
    License as published by the Free Software Foundation; either
    version 2 of the License, or (at your option) any later version.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Library General Public License for more details.

    You should have received a copy of the GNU Library General Public License
    along with this library; see the file COPYING.LIB.  If not, write to
    the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
    Boston, MA 02110-1301, USA.
*/

#include "config.h"
#include "JSFetchHeaders.h"

#include "ActiveDOMObject.h"
#include "ExtendedDOMClientIsoSubspaces.h"
#include "ExtendedDOMIsoSubspaces.h"
#include "IDLTypes.h"
#include "JSDOMBinding.h"
#include "JSDOMConstructor.h"
#include "JSDOMConvertBase.h"
#include "JSDOMConvertBoolean.h"
#include "JSDOMConvertInterface.h"
#include "JSDOMConvertNullable.h"
#include "JSDOMConvertRecord.h"
#include "JSDOMConvertSequences.h"
#include "JSDOMConvertStrings.h"
#include "JSDOMConvertUnion.h"
#include "JSDOMExceptionHandling.h"
#include "JSDOMGlobalObjectInlines.h"
#include "JSDOMIterator.h"
#include "JSDOMOperation.h"
#include "JSDOMWrapperCache.h"
#include "JavaScriptCore/JSCJSValue.h"
#include "ScriptExecutionContext.h"
#include "WebCoreJSClientData.h"
#include <JavaScriptCore/BuiltinNames.h>
#include <JavaScriptCore/FunctionPrototype.h>
#include <JavaScriptCore/HeapAnalyzer.h>
#include <JavaScriptCore/JSArray.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSDestructibleObjectHeapCellType.h>
#include <JavaScriptCore/SlotVisitorMacros.h>
#include <JavaScriptCore/SubspaceInlines.h>
#include <variant>
#include <wtf/GetPtr.h>
#include <wtf/PointerPreparations.h>
#include <wtf/URL.h>
#include <wtf/Vector.h>

#include "GCDefferalContext.h"

namespace WebCore {
using namespace JSC;

// Functions

static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_append);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_delete);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_get);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_has);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_set);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_entries);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_keys);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_values);
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_forEach);

// Non-standard functions
static JSC_DECLARE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_toJSON);
static JSC_DECLARE_CUSTOM_GETTER(jsFetchHeadersPrototypeFunction_size);

// Attributes

static JSC_DECLARE_CUSTOM_GETTER(jsFetchHeadersConstructor);

class JSFetchHeadersPrototype final : public JSC::JSNonFinalObject {
public:
    using Base = JSC::JSNonFinalObject;
    static JSFetchHeadersPrototype* create(JSC::VM& vm, JSDOMGlobalObject* globalObject, JSC::Structure* structure)
    {
        JSFetchHeadersPrototype* ptr = new (NotNull, JSC::allocateCell<JSFetchHeadersPrototype>(vm)) JSFetchHeadersPrototype(vm, globalObject, structure);
        ptr->finishCreation(vm);
        return ptr;
    }

    DECLARE_INFO;
    template<typename CellType, JSC::SubspaceAccess>
    static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        STATIC_ASSERT_ISO_SUBSPACE_SHARABLE(JSFetchHeadersPrototype, Base);
        return &vm.plainObjectSpace();
    }
    static JSC::Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
    {
        return JSC::Structure::create(vm, globalObject, prototype, JSC::TypeInfo(JSC::ObjectType, StructureFlags), info());
    }

private:
    JSFetchHeadersPrototype(JSC::VM& vm, JSC::JSGlobalObject*, JSC::Structure* structure)
        : JSC::JSNonFinalObject(vm, structure)
    {
    }

    void finishCreation(JSC::VM&);
};
STATIC_ASSERT_ISO_SUBSPACE_SHARABLE(JSFetchHeadersPrototype, JSFetchHeadersPrototype::Base);

using JSFetchHeadersDOMConstructor = JSDOMConstructor<JSFetchHeaders>;

size_t JSFetchHeaders::estimatedSize(JSC::JSCell* cell, JSC::VM& vm)
{
    auto* thisObject = jsCast<JSFetchHeaders*>(cell);
    auto& wrapped = thisObject->wrapped();
    return Base::estimatedSize(cell, vm) + wrapped.memoryCost();
}

template<> JSC::EncodedJSValue JSC_HOST_CALL_ATTRIBUTES JSFetchHeadersDOMConstructor::construct(JSGlobalObject* lexicalGlobalObject, CallFrame* callFrame)
{
    VM& vm = lexicalGlobalObject->vm();
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    auto* castedThis = jsCast<JSFetchHeadersDOMConstructor*>(callFrame->jsCallee());
    ASSERT(castedThis);
    EnsureStillAliveScope argument0 = callFrame->argument(0);

    auto init = std::optional<Converter<IDLUnion<IDLSequence<IDLSequence<IDLDOMString>>, IDLRecord<IDLDOMString, IDLDOMString>>>::ReturnType>();

    if (argument0.value() && !argument0.value().isUndefined()) {
        if (auto* existingJsFetchHeaders = jsDynamicCast<JSFetchHeaders*>(argument0.value())) {
            auto newHeaders = FetchHeaders::create(existingJsFetchHeaders->wrapped());
            auto jsValue = toJSNewlyCreated<IDLInterface<FetchHeaders>>(*lexicalGlobalObject, *castedThis->globalObject(), throwScope, WTFMove(newHeaders));
            if constexpr (IsExceptionOr<decltype(jsValue)>)
                RETURN_IF_EXCEPTION(throwScope, {});
            setSubclassStructureIfNeeded<FetchHeaders>(lexicalGlobalObject, callFrame, asObject(jsValue));
            RETURN_IF_EXCEPTION(throwScope, {});
            return JSValue::encode(jsValue);
        }
        init = std::optional<Converter<IDLUnion<IDLSequence<IDLSequence<IDLDOMString>>, IDLRecord<IDLDOMString, IDLDOMString>>>::ReturnType>(convert<IDLUnion<IDLSequence<IDLSequence<IDLDOMString>>, IDLRecord<IDLDOMString, IDLDOMString>>>(*lexicalGlobalObject, argument0.value()));
    }

    RETURN_IF_EXCEPTION(throwScope, {});
    auto object = FetchHeaders::create(WTFMove(init));
    if constexpr (IsExceptionOr<decltype(object)>)
        RETURN_IF_EXCEPTION(throwScope, {});
    static_assert(TypeOrExceptionOrUnderlyingType<decltype(object)>::isRef);
    auto jsValue = toJSNewlyCreated<IDLInterface<FetchHeaders>>(*lexicalGlobalObject, *castedThis->globalObject(), throwScope, WTFMove(object));
    if constexpr (IsExceptionOr<decltype(object)>)
        RETURN_IF_EXCEPTION(throwScope, {});
    setSubclassStructureIfNeeded<FetchHeaders>(lexicalGlobalObject, callFrame, asObject(jsValue));
    RETURN_IF_EXCEPTION(throwScope, {});

    if (argument0.value())
        jsCast<JSFetchHeaders*>(jsValue)->computeMemoryCost();

    return JSValue::encode(jsValue);
}
JSC_ANNOTATE_HOST_FUNCTION(JSFetchHeadersDOMConstructorConstruct, JSFetchHeadersDOMConstructor::construct);

template<> const ClassInfo JSFetchHeadersDOMConstructor::s_info = { "Headers"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSFetchHeadersDOMConstructor) };

template<> JSValue JSFetchHeadersDOMConstructor::prototypeForStructure(JSC::VM& vm, const JSDOMGlobalObject& globalObject)
{
    UNUSED_PARAM(vm);
    return globalObject.functionPrototype();
}

template<> void JSFetchHeadersDOMConstructor::initializeProperties(VM& vm, JSDOMGlobalObject& globalObject)
{
    putDirect(vm, vm.propertyNames->length, jsNumber(0), JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontEnum);
    JSString* nameString = jsNontrivialString(vm, "Headers"_s);
    m_originalName.set(vm, this, nameString);
    putDirect(vm, vm.propertyNames->name, nameString, JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontEnum);
    putDirect(vm, vm.propertyNames->prototype, JSFetchHeaders::prototype(vm, globalObject), JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontEnum | JSC::PropertyAttribute::DontDelete);
}

/**
 * Non standard function.
 **/
JSC_DEFINE_CUSTOM_GETTER(jsFetchHeadersGetterCount, (JSC::JSGlobalObject * globalObject, JSC::EncodedJSValue thisValue, JSC::PropertyName))
{
    JSFetchHeaders* castedThis = jsDynamicCast<JSFetchHeaders*>(JSValue::decode(thisValue));
    if (UNLIKELY(!castedThis)) {
        return JSValue::encode(jsUndefined());
    }

    auto& impl = castedThis->wrapped();
    auto count = impl.size();
    return JSValue::encode(jsNumber(count));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_getAll, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    JSFetchHeaders* castedThis = jsDynamicCast<JSFetchHeaders*>(callFrame->thisValue());
    if (UNLIKELY(!castedThis)) {
        return JSValue::encode(jsUndefined());
    }

    if (UNLIKELY(!callFrame->argumentCount())) {
        throwTypeError(lexicalGlobalObject, scope, "Missing argument"_s);
        return {};
    }

    auto name = convert<IDLDOMString>(*lexicalGlobalObject, callFrame->uncheckedArgument(0));
    RETURN_IF_EXCEPTION(scope, {});

    auto& impl = castedThis->wrapped();
    if (name.length() != "set-cookie"_s.length() || name.convertToASCIILowercase() != "set-cookie"_s) {
        throwTypeError(lexicalGlobalObject, scope, "Only \"set-cookie\" is supported."_s);
    }

    auto values = impl.getSetCookieHeaders();
    unsigned count = values.size();
    if (!count) {
        return JSValue::encode(JSC::constructEmptyArray(lexicalGlobalObject, nullptr, 0));
    }

    MarkedArgumentBuffer strings;
    strings.ensureCapacity(count);
    for (unsigned i = 0; i < count; ++i) {
        strings.append(jsString(vm, values[i]));
    }

    JSC::JSArray* array = nullptr;
    GCDeferralContext deferralContext(lexicalGlobalObject->vm());
    JSC::ObjectInitializationScope initializationScope(lexicalGlobalObject->vm());
    if ((array = JSC::JSArray::tryCreateUninitializedRestricted(
             initializationScope, &deferralContext,
             lexicalGlobalObject->arrayStructureForIndexingTypeDuringAllocation(JSC::ArrayWithContiguous),
             count))) {

        for (unsigned i = 0; i < count; ++i) {
            array->initializeIndex(initializationScope, i, strings.at(i));
        }

    } else {
        array = constructEmptyArray(lexicalGlobalObject, nullptr, count);
        RETURN_IF_EXCEPTION(scope, {});
        if (!array) {
            throwOutOfMemoryError(lexicalGlobalObject, scope);
            return {};
        }
        for (unsigned i = 0; i < count; ++i) {
            array->putDirectIndex(lexicalGlobalObject, i, strings.at(i));
            RETURN_IF_EXCEPTION(scope, {});
        }
    }

    RETURN_IF_EXCEPTION(scope, {});
    return JSValue::encode(array);
}

JSC::EncodedJSValue fetchHeadersGetSetCookie(JSC::JSGlobalObject* lexicalGlobalObject, VM& vm, WebCore::FetchHeaders* impl)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    auto values = impl->getSetCookieHeaders();
    unsigned count = values.size();

    if (!count) {
        return JSValue::encode(JSC::constructEmptyArray(lexicalGlobalObject, nullptr, 0));
    }

    JSC::JSArray* array = constructEmptyArray(lexicalGlobalObject, nullptr, count);
    RETURN_IF_EXCEPTION(scope, {});
    if (UNLIKELY(!array)) {
        throwOutOfMemoryError(lexicalGlobalObject, scope);
        return {};
    }

    for (unsigned i = 0; i < count; ++i) {
        array->putDirectIndex(lexicalGlobalObject, i, jsString(vm, values[i]));
        RETURN_IF_EXCEPTION(scope, {});
    }

    return JSValue::encode(array);
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_getSetCookie, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    JSFetchHeaders* castedThis = jsDynamicCast<JSFetchHeaders*>(callFrame->thisValue());
    if (UNLIKELY(!castedThis)) {
        return JSValue::encode(jsUndefined());
    }
    auto& impl = castedThis->wrapped();
    return fetchHeadersGetSetCookie(lexicalGlobalObject, vm, &impl);
}

/* Hash table for prototype */

static const HashTableValue JSFetchHeadersPrototypeTableValues[] = {
    { "constructor"_s, static_cast<unsigned>(JSC::PropertyAttribute::DontEnum), NoIntrinsic, { HashTableValue::GetterSetterType, jsFetchHeadersConstructor, 0 } },
    { "append"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_append, 2 } },
    { "delete"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_delete, 1 } },
    { "get"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_get, 1 } },
    { "getAll"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_getAll, 1 } },
    { "has"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_has, 1 } },
    { "set"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_set, 2 } },
    { "entries"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_entries, 0 } },
    { "keys"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_keys, 0 } },
    { "values"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_values, 0 } },
    { "forEach"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_forEach, 1 } },
    { "toJSON"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_toJSON, 0 } },
    { "count"_s, static_cast<unsigned>(JSC::PropertyAttribute::CustomAccessor | JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontDelete), NoIntrinsic, { HashTableValue::GetterSetterType, jsFetchHeadersGetterCount, 0 } },
    { "getSetCookie"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsFetchHeadersPrototypeFunction_getSetCookie, 0 } },
};

const ClassInfo JSFetchHeadersPrototype::s_info = { "Headers"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSFetchHeadersPrototype) };

void JSFetchHeadersPrototype::finishCreation(VM& vm)
{
    Base::finishCreation(vm);
    reifyStaticProperties(vm, JSFetchHeaders::info(), JSFetchHeadersPrototypeTableValues, *this);
    putDirect(vm, vm.propertyNames->iteratorSymbol, getDirect(vm, vm.propertyNames->builtinNames().entriesPublicName()), static_cast<unsigned>(JSC::PropertyAttribute::DontEnum));
    JSC_TO_STRING_TAG_WITHOUT_TRANSITION();
}

const ClassInfo JSFetchHeaders::s_info = { "Headers"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSFetchHeaders) };

JSFetchHeaders::JSFetchHeaders(Structure* structure, JSDOMGlobalObject& globalObject, Ref<FetchHeaders>&& impl)
    : JSDOMWrapper<FetchHeaders>(structure, globalObject, WTFMove(impl))
{
}

void JSFetchHeaders::finishCreation(VM& vm)
{
    Base::finishCreation(vm);
    ASSERT(inherits(info()));

    // static_assert(!std::is_base_of<ActiveDOMObject, FetchHeaders>::value, "Interface is not marked as [ActiveDOMObject] even though implementation class subclasses ActiveDOMObject.");
}

void JSFetchHeaders::computeMemoryCost()
{
    size_t previousCost = m_memoryCost;
    m_memoryCost = wrapped().memoryCost();
    int64_t diff = static_cast<int64_t>(m_memoryCost) - static_cast<int64_t>(previousCost);
    if (diff > 0) {
        globalObject()->vm().heap.reportExtraMemoryAllocated(this, static_cast<uint64_t>(diff));
    }
}

JSObject* JSFetchHeaders::createPrototype(VM& vm, JSDOMGlobalObject& globalObject)
{
    auto* structure = JSFetchHeadersPrototype::createStructure(vm, &globalObject, globalObject.objectPrototype());
    structure->setMayBePrototype(true);
    return JSFetchHeadersPrototype::create(vm, &globalObject, structure);
}

JSObject* JSFetchHeaders::prototype(VM& vm, JSDOMGlobalObject& globalObject)
{
    return getDOMPrototype<JSFetchHeaders>(vm, globalObject);
}

JSValue JSFetchHeaders::getConstructor(VM& vm, const JSGlobalObject* globalObject)
{
    return getDOMConstructor<JSFetchHeadersDOMConstructor, DOMConstructorID::FetchHeaders>(vm, *jsCast<const JSDOMGlobalObject*>(globalObject));
}

void JSFetchHeaders::destroy(JSC::JSCell* cell)
{
    JSFetchHeaders* thisObject = static_cast<JSFetchHeaders*>(cell);
    thisObject->JSFetchHeaders::~JSFetchHeaders();
}

JSC_DEFINE_CUSTOM_GETTER(jsFetchHeadersConstructor, (JSGlobalObject * lexicalGlobalObject, JSC::EncodedJSValue thisValue, PropertyName))
{
    VM& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    auto* prototype = jsDynamicCast<JSFetchHeadersPrototype*>(JSValue::decode(thisValue));
    if (UNLIKELY(!prototype))
        return throwVMTypeError(lexicalGlobalObject, throwScope);
    return JSValue::encode(JSFetchHeaders::getConstructor(JSC::getVM(lexicalGlobalObject), prototype->globalObject()));
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_appendBody(JSC::JSGlobalObject* lexicalGlobalObject, JSC::CallFrame* callFrame, typename IDLOperation<JSFetchHeaders>::ClassParameter castedThis)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    UNUSED_PARAM(throwScope);
    UNUSED_PARAM(callFrame);
    auto& impl = castedThis->wrapped();
    if (UNLIKELY(callFrame->argumentCount() < 2))
        return throwVMError(lexicalGlobalObject, throwScope, createNotEnoughArgumentsError(lexicalGlobalObject));
    EnsureStillAliveScope argument0 = callFrame->uncheckedArgument(0);
    auto name = convert<IDLDOMString>(*lexicalGlobalObject, argument0.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    EnsureStillAliveScope argument1 = callFrame->uncheckedArgument(1);
    auto value = convert<IDLDOMString>(*lexicalGlobalObject, argument1.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    RELEASE_AND_RETURN(throwScope, JSValue::encode(toJS<IDLUndefined>(*lexicalGlobalObject, throwScope, [&]() -> decltype(auto) { return impl.append(WTFMove(name), WTFMove(value)); })));
}

/**
 * Non standard function.
 **/
static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_toJSONBody(JSC::JSGlobalObject* lexicalGlobalObject, JSC::CallFrame* callFrame, typename IDLOperation<JSFetchHeaders>::ClassParameter castedThis)
{
    return JSValue::encode(WebCore::getInternalProperties(lexicalGlobalObject->vm(), lexicalGlobalObject, castedThis));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_toJSON, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_toJSONBody>(*lexicalGlobalObject, *callFrame, "toJSON");
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_append, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_appendBody>(*lexicalGlobalObject, *callFrame, "append");
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_deleteBody(JSC::JSGlobalObject* lexicalGlobalObject, JSC::CallFrame* callFrame, typename IDLOperation<JSFetchHeaders>::ClassParameter castedThis)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    UNUSED_PARAM(throwScope);
    UNUSED_PARAM(callFrame);
    auto& impl = castedThis->wrapped();
    if (UNLIKELY(callFrame->argumentCount() < 1))
        return throwVMError(lexicalGlobalObject, throwScope, createNotEnoughArgumentsError(lexicalGlobalObject));
    EnsureStillAliveScope argument0 = callFrame->uncheckedArgument(0);
    auto name = convert<IDLDOMString>(*lexicalGlobalObject, argument0.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    RELEASE_AND_RETURN(throwScope, JSValue::encode(toJS<IDLUndefined>(*lexicalGlobalObject, throwScope, [&]() -> decltype(auto) { return impl.remove(WTFMove(name)); })));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_delete, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_deleteBody>(*lexicalGlobalObject, *callFrame, "delete");
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_getBody(JSC::JSGlobalObject* lexicalGlobalObject, JSC::CallFrame* callFrame, typename IDLOperation<JSFetchHeaders>::ClassParameter castedThis)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    UNUSED_PARAM(throwScope);
    UNUSED_PARAM(callFrame);
    auto& impl = castedThis->wrapped();
    if (UNLIKELY(callFrame->argumentCount() < 1))
        return throwVMError(lexicalGlobalObject, throwScope, createNotEnoughArgumentsError(lexicalGlobalObject));
    EnsureStillAliveScope argument0 = callFrame->uncheckedArgument(0);
    auto name = convert<IDLDOMString>(*lexicalGlobalObject, argument0.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    RELEASE_AND_RETURN(throwScope, JSValue::encode(toJS<IDLNullable<IDLDOMString>>(*lexicalGlobalObject, throwScope, impl.get(WTFMove(name)))));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_get, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_getBody>(*lexicalGlobalObject, *callFrame, "get");
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_hasBody(JSC::JSGlobalObject* lexicalGlobalObject, JSC::CallFrame* callFrame, typename IDLOperation<JSFetchHeaders>::ClassParameter castedThis)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    UNUSED_PARAM(throwScope);
    UNUSED_PARAM(callFrame);
    auto& impl = castedThis->wrapped();
    if (UNLIKELY(callFrame->argumentCount() < 1))
        return throwVMError(lexicalGlobalObject, throwScope, createNotEnoughArgumentsError(lexicalGlobalObject));
    EnsureStillAliveScope argument0 = callFrame->uncheckedArgument(0);
    auto name = convert<IDLDOMString>(*lexicalGlobalObject, argument0.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    RELEASE_AND_RETURN(throwScope, JSValue::encode(toJS<IDLBoolean>(*lexicalGlobalObject, throwScope, impl.has(WTFMove(name)))));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_has, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_hasBody>(*lexicalGlobalObject, *callFrame, "has");
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_setBody(JSC::JSGlobalObject* lexicalGlobalObject, JSC::CallFrame* callFrame, typename IDLOperation<JSFetchHeaders>::ClassParameter castedThis)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    UNUSED_PARAM(throwScope);
    UNUSED_PARAM(callFrame);
    auto& impl = castedThis->wrapped();
    if (UNLIKELY(callFrame->argumentCount() < 2))
        return throwVMError(lexicalGlobalObject, throwScope, createNotEnoughArgumentsError(lexicalGlobalObject));
    EnsureStillAliveScope argument0 = callFrame->uncheckedArgument(0);
    auto name = convert<IDLDOMString>(*lexicalGlobalObject, argument0.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    EnsureStillAliveScope argument1 = callFrame->uncheckedArgument(1);
    auto value = convert<IDLDOMString>(*lexicalGlobalObject, argument1.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    RELEASE_AND_RETURN(throwScope, JSValue::encode(toJS<IDLUndefined>(*lexicalGlobalObject, throwScope, [&]() -> decltype(auto) { return impl.set(WTFMove(name), WTFMove(value)); })));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_set, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_setBody>(*lexicalGlobalObject, *callFrame, "set");
}

struct FetchHeadersIteratorTraits {
    static constexpr JSDOMIteratorType type = JSDOMIteratorType::Map;
    using KeyType = IDLDOMString;
    using ValueType = IDLDOMString;
};

using FetchHeadersIteratorBase = JSDOMIteratorBase<JSFetchHeaders, FetchHeadersIteratorTraits>;
class FetchHeadersIterator final : public FetchHeadersIteratorBase {
public:
    using Base = FetchHeadersIteratorBase;
    DECLARE_INFO;

    template<typename, SubspaceAccess mode> static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        if constexpr (mode == JSC::SubspaceAccess::Concurrently)
            return nullptr;
        return WebCore::subspaceForImpl<FetchHeadersIterator, UseCustomHeapCellType::No>(
            vm,
            [](auto& spaces) { return spaces.m_clientSubspaceForFetchHeadersIterator.get(); },
            [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForFetchHeadersIterator = std::forward<decltype(space)>(space); },
            [](auto& spaces) { return spaces.m_subspaceForFetchHeadersIterator.get(); },
            [](auto& spaces, auto&& space) { spaces.m_subspaceForFetchHeadersIterator = std::forward<decltype(space)>(space); });
    }

    static JSC::Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
    {
        return JSC::Structure::create(vm, globalObject, prototype, JSC::TypeInfo(JSC::ObjectType, StructureFlags), info());
    }

    static FetchHeadersIterator* create(JSC::VM& vm, JSC::Structure* structure, JSFetchHeaders& iteratedObject, IterationKind kind)
    {
        auto* instance = new (NotNull, JSC::allocateCell<FetchHeadersIterator>(vm)) FetchHeadersIterator(structure, iteratedObject, kind);
        instance->finishCreation(vm);
        return instance;
    }

private:
    FetchHeadersIterator(JSC::Structure* structure, JSFetchHeaders& iteratedObject, IterationKind kind)
        : Base(structure, iteratedObject, kind)
    {
    }
};

using FetchHeadersIteratorPrototype = JSDOMIteratorPrototype<JSFetchHeaders, FetchHeadersIteratorTraits>;
JSC_ANNOTATE_HOST_FUNCTION(FetchHeadersIteratorPrototypeNext, FetchHeadersIteratorPrototype::next);

template<>
const JSC::ClassInfo FetchHeadersIteratorBase::s_info = { "Headers Iterator"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(FetchHeadersIteratorBase) };
const JSC::ClassInfo FetchHeadersIterator::s_info = { "Headers Iterator"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(FetchHeadersIterator) };

template<>
const JSC::ClassInfo FetchHeadersIteratorPrototype::s_info = { "Headers Iterator"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(FetchHeadersIteratorPrototype) };

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_entriesCaller(JSGlobalObject*, CallFrame*, JSFetchHeaders* thisObject)
{
    return JSValue::encode(iteratorCreate<FetchHeadersIterator>(*thisObject, IterationKind::Entries));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_entries, (JSC::JSGlobalObject * lexicalGlobalObject, JSC::CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_entriesCaller>(*lexicalGlobalObject, *callFrame, "entries");
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_keysCaller(JSGlobalObject*, CallFrame*, JSFetchHeaders* thisObject)
{
    return JSValue::encode(iteratorCreate<FetchHeadersIterator>(*thisObject, IterationKind::Keys));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_keys, (JSC::JSGlobalObject * lexicalGlobalObject, JSC::CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_keysCaller>(*lexicalGlobalObject, *callFrame, "keys");
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_valuesCaller(JSGlobalObject*, CallFrame*, JSFetchHeaders* thisObject)
{
    return JSValue::encode(iteratorCreate<FetchHeadersIterator>(*thisObject, IterationKind::Values));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_values, (JSC::JSGlobalObject * lexicalGlobalObject, JSC::CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_valuesCaller>(*lexicalGlobalObject, *callFrame, "values");
}

static inline JSC::EncodedJSValue jsFetchHeadersPrototypeFunction_forEachCaller(JSGlobalObject* lexicalGlobalObject, CallFrame* callFrame, JSFetchHeaders* thisObject)
{
    return JSValue::encode(iteratorForEach<FetchHeadersIterator>(*lexicalGlobalObject, *callFrame, *thisObject));
}

JSC_DEFINE_HOST_FUNCTION(jsFetchHeadersPrototypeFunction_forEach, (JSC::JSGlobalObject * lexicalGlobalObject, JSC::CallFrame* callFrame))
{
    return IDLOperation<JSFetchHeaders>::call<jsFetchHeadersPrototypeFunction_forEachCaller>(*lexicalGlobalObject, *callFrame, "forEach");
}

JSC::GCClient::IsoSubspace* JSFetchHeaders::subspaceForImpl(JSC::VM& vm)
{
    return WebCore::subspaceForImpl<JSFetchHeaders, UseCustomHeapCellType::No>(
        vm,
        [](auto& spaces) { return spaces.m_clientSubspaceForFetchHeaders.get(); },
        [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForFetchHeaders = std::forward<decltype(space)>(space); },
        [](auto& spaces) { return spaces.m_subspaceForFetchHeaders.get(); },
        [](auto& spaces, auto&& space) { spaces.m_subspaceForFetchHeaders = std::forward<decltype(space)>(space); });
}

void JSFetchHeaders::analyzeHeap(JSCell* cell, HeapAnalyzer& analyzer)
{
    auto* thisObject = jsCast<JSFetchHeaders*>(cell);
    analyzer.setWrappedObjectForCell(cell, &thisObject->wrapped());
    if (thisObject->scriptExecutionContext())
        analyzer.setLabelForCell(cell, makeString("url "_s, thisObject->scriptExecutionContext()->url().string()));
    Base::analyzeHeap(cell, analyzer);
}

JSC::JSValue getInternalProperties(JSC::VM& vm, JSGlobalObject* lexicalGlobalObject, JSFetchHeaders* castedThis)
{
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    auto& impl = castedThis->wrapped();
    size_t size = impl.sizeAfterJoiningSetCookieHeader();
    JSObject* obj;
    if (size == 0) {
        obj = constructEmptyObject(lexicalGlobalObject);
        RETURN_IF_EXCEPTION(throwScope, {});
        RELEASE_AND_RETURN(throwScope, obj);
    } else if (size <= JSFinalObject::maxInlineCapacity) {
        obj = constructEmptyObject(lexicalGlobalObject, lexicalGlobalObject->objectPrototype(), size);
    } else {
        obj = constructEmptyObject(lexicalGlobalObject);
    }

    auto& internal = impl.internalHeaders();
    {
        auto& vec = internal.commonHeaders();
        for (const auto& it : vec) {
            const auto& name = it.key;
            const auto& value = it.value;
            obj->putDirect(vm, Identifier::fromString(vm, WTF::httpHeaderNameStringImpl(name)), jsString(vm, value), 0);
        }
    }

    {
        auto& values = internal.getSetCookieHeaders();

        size_t count = values.size();

        if (count > 0) {
            JSC::JSArray* array = constructEmptyArray(lexicalGlobalObject, nullptr, count);
            RETURN_IF_EXCEPTION(throwScope, jsUndefined());

            for (size_t i = 0; i < count; ++i) {
                array->putDirectIndex(lexicalGlobalObject, i, jsString(vm, values[i]));
                RETURN_IF_EXCEPTION(throwScope, jsUndefined());
            }

            RETURN_IF_EXCEPTION(throwScope, jsUndefined());
            obj->putDirect(vm, JSC::Identifier::fromString(vm, WTF::httpHeaderNameStringImpl(HTTPHeaderName::SetCookie)), array, 0);
        }
    }

    {
        auto& vec = internal.uncommonHeaders();
        for (const auto& it : vec) {
            const auto& name = it.key;
            const auto& value = it.value;
            obj->putDirect(vm, Identifier::fromString(vm, name.convertToASCIILowercase()), jsString(vm, value), 0);
        }
    }

    RELEASE_AND_RETURN(throwScope, obj);
}

bool JSFetchHeadersOwner::isReachableFromOpaqueRoots(JSC::Handle<JSC::Unknown> handle, void*, AbstractSlotVisitor& visitor, ASCIILiteral* reason)
{
    UNUSED_PARAM(handle);
    UNUSED_PARAM(visitor);
    UNUSED_PARAM(reason);
    return false;
}

template<typename Visitor>
void JSFetchHeaders::visitChildrenImpl(JSCell* cell, Visitor& visitor)
{
    auto* thisObject = jsCast<JSFetchHeaders*>(cell);
    ASSERT_GC_OBJECT_INHERITS(thisObject, info());
    Base::visitChildren(thisObject, visitor);
    visitor.reportExtraMemoryVisited(thisObject->m_memoryCost);
}

DEFINE_VISIT_CHILDREN(JSFetchHeaders);

void JSFetchHeadersOwner::finalize(JSC::Handle<JSC::Unknown> handle, void* context)
{
    auto* jsFetchHeaders = static_cast<JSFetchHeaders*>(handle.slot()->asCell());
    auto& world = *static_cast<DOMWrapperWorld*>(context);
    uncacheWrapper(world, &jsFetchHeaders->wrapped(), jsFetchHeaders);
}

#if ENABLE(BINDING_INTEGRITY)
#if PLATFORM(WIN)
#pragma warning(disable : 4483)
extern "C" {
extern void (*const __identifier("??_7FetchHeaders@WebCore@@6B@")[])();
}
#else
extern "C" {
extern void* _ZTVN7WebCore12FetchHeadersE[];
}
#endif
#endif

JSC::JSValue toJSNewlyCreated(JSC::JSGlobalObject*, JSDOMGlobalObject* globalObject, Ref<FetchHeaders>&& impl)
{
    if constexpr (std::is_polymorphic_v<FetchHeaders>) {
#if ENABLE(BINDING_INTEGRITY)
        // const void* actualVTablePointer = getVTablePointer(impl.ptr());
#if PLATFORM(WIN)
        void* expectedVTablePointer = __identifier("??_7FetchHeaders@WebCore@@6B@");
#else
        // void* expectedVTablePointer = &_ZTVN7WebCore12FetchHeadersE[2];
#endif

        // If you hit this assertion you either have a use after free bug, or
        // FetchHeaders has subclasses. If FetchHeaders has subclasses that get passed
        // to toJS() we currently require FetchHeaders you to opt out of binding hardening
        // by adding the SkipVTableValidation attribute to the interface IDL definition
        // RELEASE_ASSERT(actualVTablePointer == expectedVTablePointer);
#endif
    }
    return createWrapper<FetchHeaders>(globalObject, WTFMove(impl));
}

JSC::JSValue toJS(JSC::JSGlobalObject* lexicalGlobalObject, JSDOMGlobalObject* globalObject, FetchHeaders& impl)
{
    return wrap(lexicalGlobalObject, globalObject, impl);
}

FetchHeaders* JSFetchHeaders::toWrapped(JSC::VM& vm, JSC::JSValue value)
{
    if (auto* wrapper = jsDynamicCast<JSFetchHeaders*>(value))
        return &wrapper->wrapped();
    return nullptr;
}
}
