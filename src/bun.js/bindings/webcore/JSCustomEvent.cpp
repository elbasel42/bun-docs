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
#include "JSCustomEvent.h"

#include "ActiveDOMObject.h"
#include "ExtendedDOMClientIsoSubspaces.h"
#include "ExtendedDOMIsoSubspaces.h"
#include "IDLTypes.h"
#include "JSDOMAttribute.h"
#include "JSDOMBinding.h"
#include "JSDOMConstructor.h"
#include "JSDOMConvertAny.h"
#include "JSDOMConvertBase.h"
#include "JSDOMConvertBoolean.h"
#include "JSDOMConvertInterface.h"
#include "JSDOMConvertStrings.h"
#include "JSDOMExceptionHandling.h"
#include "JSDOMGlobalObjectInlines.h"
#include "JSDOMOperation.h"
#include "JSDOMWrapperCache.h"
#include "ScriptExecutionContext.h"
#include "WebCoreJSClientData.h"
#include <JavaScriptCore/HeapAnalyzer.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSDestructibleObjectHeapCellType.h>
#include <JavaScriptCore/SlotVisitorMacros.h>
#include <JavaScriptCore/SubspaceInlines.h>
#include <wtf/GetPtr.h>
#include <wtf/PointerPreparations.h>
#include <wtf/URL.h>
#include "../ErrorCode.h"

namespace WebCore {
using namespace JSC;

template<> CustomEvent::Init convertDictionary<CustomEvent::Init>(JSGlobalObject& lexicalGlobalObject, JSValue value)
{
    auto& vm = JSC::getVM(&lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    bool isNullOrUndefined = value.isUndefinedOrNull();
    auto* object = isNullOrUndefined ? nullptr : value.getObject();
    if (UNLIKELY(!isNullOrUndefined && !object)) {
        Bun::throwError(&lexicalGlobalObject, throwScope, Bun::ErrorCode::ERR_INVALID_ARG_TYPE,
            "The \"options\" argument must be of type object."_s);
        return {};
    }
    CustomEvent::Init result;
    JSValue bubblesValue;
    if (isNullOrUndefined)
        bubblesValue = jsUndefined();
    else {
        bubblesValue = object->get(&lexicalGlobalObject, Identifier::fromString(vm, "bubbles"_s));
        RETURN_IF_EXCEPTION(throwScope, {});
    }
    if (!bubblesValue.isUndefined()) {
        result.bubbles = convert<IDLBoolean>(lexicalGlobalObject, bubblesValue);
        RETURN_IF_EXCEPTION(throwScope, {});
    } else
        result.bubbles = false;
    JSValue cancelableValue;
    if (isNullOrUndefined)
        cancelableValue = jsUndefined();
    else {
        cancelableValue = object->get(&lexicalGlobalObject, Identifier::fromString(vm, "cancelable"_s));
        RETURN_IF_EXCEPTION(throwScope, {});
    }
    if (!cancelableValue.isUndefined()) {
        result.cancelable = convert<IDLBoolean>(lexicalGlobalObject, cancelableValue);
        RETURN_IF_EXCEPTION(throwScope, {});
    } else
        result.cancelable = false;
    JSValue composedValue;
    if (isNullOrUndefined)
        composedValue = jsUndefined();
    else {
        composedValue = object->get(&lexicalGlobalObject, Identifier::fromString(vm, "composed"_s));
        RETURN_IF_EXCEPTION(throwScope, {});
    }
    if (!composedValue.isUndefined()) {
        result.composed = convert<IDLBoolean>(lexicalGlobalObject, composedValue);
        RETURN_IF_EXCEPTION(throwScope, {});
    } else
        result.composed = false;
    JSValue detailValue;
    if (isNullOrUndefined)
        detailValue = jsUndefined();
    else {
        detailValue = object->get(&lexicalGlobalObject, Identifier::fromString(vm, "detail"_s));
        RETURN_IF_EXCEPTION(throwScope, {});
    }
    if (!detailValue.isUndefined()) {
        result.detail = convert<IDLAny>(lexicalGlobalObject, detailValue);
        RETURN_IF_EXCEPTION(throwScope, {});
    } else
        result.detail = jsNull();
    return result;
}

// Functions

static JSC_DECLARE_HOST_FUNCTION(jsCustomEventPrototypeFunction_initCustomEvent);

// Attributes

static JSC_DECLARE_CUSTOM_GETTER(jsCustomEventConstructor);
static JSC_DECLARE_CUSTOM_GETTER(jsCustomEvent_detail);

class JSCustomEventPrototype final : public JSC::JSNonFinalObject {
public:
    using Base = JSC::JSNonFinalObject;
    static JSCustomEventPrototype* create(JSC::VM& vm, JSDOMGlobalObject* globalObject, JSC::Structure* structure)
    {
        JSCustomEventPrototype* ptr = new (NotNull, JSC::allocateCell<JSCustomEventPrototype>(vm)) JSCustomEventPrototype(vm, globalObject, structure);
        ptr->finishCreation(vm);
        return ptr;
    }

    DECLARE_INFO;
    template<typename CellType, JSC::SubspaceAccess>
    static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        STATIC_ASSERT_ISO_SUBSPACE_SHARABLE(JSCustomEventPrototype, Base);
        return &vm.plainObjectSpace();
    }
    static JSC::Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
    {
        return JSC::Structure::create(vm, globalObject, prototype, JSC::TypeInfo(JSC::ObjectType, StructureFlags), info());
    }

private:
    JSCustomEventPrototype(JSC::VM& vm, JSC::JSGlobalObject*, JSC::Structure* structure)
        : JSC::JSNonFinalObject(vm, structure)
    {
    }

    void finishCreation(JSC::VM&);
};
STATIC_ASSERT_ISO_SUBSPACE_SHARABLE(JSCustomEventPrototype, JSCustomEventPrototype::Base);

using JSCustomEventDOMConstructor = JSDOMConstructor<JSCustomEvent>;

template<> JSC::EncodedJSValue JSC_HOST_CALL_ATTRIBUTES JSCustomEventDOMConstructor::construct(JSGlobalObject* lexicalGlobalObject, CallFrame* callFrame)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    auto* castedThis = jsCast<JSCustomEventDOMConstructor*>(callFrame->jsCallee());
    ASSERT(castedThis);
    if (UNLIKELY(callFrame->argumentCount() < 1))
        return throwVMError(lexicalGlobalObject, throwScope, createNotEnoughArgumentsError(lexicalGlobalObject));
    EnsureStillAliveScope argument0 = callFrame->uncheckedArgument(0);
    auto type = convert<IDLAtomStringAdaptor<IDLDOMString>>(*lexicalGlobalObject, argument0.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    EnsureStillAliveScope argument1 = callFrame->argument(1);
    auto eventInitDict = convert<IDLDictionary<CustomEvent::Init>>(*lexicalGlobalObject, argument1.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    auto object = CustomEvent::create(type, WTFMove(eventInitDict));
    if constexpr (IsExceptionOr<decltype(object)>)
        RETURN_IF_EXCEPTION(throwScope, {});
    static_assert(TypeOrExceptionOrUnderlyingType<decltype(object)>::isRef);
    auto jsValue = toJSNewlyCreated<IDLInterface<CustomEvent>>(*lexicalGlobalObject, *castedThis->globalObject(), throwScope, WTFMove(object));
    if constexpr (IsExceptionOr<decltype(object)>)
        RETURN_IF_EXCEPTION(throwScope, {});
    setSubclassStructureIfNeeded<CustomEvent>(lexicalGlobalObject, callFrame, asObject(jsValue));
    RETURN_IF_EXCEPTION(throwScope, {});
    return JSValue::encode(jsValue);
}
JSC_ANNOTATE_HOST_FUNCTION(JSCustomEventDOMConstructorConstruct, JSCustomEventDOMConstructor::construct);

template<> const ClassInfo JSCustomEventDOMConstructor::s_info = { "CustomEvent"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSCustomEventDOMConstructor) };

template<> JSValue JSCustomEventDOMConstructor::prototypeForStructure(JSC::VM& vm, const JSDOMGlobalObject& globalObject)
{
    return JSEvent::getConstructor(vm, &globalObject);
}

template<> void JSCustomEventDOMConstructor::initializeProperties(VM& vm, JSDOMGlobalObject& globalObject)
{
    putDirect(vm, vm.propertyNames->length, jsNumber(1), JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontEnum);
    JSString* nameString = jsNontrivialString(vm, "CustomEvent"_s);
    m_originalName.set(vm, this, nameString);
    putDirect(vm, vm.propertyNames->name, nameString, JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontEnum);
    putDirect(vm, vm.propertyNames->prototype, JSCustomEvent::prototype(vm, globalObject), JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontEnum | JSC::PropertyAttribute::DontDelete);
}

/* Hash table for prototype */

static const HashTableValue JSCustomEventPrototypeTableValues[] = {
    { "constructor"_s, static_cast<unsigned>(JSC::PropertyAttribute::DontEnum), NoIntrinsic, { HashTableValue::GetterSetterType, jsCustomEventConstructor, 0 } },
    { "detail"_s, static_cast<unsigned>(JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::CustomAccessor | JSC::PropertyAttribute::DOMAttribute), NoIntrinsic, { HashTableValue::GetterSetterType, jsCustomEvent_detail, 0 } },
    { "initCustomEvent"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsCustomEventPrototypeFunction_initCustomEvent, 1 } },
};

const ClassInfo JSCustomEventPrototype::s_info = { "CustomEvent"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSCustomEventPrototype) };

void JSCustomEventPrototype::finishCreation(VM& vm)
{
    Base::finishCreation(vm);
    reifyStaticProperties(vm, JSCustomEvent::info(), JSCustomEventPrototypeTableValues, *this);
    JSC_TO_STRING_TAG_WITHOUT_TRANSITION();
}

const ClassInfo JSCustomEvent::s_info = { "CustomEvent"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSCustomEvent) };

JSCustomEvent::JSCustomEvent(Structure* structure, JSDOMGlobalObject& globalObject, Ref<CustomEvent>&& impl)
    : JSEvent(structure, globalObject, WTFMove(impl))
{
}

void JSCustomEvent::finishCreation(VM& vm)
{
    Base::finishCreation(vm);
    ASSERT(inherits(info()));

    // static_assert(!std::is_base_of<ActiveDOMObject, CustomEvent>::value, "Interface is not marked as [ActiveDOMObject] even though implementation class subclasses ActiveDOMObject.");
}

JSObject* JSCustomEvent::createPrototype(VM& vm, JSDOMGlobalObject& globalObject)
{
    return JSCustomEventPrototype::create(vm, &globalObject, JSCustomEventPrototype::createStructure(vm, &globalObject, JSEvent::prototype(vm, globalObject)));
}

JSObject* JSCustomEvent::prototype(VM& vm, JSDOMGlobalObject& globalObject)
{
    return getDOMPrototype<JSCustomEvent>(vm, globalObject);
}

JSValue JSCustomEvent::getConstructor(VM& vm, const JSGlobalObject* globalObject)
{
    return getDOMConstructor<JSCustomEventDOMConstructor, DOMConstructorID::CustomEvent>(vm, *jsCast<const JSDOMGlobalObject*>(globalObject));
}

JSC_DEFINE_CUSTOM_GETTER(jsCustomEventConstructor, (JSGlobalObject * lexicalGlobalObject, JSC::EncodedJSValue thisValue, PropertyName))
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    auto* prototype = jsDynamicCast<JSCustomEventPrototype*>(JSValue::decode(thisValue));
    if (UNLIKELY(!prototype))
        return throwVMTypeError(lexicalGlobalObject, throwScope);
    return JSValue::encode(JSCustomEvent::getConstructor(JSC::getVM(lexicalGlobalObject), prototype->globalObject()));
}

static inline JSValue jsCustomEvent_detailGetter(JSGlobalObject& lexicalGlobalObject, JSCustomEvent& thisObject)
{
    UNUSED_PARAM(lexicalGlobalObject);
    return thisObject.detail(lexicalGlobalObject);
}

JSC_DEFINE_CUSTOM_GETTER(jsCustomEvent_detail, (JSGlobalObject * lexicalGlobalObject, JSC::EncodedJSValue thisValue, PropertyName attributeName))
{
    return IDLAttribute<JSCustomEvent>::get<jsCustomEvent_detailGetter, CastedThisErrorBehavior::Assert>(*lexicalGlobalObject, thisValue, attributeName);
}

static inline JSC::EncodedJSValue jsCustomEventPrototypeFunction_initCustomEventBody(JSC::JSGlobalObject* lexicalGlobalObject, JSC::CallFrame* callFrame, typename IDLOperation<JSCustomEvent>::ClassParameter castedThis)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    UNUSED_PARAM(throwScope);
    UNUSED_PARAM(callFrame);
    auto& impl = castedThis->wrapped();
    if (UNLIKELY(callFrame->argumentCount() < 1))
        return throwVMError(lexicalGlobalObject, throwScope, createNotEnoughArgumentsError(lexicalGlobalObject));
    EnsureStillAliveScope argument0 = callFrame->uncheckedArgument(0);
    auto type = convert<IDLAtomStringAdaptor<IDLDOMString>>(*lexicalGlobalObject, argument0.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    EnsureStillAliveScope argument1 = callFrame->argument(1);
    auto bubbles = convert<IDLBoolean>(*lexicalGlobalObject, argument1.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    EnsureStillAliveScope argument2 = callFrame->argument(2);
    auto cancelable = convert<IDLBoolean>(*lexicalGlobalObject, argument2.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    EnsureStillAliveScope argument3 = callFrame->argument(3);
    auto detail = argument3.value().isUndefined() ? jsNull() : convert<IDLAny>(*lexicalGlobalObject, argument3.value());
    RETURN_IF_EXCEPTION(throwScope, {});
    RELEASE_AND_RETURN(throwScope, JSValue::encode(toJS<IDLUndefined>(*lexicalGlobalObject, throwScope, [&]() -> decltype(auto) { return impl.initCustomEvent(type, WTFMove(bubbles), WTFMove(cancelable), WTFMove(detail)); })));
}

JSC_DEFINE_HOST_FUNCTION(jsCustomEventPrototypeFunction_initCustomEvent, (JSGlobalObject * lexicalGlobalObject, CallFrame* callFrame))
{
    return IDLOperation<JSCustomEvent>::call<jsCustomEventPrototypeFunction_initCustomEventBody>(*lexicalGlobalObject, *callFrame, "initCustomEvent");
}

JSC::GCClient::IsoSubspace* JSCustomEvent::subspaceForImpl(JSC::VM& vm)
{
    return WebCore::subspaceForImpl<JSCustomEvent, UseCustomHeapCellType::No>(
        vm,
        [](auto& spaces) { return spaces.m_clientSubspaceForCustomEvent.get(); },
        [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForCustomEvent = std::forward<decltype(space)>(space); },
        [](auto& spaces) { return spaces.m_subspaceForCustomEvent.get(); },
        [](auto& spaces, auto&& space) { spaces.m_subspaceForCustomEvent = std::forward<decltype(space)>(space); });
}

template<typename Visitor>
void JSCustomEvent::visitChildrenImpl(JSCell* cell, Visitor& visitor)
{
    auto* thisObject = jsCast<JSCustomEvent*>(cell);
    ASSERT_GC_OBJECT_INHERITS(thisObject, info());
    Base::visitChildren(thisObject, visitor);
    thisObject->visitAdditionalChildren(visitor);
}

DEFINE_VISIT_CHILDREN(JSCustomEvent);

template<typename Visitor>
void JSCustomEvent::visitOutputConstraints(JSCell* cell, Visitor& visitor)
{
    auto* thisObject = jsCast<JSCustomEvent*>(cell);
    ASSERT_GC_OBJECT_INHERITS(thisObject, info());
    Base::visitOutputConstraints(thisObject, visitor);
    thisObject->visitAdditionalChildren(visitor);
}

template void JSCustomEvent::visitOutputConstraints(JSCell*, AbstractSlotVisitor&);
template void JSCustomEvent::visitOutputConstraints(JSCell*, SlotVisitor&);
void JSCustomEvent::analyzeHeap(JSCell* cell, HeapAnalyzer& analyzer)
{
    auto* thisObject = jsCast<JSCustomEvent*>(cell);
    analyzer.setWrappedObjectForCell(cell, &thisObject->wrapped());
    if (thisObject->scriptExecutionContext())
        analyzer.setLabelForCell(cell, makeString("url "_s, thisObject->scriptExecutionContext()->url().string()));
    Base::analyzeHeap(cell, analyzer);
}

#if ENABLE(BINDING_INTEGRITY)
#if PLATFORM(WIN)
#pragma warning(disable : 4483)
extern "C" {
extern void (*const __identifier("??_7CustomEvent@WebCore@@6B@")[])();
}
#else
extern "C" {
extern void* _ZTVN7WebCore11CustomEventE[];
}
#endif
#endif

JSC::JSValue toJSNewlyCreated(JSC::JSGlobalObject*, JSDOMGlobalObject* globalObject, Ref<CustomEvent>&& impl)
{

    //     if constexpr (std::is_polymorphic_v<CustomEvent>) {
    // #if ENABLE(BINDING_INTEGRITY)
    //         // const void* actualVTablePointer = getVTablePointer(impl.ptr());
    // #if PLATFORM(WIN)
    //         void* expectedVTablePointer = __identifier("??_7CustomEvent@WebCore@@6B@");
    // #else
    //         // void* expectedVTablePointer = &_ZTVN7WebCore11CustomEventE[2];
    // #endif

    //         // If you hit this assertion you either have a use after free bug, or
    //         // CustomEvent has subclasses. If CustomEvent has subclasses that get passed
    //         // to toJS() we currently require CustomEvent you to opt out of binding hardening
    //         // by adding the SkipVTableValidation attribute to the interface IDL definition
    //         // RELEASE_ASSERT(actualVTablePointer == expectedVTablePointer);
    // #endif
    //     }
    return createWrapper<CustomEvent>(globalObject, WTFMove(impl));
}

JSC::JSValue toJS(JSC::JSGlobalObject* lexicalGlobalObject, JSDOMGlobalObject* globalObject, CustomEvent& impl)
{
    return wrap(lexicalGlobalObject, globalObject, impl);
}

}
